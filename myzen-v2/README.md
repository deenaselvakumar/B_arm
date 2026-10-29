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
5. **Managers** open the web portal, log in with a manager account, and see dashboards, user detail and reports built from the same Supabase data (the page refreshes itself every 20 s).

## Demo mode vs live mode

| | Demo (default) | Live (Supabase) |
|---|---|---|
| Portal | Env vars missing: shows bundled sample data (`lib/demoData.json`). **Any email/password logs in.** | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set: reads Supabase server-side. Only accounts with `is_manager = true` can log in, with a real password. |
| Agent | `SUPABASE_URL`/`SUPABASE_ANON_KEY` missing: data stays on the PC; login only accepts the built-in demo accounts. | Both set: login is verified by Supabase; data syncs. |

If live mode is on but Supabase is unreachable, the portal falls back to demo data **and shows a warning banner** (it never silently pretends to be live). The badge in the sidebar always says Demo or Live.

Sample data: Chandru P and Deena Selvakumar for Oct 2026 are seeded from the two CSVs in `supabase/data/` (present days 21 and 23 match exactly; productivity within 0.1 pt of the CSV). Arun Kumar, Priya Sharma, Vikram Singh, Meera Nair and a manager (`manager@barm.in`) are **fictional** teammates. "Now" in demo data is frozen at 29 Oct 2026, 13:00 IST.

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

### Adding real employees and passwords

Passwords are stored as bcrypt hashes. In the SQL editor:

```sql
insert into employees (email, name, department, role, is_manager)
values ('someone@barm.in', 'Someone', 'Engineering', 'Developer', false);
select set_employee_password('someone@barm.in', 'a-strong-password');
```

`seed.sql` ends by giving every sample account the password **`myzen123`**. That is for demos only: before the database holds real data, delete the seeded employees or change every password with `set_employee_password`.

### Security model (what is and isn't protected)

- Every table has RLS enabled with **no** policies for `anon`/`authenticated`: the public key cannot read or write any table directly.
- The agent uses `agent_login`, `agent_sync`, `agent_history`, `agent_logout`. Login returns a random token; only its SHA-256 is stored; it expires after 30 days and is revoked on logout. Each function resolves the employee from the token, so one employee cannot write another's data.
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

## Reports

Reports page: Summary, Monthly Attendance, Productivity, Apps/URLs. Each has a preview table and a client-side CSV download (cells starting with `=`, `+`, `-`, `@` are neutralised against spreadsheet formula injection). Analytics is a placeholder page.

## Privacy

- **No keystroke content, ever.** The agent reads the foreground app name, the site host (not path or query), and the OS idle timer (seconds since last input). Window titles are discarded.
- Monitoring happens only while punched in and not on break.
- **Screenshots are OFF** and require three independent opt-ins (see agent README). When enabled, the agent captures on an interval while punched in (never on break), keeps the image on the PC and syncs only metadata to the `screenshots` table. Image upload, blur/redaction, employee consent and a manager viewer are **not implemented**, so do not enable screenshots for real use without adding them and getting legal sign-off.
- Employees should be told what is collected. Check local labour/privacy requirements (e.g. India's DPDP Act) before rollout.

## Known limitations and next steps

- Portal live mode loads the last 62 days of attendance/stats and the last 7 days of app sessions. Larger orgs need server-side aggregation (SQL views) and pagination.
- Single shared manager role; no per-team manager scoping, no password reset UI, no audit log.
- Productivity rules are rows in `app_category_rules` (editable in SQL; no UI yet). The Settings tab is read-only.
- Real-time = polling (20 s), not Supabase Realtime.
- Not yet verified against a real Supabase project: the SQL is tested in an in-process Postgres (PGlite) and the portal against a stub REST server. Run the schema in a scratch project first.
- Next: manager UI for rules, device-bound agent tokens, server-side time validation, screenshot storage bucket + blurring + consent.

## Layout

```
app/                 Next.js routes ((portal)/ pages, api/login|logout|snapshot)
components/          Sidebar, SnapshotProvider
lib/                 data.server.ts (Supabase or demo), derive.ts (metrics), session.ts, csv.ts, demoData.json
middleware.ts        redirects unauthenticated users to the login page
supabase/            schema.sql, seed.sql, data/*.csv
scripts/generate-seed.mjs   rebuilds seed.sql + demoData.json from the CSVs (npm run seed)
desktop-agent/       Electron/Node agent + tests
```
