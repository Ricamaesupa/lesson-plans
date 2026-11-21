-- LMS Phase 1 — initial schema + seed data
-- D1 / SQLite. Foreign keys are enforced in application code on delete
-- as well as by these REFERENCES clauses (D1 has FK enforcement off by default).

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  nickname TEXT,
  full_name TEXT,
  track TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curricula (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  total_sessions INTEGER,
  public_page TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  session_count INTEGER,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objective TEXT,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_curricula (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL,
  UNIQUE(student_id, curriculum_id)
);

CREATE TABLE IF NOT EXISTS skill_assessments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_id TEXT REFERENCES curricula(id) ON DELETE SET NULL,
  level TEXT NOT NULL,
  notes TEXT,
  assessed_at TEXT NOT NULL
);

-- Seed students (17 CIY students; no emails, ages, or skill levels)
INSERT INTO students (id, first_name, nickname, full_name, track, notes, status, created_at, updated_at) VALUES
('stu-yim', 'Pananan', 'Yim', 'Pananan Limpaiboon', 'Minecraft Education, MIT App Inventor, Micro:bit', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-gin', 'Sasawat', 'Gin', 'Sasawat Lertsamart', 'MIT App Inventor', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-ray', 'Poonchida', 'Ray', 'Poonchida Chatthong', 'MIT App Inventor', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-run', 'Paramita', 'Run', 'Paramita Chatthong', 'MIT App Inventor', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-medz', 'Methawin', 'Medz', 'Methawin Intatisan', 'Roblox Studio — Obby game', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-gus', 'Akaradej', 'Gus', 'Akaradej Imarom', 'Electronics, Scratch (introduction)', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-bright', 'Thitipaphat', 'Bright', 'Thitipaphat Sakornaramruang', 'Electronics, Scratch (introduction)', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-parm', 'Thaiket', 'Parm', 'Thaiket Laoprapassakul', 'Roblox Studio — Bomb Slam', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-aom', 'Nathanicha', 'Aom', 'Nathanicha Suebsumran', 'Figma & Website Development', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-empire', 'Suphatkrit', 'Empire', 'Suphatkrit Puriwongwanich', 'JavaScript form validation, Figma', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-elf', 'Aekatosawat', 'Elf', 'Aekatosawat Singhasitthanakul', 'Minecraft Education, AI, Scratch', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-aiya', 'Pattamaphorn', 'Aiya', 'Pattamaphorn Viriyapakul', 'Figma — article website', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-reka', 'Ponnaphon', 'Reka', 'Ponnaphon Tammarat', 'Scratch Star Collection Game, Code.org Course D, Tinkercad', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-set', 'Thanaphat', 'Set', 'Thanaphat Powkum', 'Tinkercad — chess-piece set', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-anchan', 'Amornrat', 'Anchan', 'Amornrat Amornkaran', 'Scratch — Halloween project', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-harrison', 'Harrison', 'Harrison', 'Harrison Chambers', 'Minecraft Education Apprentice, Scratch character game', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('stu-chanon', 'Chanon', 'Chanon', NULL, 'To confirm — new from Sat 21 Nov 2026', NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z');

-- Seed curricula (4)
INSERT INTO curricula (id, title, subject, description, total_sessions, public_page, status, created_at, updated_at) VALUES
('cur-gin-mit', 'MIT App Inventor', 'MIT App Inventor', 'MIT App Inventor, Wednesdays 3:30–5:00pm, 18 Nov 2026 – 18 Apr 2029. Built on resistor colour codes and Ohm''s Law; an exploration, not a CIY-assigned track.', 127, 'gin.html', 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('cur-yim-265', 'Minecraft, MIT App Inventor & Micro:bit', 'Minecraft / MIT App Inventor / Micro:bit', '265 sessions, Tue / Sat / Sun, 17 Nov 2026 – 21 Nov 2027. Block-based only. (265-session count still to confirm.)', 265, 'yim.html', 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('cur-aom-figma', 'Figma & Website Development', 'Figma & Website Development', '25 future sessions, Saturdays 9:00–10:30am, 19 Dec 2026 – 5 Jun 2027. Finish Website 1 and publish it live, then Website 2, a portfolio and a blog page, final showcase. Starts only if sessions are confirmed.', 25, 'aom.html', 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z'),
('cur-reka-scratch', 'Scratch Star Collection Game', 'Scratch', '3 sessions, Sundays 11:00–12:30, 22 Nov – 6 Dec 2026. Scratch Star Collection Game, plus Code.org Course D and Tinkercad.', 3, NULL, 'active', '2026-11-21T00:00:00.000Z', '2026-11-21T00:00:00.000Z');

-- Seed modules: MIT App Inventor (8)
INSERT INTO modules (id, curriculum_id, title, session_count, position, created_at) VALUES
('mod-gin-1', 'cur-gin-mit', 'Phase 1 — Foundations & Electronics Tools', 8, 1, '2026-11-21T00:00:00.000Z'),
('mod-gin-2', 'cur-gin-mit', 'Phase 2 — Games & Interaction', 16, 2, '2026-11-21T00:00:00.000Z'),
('mod-gin-3', 'cur-gin-mit', 'Phase 3 — Data, Lists & Storage (TinyDB)', 16, 3, '2026-11-21T00:00:00.000Z'),
('mod-gin-4', 'cur-gin-mit', 'Phase 4 — Sensors & Media', 16, 4, '2026-11-21T00:00:00.000Z'),
('mod-gin-5', 'cur-gin-mit', 'Phase 5 — Connectivity: Bluetooth & Web APIs', 16, 5, '2026-11-21T00:00:00.000Z'),
('mod-gin-6', 'cur-gin-mit', 'Phase 6 — AI & Smart Apps', 18, 6, '2026-11-21T00:00:00.000Z'),
('mod-gin-7', 'cur-gin-mit', 'Phase 7 — Advanced Apps & Real-World Tools', 18, 7, '2026-11-21T00:00:00.000Z'),
('mod-gin-8', 'cur-gin-mit', 'Phase 8 — Capstone & Portfolio', 19, 8, '2026-11-21T00:00:00.000Z');

-- Seed modules: Yim 265 (17)
INSERT INTO modules (id, curriculum_id, title, session_count, position, created_at) VALUES
('mod-yim-1', 'cur-yim-265', 'M1 Village & Farm', 14, 1, '2026-11-21T00:00:00.000Z'),
('mod-yim-2', 'cur-yim-265', 'M2 Redstone Machines', 18, 2, '2026-11-21T00:00:00.000Z'),
('mod-yim-3', 'cur-yim-265', 'M3 Building & Design', 16, 3, '2026-11-21T00:00:00.000Z'),
('mod-yim-4', 'cur-yim-265', 'M4 Adventure Worlds', 16, 4, '2026-11-21T00:00:00.000Z'),
('mod-yim-5', 'cur-yim-265', 'M5 Coding Blocks & Automation', 18, 5, '2026-11-21T00:00:00.000Z'),
('mod-yim-6', 'cur-yim-265', 'M6 Mega Build Capstone', 24, 6, '2026-11-21T00:00:00.000Z'),
('mod-yim-7', 'cur-yim-265', 'A1 First Apps', 14, 7, '2026-11-21T00:00:00.000Z'),
('mod-yim-8', 'cur-yim-265', 'A2 Games & Interaction', 18, 8, '2026-11-21T00:00:00.000Z'),
('mod-yim-9', 'cur-yim-265', 'A3 Data, Lists & Screens', 18, 9, '2026-11-21T00:00:00.000Z'),
('mod-yim-10', 'cur-yim-265', 'A4 Sensors & Media Apps', 18, 10, '2026-11-21T00:00:00.000Z'),
('mod-yim-11', 'cur-yim-265', 'A5 Useful Apps', 18, 11, '2026-11-21T00:00:00.000Z'),
('mod-yim-12', 'cur-yim-265', 'A6 Capstone App', 20, 12, '2026-11-21T00:00:00.000Z'),
('mod-yim-13', 'cur-yim-265', 'B1 Buttons, LEDs & Display', 10, 13, '2026-11-21T00:00:00.000Z'),
('mod-yim-14', 'cur-yim-265', 'B2 Sensors & Input', 10, 14, '2026-11-21T00:00:00.000Z'),
('mod-yim-15', 'cur-yim-265', 'B3 Games on Micro:bit', 11, 15, '2026-11-21T00:00:00.000Z'),
('mod-yim-16', 'cur-yim-265', 'B4 Micro:bit Inventions', 11, 16, '2026-11-21T00:00:00.000Z'),
('mod-yim-17', 'cur-yim-265', 'B5 Capstone Invention', 11, 17, '2026-11-21T00:00:00.000Z');

-- Seed modules: Aom Figma (5)
INSERT INTO modules (id, curriculum_id, title, session_count, position, created_at) VALUES
('mod-aom-1', 'cur-aom-figma', 'Website 1', 10, 1, '2026-11-21T00:00:00.000Z'),
('mod-aom-2', 'cur-aom-figma', 'Website 2', 9, 2, '2026-11-21T00:00:00.000Z'),
('mod-aom-3', 'cur-aom-figma', 'Portfolio', 2, 3, '2026-11-21T00:00:00.000Z'),
('mod-aom-4', 'cur-aom-figma', 'Blog', 2, 4, '2026-11-21T00:00:00.000Z'),
('mod-aom-5', 'cur-aom-figma', 'Final showcase', 2, 5, '2026-11-21T00:00:00.000Z');

-- Seed modules: Reka Scratch (1)
INSERT INTO modules (id, curriculum_id, title, session_count, position, created_at) VALUES
('mod-reka-1', 'cur-reka-scratch', 'Star Collection Game', 3, 1, '2026-11-21T00:00:00.000Z');

-- Seed lessons: none (seed NO lessons per contract)

-- Seed assignments (4 only)
INSERT INTO student_curricula (id, student_id, curriculum_id, status, started_at) VALUES
('asg-gin-mit', 'stu-gin', 'cur-gin-mit', 'active', '2026-11-21T00:00:00.000Z'),
('asg-yim-265', 'stu-yim', 'cur-yim-265', 'active', '2026-11-21T00:00:00.000Z'),
('asg-aom-figma', 'stu-aom', 'cur-aom-figma', 'active', '2026-11-21T00:00:00.000Z'),
('asg-reka-scratch', 'stu-reka', 'cur-reka-scratch', 'active', '2026-11-21T00:00:00.000Z');

-- Seed skill assessments: none (levels are for the teacher to assess in the UI)
