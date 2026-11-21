# LMS Phases 1–3 — Setup (Cloudflare dashboard steps)

Teacher-only LMS for the lesson-plan site. Code is done and tested locally;
nothing here is deployed yet. Do these steps in order, in Rica's own browser
(where she is signed in to Cloudflare).

## 0. What is already in the repo (local, not pushed yet)
- `wrangler.toml` — Pages project `rica-lesson-plans`, D1 binding `DB`
  (database_id is still the placeholder `REPLACE_WITH_D1_DATABASE_ID`).
- `migrations/0001_init.sql` — 6 tables + seed data (17 students, 4 curricula,
  31 modules, 4 assignments; no lessons or skill assessments seeded).
- `migrations/0002_curriculum_details.sql` — Curriculum Management flowchart
  fields (age group, skill level, learning objectives on curricula;
  activities & resources, assessment criteria, expected outputs on lessons)
  and the draft → published lifecycle; the 4 seeded curricula become
  'published', new fields stay blank. Apply after 0001.
- `migrations/0003_sessions_reports_portfolio.sql` — Phases 2 + 3: cycle
  length on curricula (seeds set to their total sessions: Gin 127, Yim
  265, Aom 25, Reka 3; new curricula default to 25) and 8 new tables
  (lesson_plans, teaching_sessions, session_observations,
  end_session_reports, practice_items, final_assessments,
  achievement_reports, portfolio_entries). No rows seeded. Apply after
  0002.
- `functions/` — API: auth (login/logout/me), dashboard, students,
  curricula (incl. publish/unpublish), modules, lessons, plus Phase 2/3:
  student profile/progress, lesson plans, sessions, observations,
  end-session reports, practice items, final assessments, achievement
  reports, portfolio. All `/lms/*` pages except login require a teacher
  session.
- `lms/` — login, dashboard, students, curriculum pages, plus the
  teaching flow (`student.html`), end-session reports (`reports.html`)
  and the digital portfolio (`portfolio.html`, print-to-PDF). Every page
  after login shows the same "Teacher Hub" sidebar (rendered by
  `lms/app.js` from each page's `data-nav` attribute): Dashboard,
  Curriculum Library, Students, Lesson Planning (`lesson-plans.html`),
  Session Management (`sessions.html`), End-Session Reports,
  25-Session Roadmap (`roadmap.html`), Achievements & Portfolio,
  Analytics (`analytics.html`). New read-only API endpoints:
  `GET /api/lesson-plans`, `GET /api/sessions`, `GET /api/roadmap`,
  `GET /api/analytics` — all computed from recorded rows, no new data
  entry. Regenerating an achievement report refreshes the one report
  row for that final assessment instead of adding a duplicate.
- Teacher login URL after deploy: `https://rica-lesson-plans.pages.dev/lms/login.html`

## 1. Create the D1 database
1. Cloudflare dashboard → **Workers & Pages** → open project
   **rica-lesson-plans** → **Settings** → **Functions** → **D1 database
   bindings** → **Add binding**.
2. Create a new D1 database named `rica-lesson-plans-lms`, variable name `DB`.
   (Or with wrangler: `npx wrangler d1 create rica-lesson-plans-lms` — then copy
   the `database_id` it prints.)
3. If created with wrangler, replace `REPLACE_WITH_D1_DATABASE_ID` in
   `wrangler.toml` with the real id and commit that change. If created in the
   dashboard, the binding there is what the live site uses — the wrangler.toml
   id only matters for `wrangler` CLI deploys.

## 2. Apply the migrations (creates tables + seed data)
With wrangler, from the repo root — this applies all three migrations in order:
```
npx wrangler d1 migrations apply rica-lesson-plans-lms
```
(or `npx wrangler d1 execute rica-lesson-plans-lms --file=migrations/0001_init.sql`
then `--file=migrations/0002_curriculum_details.sql`
then `--file=migrations/0003_sessions_reports_portfolio.sql`).
Expected result: students 17, curricula 4, modules 31, lessons 0,
student_curricula 4, skill_assessments 0. Module session counts must sum to
their curriculum totals: Gin 127, Yim 265, Aom 25, Reka 3. The 4 seeded
curricula are 'published'; the new detail fields (age group, skill level,
learning objectives, activities & resources, assessment criteria, expected
outputs) are blank until filled in — new curricula you create start as
'draft' and must be published before they can be assigned to students.
Cycle lengths after migration 0003: Gin 127, Yim 265, Aom 25, Reka 3
(each curriculum's cycle is its whole course; new curricula default to 25
and you can change the cycle length in the curriculum editor). The Phase
2/3 tables (lesson_plans, teaching_sessions, session_observations,
end_session_reports, practice_items, final_assessments,
achievement_reports, portfolio_entries) all start empty.

## 3. Set the teacher password and session secret (do this yourself)
These are secrets — set them in the Cloudflare dashboard, never in chat and
never in a file:
1. Project **rica-lesson-plans** → **Settings** → **Environment variables**
   → **Add variable** (type **Secret** / Encrypted).
2. `LMS_TEACHER_PASSWORD` = the teacher password you choose. Only you know it;
   there is no password reset in the LMS — if it is forgotten, change the
   variable here.
3. `LMS_SESSION_SECRET` = a long random string (any password generator works,
   e.g. 32+ random characters). It signs the login cookie; changing it logs
   everyone out.
4. Apply to the **Production** environment (and Preview if you test there).
   (Or with wrangler: `npx wrangler pages secret put LMS_TEACHER_PASSWORD`
   and `npx wrangler pages secret put LMS_SESSION_SECRET` — it will prompt for
   each value.)

## 4. Deploy
Push the repo to GitHub `main` (the site auto-deploys from main), or:
```
npx wrangler pages deploy .
```
Note: pushing with the `github push-files` helper needs the paths manifest
(`~/workspace/lesson-plans-paths.txt`) to list the new files — it has been
updated locally to include `wrangler.toml`, `migrations/`, `functions/` and
`lms/`.

## 5. Verify live
1. Open `https://rica-lesson-plans.pages.dev/lms/login.html` — the login page
   must load. Wrong password → "Incorrect password". Correct password →
   dashboard.
2. Dashboard must show: Students 17, Curricula 4, Assignments 4,
   Lesson plans 0, Sessions conducted 0, End-session reports 0,
   Portfolio entries 0.
3. Students page lists all 17 students; Curriculum page lists 4 curricula
   (MIT App Inventor 127, Yim 265, Figma & Website Development 25, Scratch
   Star Collection Game 3), all marked **Published**. A new curriculum you
   create starts as **Draft** — publish it from its detail page before
   assigning it to a student (assigning a draft is rejected). Each
   curriculum shows its cycle length (127 / 265 / 25 / 3); new curricula
   default to 25.
4. Teaching flow: open a student and click "Open teaching flow" — the
   profile, progress and previous report show at the top; create a lesson
   plan from a library lesson, plan a session, conduct it, save an
   observation (objectives achieved yes / partially / no) and an
   end-session report; the End-Session Reports page lists it.
5. Teacher Hub sidebar + new pages: every page after login shows the
   same sidebar — Dashboard, Curriculum Library, Students, Lesson
   Planning, Session Management, End-Session Reports, 25-Session
   Roadmap, Achievements & Portfolio, Analytics — with the current page
   highlighted and a Logout button at the bottom. Lesson Planning lists
   every lesson plan (with filters); Session Management lists every
   session; the 25-Session Roadmap shows per-student progress against
   each curriculum's cycle length with the next planned sessions;
   Analytics shows totals, objectives-achieved counts (yes / partially /
   no) and per-student + per-curriculum tables — all from recorded rows,
   with "No sessions recorded yet" where there is nothing. The dashboard
   itself keeps only its overview stat cards. The login page has no
   sidebar.
6. Cycle + portfolio: a student who finishes their cycle (e.g. Reka, 3
   sessions) gets a Final Assessment form; after saving it, "Generate
   achievement report" composes the report from their records, and "Open
   digital portfolio" shows the collected records, initial vs final
   performance, and the portfolio entries. "Save as PDF (print)" opens
   the browser print dialog — choose "Save as PDF". Evidence on portfolio
   entries is a link or a note only; no file upload exists in this phase.
   Generating the achievement report a second time refreshes the same
   report (it does not create a duplicate).
6. Opening `https://rica-lesson-plans.pages.dev/lms/` while logged out must
   redirect to the login page. The public pages (home, Gin, Yim, Aom,
   Curriculum, End Session Report) must be unchanged and need no login.

## If login fails
- "Teacher login is not set up yet" → `LMS_TEACHER_PASSWORD` or
  `LMS_SESSION_SECRET` is missing in the Production environment. Re-check
  step 3 and redeploy (env var changes need a new deployment to take effect).
- Login page loads but every API call is 401 → the D1 binding is missing or
  named differently from `DB`, or the migration was never applied.

## What is NOT in Phases 1–3 (comes later)
Analytics (from the main flowchart) — no analytics page or endpoint yet.
Everything else in the three flowcharts is built: lesson planning,
conducting sessions, end-session reports, progress tracking, the
cycle-length evaluation, achievement reports, portfolio with evidence
links/notes, and the print-to-PDF portfolio page. The final PDF is the
browser's "Save as PDF" from the portfolio page, not a server-generated
file; portfolio evidence is links/notes only, no file upload.
