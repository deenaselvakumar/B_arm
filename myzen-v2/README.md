# MyZenV2

An internal productivity suite for B-Arm (India): a **desktop agent** that employees run on their own PCs, a **manager web portal**, and **Supabase (Postgres)** as the shared database. MyZenV2 is original branding.

```
 Employee PC                              Cloud                        Manager browser
┌─────────────────────────────┐       ┌───────────────┐        ┌──────────────────────────┐
│ MyZen Agent (Electron)      │       │               │        │ MyZenV2 portal (Next.js) │
│  login · punch in/out       │  RPC  │   Supabase    │ service│  Dashboard · Real Time   │
│  break · log time           ├──────►│   Postgres    │◄───────┤  Reports · User Detail   │
│  app/idle monitoring        │ (anon │  (RLS on,     │  role  │  (manager login only)    │
│  local-first, syncs queue   │  key) │   no policies)│ (server│                          │
└─────────────────────────────┘       └───────────────┘  side) └──────────────────────────┘
```

| | Who uses it | What it does |
|---|---|---|
| **Desktop agent** (`desktop-agent/`) | Every employee | Compact tray-style window with a live working-time counter. Log in with own credentials. **Punch In / Punch Out, Start / End Break, Log Time** (manual entries), see own timesheet history. Monitors the foreground app and idle time while punched in. Syncs to Supabase. |
| **Web portal** (this folder) | Managers only | Dashboard, Real Time, Reports (with CSV download), User Detail (Overview, Attendance, Productivity, Apps & URLs, Performance Summary, Timesheet, Settings). **Employees do not need the website; punching is desktop-only.** |
| **Supabase** (`supabase/`) | - | Shared database. `schema.sql` creates it, `seed.sql` loads sample data. |

## The flow

1. **Download / install** the agent on the employee's PC (see [`desktop-agent/README.md`](desktop-agent/README.md)).
2. **Log in** inside the agent with the employee's work email and password.
3. **Punch In.** Only now does the agent observe the foreground app and idle time. **Start Break** pauses observation; **End Break** resumes it; **Punch Out** stops it. **Log Time** adds a manual entry (work away from the PC, a missed punch).
4. The agent writes everything to a local file first, then pushes to Supabase every 30 s and whenever you punch. If the PC is offline, nothing is lost: the queue flushes when the network returns.
5. **Managers** open the web portal, log in with a manager account, and see dashboards, user detail, reports and (if enabled) screenshots built from the same Supabase data (the page refreshes itself every 20 s). **A manager only sees employees mapped to them** (`employees.manager_id`).

## Login details (demo seed)

Run `supabase/seed.sql` (live) or just start the apps with no env vars (demo). Passwords below apply to the seeded Supabase data; in pure demo mode the portal accepts any password and the agent accepts any password for the listed emails.

| Who | Where to log in | Email | Password | Sees / is |
|---|---|---|---|---|
| **Manager 1** | Portal | `manager@barm.in` | `myzen123` | Chandru P, Deena Selvakumar, Arun Kumar, Priya Sharma, Meera Nair, Riya Menon |
| **Manager 2** | Portal | `manager2@barm.in` | `myzen123` | Vikram Singh only (proves mapping) |
| **New employee** | Desktop agent | `riya.menon@barm.in` | `Welcome@123` | Riya Menon, mapped to Manager 1, no history yet: log in, punch in, and her data appears on Manager 1's portal and nowhere else |
| Existing employees | Desktop agent | `deena.s@barm.in`, `chandru.p@barm.in`, `arun.k@barm.in`, `priya.s@barm.in`, `meera.n@barm.in`, `vikram.s@barm.in` | `myzen123` | |

Employees cannot log in to the portal (it rejects non-managers), and managers do not need the agent. **These are demo credentials: change or delete them before real use.**

In pure demo mode (no Supabase env) the portal picks the manager by the email you type (`manager@barm.in` or `manager2@barm.in`; anything else falls back to Manager 1).

## Demo mode vs live mode

| | Demo (default) | Live (Supabase) |
|---|---|---|
| Portal | Env vars missing: shows bundled sample data (`lib/demoData.json`). **Any email/password logs in.** | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set: reads Supabase server-side. Only accounts with `is_manager = true` can log in, with a real password. |
| Agent | `SUPABASE_URL`/`SUPABASE_ANON_KEY` missing: data stays on the PC; login only accepts the built-in demo accounts. | Both set: login is verified by Supabase; data syncs. |

If live mode is on but Supabase is unreachable, the portal falls back to demo data **and shows a warning banner** (it never silently pretends to be live). The badge in the sidebar always says Demo or Live.

Sample data: Chandru P and Deena Selvakumar for Oct 2026 are seeded from the two CSVs in `supabase/data/` (present days 21 and 23 match exactly; productivity within 0.1 pt of the CSV). Arun Kumar, Priya Sharma, Vikram Singh, Meera Nair, the new hire Riya Menon and two managers (`manager@barm.in`, `manager2@barm.in`) are **fictional**. "Now" in demo data is frozen at 29 Oct 2026, 13:00 IST.

## Tests

```bash
cd desktop-agent && npm test       # 17 agent tests
cd .. && npm run build && npm run e2e   # portal + agent + real SQL, incl. manager scoping and screenshots (passes on Node 18, 20, 22)
```

## Run the portal locally

```bash
cd myzen-v2
npm install
npm run dev          # http://localhost:3000, demo mode, any credentials work
# or
npm run build && npm start
```

## Connect Supabase

1. In a Supabase project, open **SQL editor** and run, in order:
   1. [`supabase/schema.sql`](supabase/schema.sql): tables, RLS, the `agent_*` functions. Safe to re-run.
   2. [`supabase/seed.sql`](supabase/seed.sql): sample data. **Skip this for a real rollout** and add your real employees instead (see below).
2. Project Settings → API: copy the URL, the `anon` key and the `service_role` key.
3. Portal: copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and a random `SESSION_SECRET`. Restart. The sidebar badge should read **Live**.
4. Agent: put `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the agent's `.env`. **Never put the service-role key on an employee PC.**

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | portal, agent | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | agent (as `SUPABASE_ANON_KEY` also accepted) | Public key; safe on PCs because all tables are locked by RLS and the agent only calls token-checked functions |
| `SUPABASE_SERVICE_ROLE_KEY` | portal server only | Bypasses RLS. Never commit, never ship to browsers or PCs |
| `SESSION_SECRET` | portal | Signs the manager session cookie. Falls back to the service-role key, then to a public demo constant, so set it |
| `MYZEN_PORTAL_URL` | agent | Base URL of the portal (e.g. `https://myzen.example.com`) that PCs can reach. Needed only to **upload screenshot images**; without it screenshots stay local and only metadata syncs |

### Adding employees (new login) and mapping them to a manager

Two supported paths, both hash the password (bcrypt) and map the employee to a manager:

1. **Portal:** log in as a manager, open **Employees**, fill in name, email, team, role and an initial password (min 8 characters). The employee is mapped to *you*. Give them the password privately; they log in to the **desktop agent** with it. (Live mode only: demo mode cannot save.)
2. **SQL editor** (also for bulk or for creating managers):

```sql
-- employee mapped to manager@barm.in
select add_employee('someone@barm.in', 'Someone', 'Engineering', 'Developer', 'a-strong-password', 'manager@barm.in');
-- a new manager (not mapped to anyone)
select add_employee('lead@barm.in', 'Team Lead', 'Management', 'Lead', 'a-strong-password', null, true);
-- re-map an existing employee
update employees set manager_id = (select id from employees where email = 'lead@barm.in') where email = 'someone@barm.in';
-- reset a password
select set_employee_password('someone@barm.in', 'new-strong-password');
```

`add_employee` is callable only with the service-role key (SQL editor / portal server); the public key cannot call it. It rejects bad emails, passwords under 8 characters, duplicates and unknown managers.

`seed.sql` ends by giving sample accounts the passwords listed under *Login details*. That is for demos only: before the database holds real data, delete the seeded employees or change every password.

### Security model (what is and isn't protected)

- Every table has RLS enabled with **no** policies for `anon`/`authenticated`: the public key cannot read or write any table directly.
- The agent uses `agent_login`, `agent_sync`, `agent_history`, `agent_logout`. Login returns a random token; only its SHA-256 is stored; it expires after 30 days and is revoked on logout. Each function resolves the employee from the token, so one employee cannot write another's data.
- **Manager scoping:** the portal never queries employees outside the logged-in manager's `manager_id`; every table query is filtered to those employee ids, the session cookie carries the manager's id (signed), and screenshot APIs re-check the mapping on every request. Employees have no portal access at all, so they cannot see anyone's screenshots on the website. There is no super-admin role: to see everyone, map everyone to one manager.
- Login lockout: 10 failures per 10 minutes per account. This can also be used to lock a known email out for 10 minutes.
- **Known limit:** timestamps come from the employee's PC clock and are trusted. An employee with admin rights can alter the clock or the local file. This is an honest-effort internal tool, not tamper-proof.
- The portal's manager session is an HMAC-signed, HttpOnly cookie (8 h). Login is rate limited per IP in memory (resets on restart; per-instance).

## Exposing the portal with ngrok

If "grok" in the request meant **ngrok**, this is how to share the portal (not tested here: the sandbox has no ngrok binary or authtoken):

```bash
npm run build && npm start                 # port 3000
ngrok config add-authtoken <your-token>    # once
ngrok http 3000
```

Before you do this: set `SESSION_SECRET`, run in **live** mode, and remove/change the seeded `myzen123` passwords. In demo mode **anyone with the URL can log in with any password.** Tunnel only the portal. Never tunnel the agent's local port (3001).

## Screenshots (manager-only, off by default)

**Flow when enabled** (all of: agent `ENABLE_SCREENSHOTS=true`, `system_config.screenshots_enabled='true'`, employee's team in `system_config.screenshot_teams`):

1. The agent captures one image per interval while punched in and not on break, and queues its metadata for `agent_sync`.
2. If `MYZEN_PORTAL_URL` is set, it uploads the PNG to the portal's `POST /api/agent/screenshot` with its per-employee token. The portal re-checks the org switch and team allowlist, validates size (max 3 MB) and that it really is PNG/JPEG, picks the storage path itself (`<employee_id>/<shot_id>.png`), stores it in the **private** `screenshots` Storage bucket (created by `schema.sql`; no public access, no storage policies) and records it in the `screenshots` table. The agent then deletes its local copy.
3. A manager opens **Screenshots** (or **User Detail > Screenshots**), picks an employee mapped to them and a day, and sees thumbnails. Images are streamed by `GET /api/screenshots/<id>/image`, which checks the session *and* that the owner's `manager_id` is that manager; anything else is a 404. There is no public or guessable URL.

Enable for one team, in the SQL editor:

```sql
update system_config set config_value = 'true' where config_key = 'screenshots_enabled';
update system_config set config_value = '["Engineering"]' where config_key = 'screenshot_teams';  -- or ["*"]
update system_config set config_value = '10' where config_key = 'screenshot_interval_minutes';
```

Then set `ENABLE_SCREENSHOTS=true` and `MYZEN_PORTAL_URL=...` in the agent's `.env`. To switch off: set `screenshots_enabled` back to `false`; the agents stop capturing at their next login/restart and the server immediately refuses uploads and ignores metadata.

**Not implemented (do before real use):** blur/redaction (`blurred` is always false), an employee notice/consent record, automatic retention/deletion of stored images (delete rows and bucket objects yourself), per-view audit log, and real-capture testing on Windows/macOS (`screenshot-desktop` was not exercised; tests use a fake capturer). Images pass through the portal server on upload, so run it behind HTTPS. Upload also needs the PC to reach the portal; until then the image waits on the PC (7 days max).

## Reports

Reports page: Summary, Monthly Attendance, Productivity, Apps/URLs. Each has a preview table and a client-side CSV download (cells starting with `=`, `+`, `-`, `@` are neutralised against spreadsheet formula injection). Analytics is a placeholder page.

## Privacy

- **No keystroke content, ever.** The agent reads the foreground app name, the site host (not path or query), and the OS idle timer (seconds since last input). Window titles are discarded.
- Monitoring happens only while punched in and not on break.
- **Screenshots are OFF** and require three independent opt-ins (see *Screenshots* above). When enabled, the agent captures on an interval while punched in (never on break); images go to a private bucket and only the employee's own mapped manager can view them. Blur/redaction, consent records and automatic retention are **not implemented**: get legal sign-off and tell employees before enabling for real use.
- Employees should be told what is collected. Check local labour/privacy requirements (e.g. India's DPDP Act) before rollout.

## Known limitations and next steps

- Portal live mode loads the last 62 days of attendance/stats and the last 7 days of app sessions. Larger orgs need server-side aggregation (SQL views) and pagination.
- Managers are scoped by a single `manager_id` per employee (no teams of managers, no admin who sees all, no delegation). No password-reset UI and no audit log.
- The portal filters with `employee_id in (...)`; beyond a few hundred employees per manager this should become a SQL view or RPC.
- Productivity rules are rows in `app_category_rules` (editable in SQL; no UI yet). The Settings tab is read-only.
- Real-time = polling (20 s), not Supabase Realtime.
- **Not yet verified against a real Supabase project.** `npm run e2e` runs the real SQL in an in-process Postgres (PGlite) behind a small PostgREST/Storage test double, with the built portal and the real agent core. It does not exercise Supabase's real Storage service, Auth or RLS-with-JWT, so run the schema in a scratch project first.
- Next: manager UI for rules, device-bound agent tokens, server-side time validation, screenshot blur + consent + retention.

## Layout

```
app/                 Next.js routes ((portal)/ pages, api/login|logout|snapshot)
components/          Sidebar, SnapshotProvider
lib/                 data.server.ts (Supabase or demo), derive.ts (metrics), session.ts, csv.ts, demoData.json
middleware.ts        redirects unauthenticated users to the login page
supabase/            schema.sql, seed.sql, data/*.csv
scripts/generate-seed.mjs   rebuilds seed.sql + demoData.json from the CSVs (npm run seed)
tests/               e2e test (npm run e2e) + PGlite-backed Supabase test double
desktop-agent/       Electron/Node agent + tests
```
