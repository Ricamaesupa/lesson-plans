-- LMS Phases 2 + 3 — Individual student lesson & session flow
-- (2026-11-21, mermaid-diagram__2.png) and Student portfolio &
-- achievement report detail (2026-11-21, mermaid-diagram__3.png).
-- D1 / SQLite. Do NOT edit 0001_init.sql or 0002_curriculum_details.sql;
-- apply this after them (wrangler applies migrations in filename order).
-- No content is seeded here: every content field stays blank until the
-- teacher fills it in. Seed data from 0001/0002 is unchanged.

-- Cycle length (flowchart: "25 Sessions Completed?"). The diagram says 25,
-- matching the main LMS diagram, but seeded curricula have different totals
-- (Gin 127, Yim 265, Aom 25, Reka 3), so the cycle length is a per-curriculum
-- field, default 25. For the seeded curricula the cycle is the whole
-- curriculum, so it is set to total_sessions here. The teacher can change it
-- in the curriculum editor (PUT /api/curricula/:id).
ALTER TABLE curricula ADD COLUMN cycle_length INTEGER NOT NULL DEFAULT 25;
UPDATE curricula SET cycle_length = total_sessions WHERE total_sessions IS NOT NULL;

-- Lesson plans (flowchart: Select Next Lesson -> Customise Individual
-- Lesson Plan -> Prepare Teaching Materials). A plan customises one library
-- lesson for one student; module_id / lesson_id are NULL when the teacher
-- builds a plan from scratch. status: 'draft' -> 'ready' -> 'in_progress'
-- -> 'completed' (completed plans count as completed projects).
CREATE TABLE IF NOT EXISTS lesson_plans (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  custom_objectives TEXT,
  custom_activities TEXT,
  assessment_plan TEXT,
  materials TEXT,
  session_number INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Teaching sessions (flowchart: Plan Next Session -> Conduct Teaching
-- Session). A session belongs to a student + curriculum and optionally to a
-- lesson plan (NULL when the next session is planned before its lesson is
-- chosen). status: 'planned' -> 'conducted'.
CREATE TABLE IF NOT EXISTS teaching_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  lesson_plan_id TEXT REFERENCES lesson_plans(id) ON DELETE SET NULL,
  session_number INTEGER,
  scheduled_at TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  conducted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Session observations (flowchart: Observe Student Performance ->
-- Evaluate Learning Objectives -> Objectives Achieved? yes / partially /
-- no). One record per session; objectives_achieved is NULL until the
-- teacher evaluates it.
CREATE TABLE IF NOT EXISTS session_observations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES teaching_sessions(id) ON DELETE CASCADE,
  observation TEXT,
  performance_notes TEXT,
  objectives_evaluation TEXT,
  objectives_achieved TEXT CHECK (objectives_achieved IN ('yes', 'partially', 'no')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(session_id)
);

-- End-session reports (flowchart: Record End-Session Report; main diagram:
-- record achievements, record challenges, teacher remarks, homework &
-- next steps). One report per session. This is the teacher's record inside
-- the LMS — it is NOT the public parent-facing End Session Report page.
CREATE TABLE IF NOT EXISTS end_session_reports (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES teaching_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_plan_id TEXT REFERENCES lesson_plans(id) ON DELETE SET NULL,
  achievements TEXT,
  challenges TEXT,
  teacher_remarks TEXT,
  homework_next_steps TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(session_id)
);

-- Follow-up items (flowchart: Objectives Achieved? Partially -> Provide
-- Additional Practice; No -> Create Remedial Activities). kind:
-- 'additional_practice' | 'remedial'. status: 'open' | 'done'.
CREATE TABLE IF NOT EXISTS practice_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES teaching_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('additional_practice', 'remedial')),
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Final assessment (flowchart: 25 Sessions Completed? Yes -> Final
-- Assessment). One per student + curriculum. summary is the teacher's
-- overall summary; learning_outcomes_evaluation and overall_evaluation are
-- the two teacher-entered evaluations from the portfolio flowchart
-- (mermaid-diagram__3.png: Evaluate Learning Outcomes, Teacher's Overall
-- Evaluation).
CREATE TABLE IF NOT EXISTS final_assessments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  summary TEXT,
  learning_outcomes_evaluation TEXT,
  overall_evaluation TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, curriculum_id)
);

-- Achievement reports (flowchart: Generate Achievement Report). content is
-- the readable summary composed from the student's records (session
-- reports, assessment scores, completed projects, skills, initial vs final
-- performance). Generated by the API; one row per generation.
CREATE TABLE IF NOT EXISTS achievement_reports (
  id TEXT PRIMARY KEY,
  final_assessment_id TEXT REFERENCES final_assessments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Digital portfolio entries (flowchart: Create Digital Portfolio -> Attach
-- Project Screenshots & Evidence -> Completed Student Portfolio).
-- evidence_link / evidence_note hold a link or a short note about a
-- screenshot or piece of evidence (links/notes only — no file upload in
-- this phase). source records where the entry came from ('session',
-- 'final_assessment', or 'manual').
CREATE TABLE IF NOT EXISTS portfolio_entries (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_id TEXT REFERENCES curricula(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  source_id TEXT,
  evidence_link TEXT,
  evidence_note TEXT,
  created_at TEXT NOT NULL
);
