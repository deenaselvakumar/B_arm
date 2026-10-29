# MyZen Agent (desktop)

Installed on each employee's PC. The employee logs in with their own work email and password, then uses **Punch In / Punch Out, Start / End Break, Log Time**, and sees their own timesheet history. While punched in (and not on a break) the agent notes which app is in front and whether the user is idle, classifies it as productive / neutral / unproductive, and syncs to Supabase for the manager portal.

The agent is **not** a website: it is an Electron window (with a tray icon) that shows a small UI served from `127.0.0.1` on the same PC.

## Run it

```bash
cd desktop-agent
npm install
cp .env.example .env        # leave blank for demo mode
npm start                   # Electron window
```

Without Electron (servers, CI, trying it on Linux/WSL):

```bash
npm run simulate            # fake activity, 6-20 s phases; open http://127.0.0.1:3001/ui
npm run start:headless      # real window/idle sampling, no Electron
npm test                    # 9 tests, incl. real sync against schema.sql in an in-process Postgres
```

Demo mode (no Supabase vars): log in with `deena.s@barm.in`, `chandru.p@barm.in`, `arun.k@barm.in`, `priya.s@barm.in`, `vikram.s@barm.in` or `meera.n@barm.in` and any password. Data never leaves the PC.

Live mode: set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the **anon** key only; never the service-role key). Run `supabase/schema.sql` first and create employees with passwords (see the top-level README).

## How punch / break / log time work

- State machine: Punch In → (Start Break ⇄ End Break) → Punch Out. Invalid transitions (double punch-in, break while punched out) are refused with a message. Punch Out ends an open break.
- Everything is written to `state.json` in the app's data folder first. A background loop pushes unsynced rows (client-generated UUIDs, so retries are safe) every 30 s and shortly after each action. The UI shows "N items waiting to sync" while offline.
- **Log Time** takes a date (not in the future), then hours (0-24) or start+end, plus a description. It syncs as a `timesheet_entries` row and appears on the manager's User Detail → Timesheet tab, unapproved.
- Log out is refused with a warning while unsynced items remain (you can force it and lose them).
- If the app is closed while punched in, tracking stops but you stay punched in; the UI flags a punch left open from a previous day.
- Logging in on a second PC restores the last 30 days from Supabase.

## What is collected

| Collected | Not collected |
|---|---|
| Foreground app name | Keystrokes or any typed text |
| Site host (e.g. `github.com`), only where the OS API provides it | URL path/query, window titles, page content |
| Seconds since last input (OS idle timer; idle after 120 s) | Mouse movement content, clipboard |
| Punch, break, manual time entries | Anything while punched out or on break |

Productivity % = productive active time / online (tracked) time. Rules come from the `app_category_rules` table at login (built-in defaults in demo mode).

## OS support

| OS | Status |
|---|---|
| Windows 10/11 | Primary target. App name + idle work via `active-win` / Electron. **Browser URL is not available** from `active-win` on Windows, so site-based rules only apply on macOS (needs Screen Recording permission). Not run on Windows here. |
| macOS | App name + URL via `active-win`; the user must grant Screen Recording. Not run here. |
| Linux | App name via `active-win` (X11). Simulator works anywhere. |

Honest status: the core (state machine, monitor, sync) is covered by tests. The Electron shell (`src/main.js`: window, tray, single instance) has been syntax-checked but **not launched** in the build sandbox (no display), and installers (`npm run dist:win`) have not been built or code-signed. Do a smoke test on a real Windows PC before rolling out.

## Screenshots (off)

Capture runs only if **all three** are true: `ENABLE_SCREENSHOTS=true` in the agent env, `system_config.screenshots_enabled = 'true'` in Supabase, and the employee's department is in `SCREENSHOT_TEAMS` (or `system_config.screenshot_teams`, a JSON array; `*` = all). Images are saved locally under the data folder and pruned after 7 days; the **upload to Supabase Storage is a stub**. There is no blurring, redaction or consent prompt yet. Treat this as plumbing, not a finished feature.

## Security notes

- The local server binds to `127.0.0.1` only, has no CORS, rejects unexpected `Host`/`Origin` headers, and the Electron window runs with `contextIsolation` on and `nodeIntegration` off.
- The session token and unsynced data sit in `state.json` in the user's profile, unencrypted. Another local user with file access could read them.
- Timestamps use the PC clock and are trusted by the server.
