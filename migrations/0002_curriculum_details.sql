-- LMS Phase 1 — Curriculum Management flowchart (2026-11-21)
-- Adds the fields from Rica's Curriculum Management flowchart
-- (mermaid-diagram__1.png): age group & skill level, learning objectives,
-- activities & resources, assessment criteria, expected outputs, and the
-- draft → published lifecycle (Save → Ready to Use? → Publish to Library).
-- D1 / SQLite. All new columns are nullable: existing rows keep working
-- and the new fields stay blank until the teacher fills them in.
-- Do NOT edit 0001_init.sql; apply this after it
-- (wrangler applies migrations in filename order).

-- Curriculum details (flowchart: Enter Curriculum Details,
-- Define Age Group & Skill Level, Set Learning Objectives)
ALTER TABLE curricula ADD COLUMN age_group TEXT;
ALTER TABLE curricula ADD COLUMN skill_level TEXT;
ALTER TABLE curricula ADD COLUMN learning_objectives TEXT;

-- Lesson details (flowchart: Add Activities & Resources,
-- Add Assessment Criteria, Define Expected Outputs)
ALTER TABLE lessons ADD COLUMN activities_resources TEXT;
ALTER TABLE lessons ADD COLUMN assessment_criteria TEXT;
ALTER TABLE lessons ADD COLUMN expected_outputs TEXT;

-- Publish lifecycle (flowchart: Save → Ready to Use? Yes → Publish to
-- Curriculum Library → Assign to Students). Only 'published' curricula may
-- be assigned to students; new curricula start as 'draft'.
-- 0001 seeded curricula with status 'active' (the old lifecycle). Those four
-- are complete and already assigned, so they become 'published'. The API
-- always writes status explicitly ('draft' on create), so the 'active'
-- default left in 0001 never applies to new rows.
UPDATE curricula SET status = 'published' WHERE status = 'active';
