# MyZen Agent (desktop)

Installed on each employee's PC. The employee logs in with their own work email and password, then uses **Punch In / Punch Out, Start / End Break, Log Time**, and sees their own timesheet history. While punched in (and not on a break) the agent notes which app is in front and whether the user is idle, classifies it as productive / neutral / unproductive, and syncs to Supabase for the manager portal.

The agent is **not** a website: it is a compact Electron window (with a tray icon) that shows a small UI served from `127.0.0.1` on the same PC.

## The window

Compact dark tray-style window, modelled on a typical time-tracker layout with original MyZenV2 branding:

- **Header:** recording indicator (red pulsing dot = recording, amber = on break, grey = not recording), app name, **info** (what is and isn't recorded) and **settings** (read-only status) icons.
- **CURRENT WORKING TIME:** live h m s counter for today. It counts only while you are punched in and not on a break.
- **PUNCH IN / PUNCH OUT** (toggle), **START BREAK / END BREAK**, **LOG TIME** (form + timesheet history).
- **All breaks duration:** today's total, counting up live during a break.
- **Activity logs (count chip):** number of today's activity logs. Click it (or the list icon bottom right) to browse: a productive/neutral/unproductive/idle bar, top apps, and every log row with time, app, site host, category and duration.
- **Screenshots chip:** `off` by default; when enabled shows today's capture count and the interval.
- **SIGN OUT**, a sync button (badge = items waiting to upload) and a version/copyright footer.

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
npm test                    # 15 tests; verified on Node 18, 20 and 22, incl. real sync against schema.sql in an in-process Postgres
```

Demo mode (no Supabase vars): log in with `deena.s@barm.in`, `chandru.p@barm.in`, `arun.k@barm.in`, `priya.s@barm.in`, `vikram.s@barm.in` or `meera.n@barm.in` and any password. Data never leaves the PC.

Live mode: set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the **anon** key only; never the service-role key). Run `supabase/schema.sql` first and create employees with passwords (see the top-level README).

**Runtime:** Electron 27 bundles Node 18, and the headless mode works on Node 18+. The agent talks to Supabase with plain `fetch` (PostgREST RPC) and deliberately does not use `@supabase/supabase-js`, whose Realtime client needs a native WebSocket (Node 22+) and crashed startup on older runtimes.

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

## Activity logs

An activity log is one stretch in one app (and site host). A new log starts when the app or site changes, when you go idle or come back, and every 5 minutes during a long task (so it syncs while in progress). Logs are written only while punched in and off break, are queued locally and sync to `activity_sessions`. The count in the window is today's logs including the one in progress.

## Screenshots (OFF by default)

Nothing is captured unless **all three** are true:

1. `ENABLE_SCREENSHOTS=true` in the agent's `.env`,
2. `system_config.screenshots_enabled = 'true'` in Supabase (demo mode: not applicable),
3. the employee's department is in `SCREENSHOT_TEAMS` (comma list, `*` = all) or in `system_config.screenshot_teams` (JSON array).

When enabled, the agent captures one screenshot per interval (`SCREENSHOT_INTERVAL_MINUTES`, else `system_config.screenshot_interval_minutes`, else 10) **only while punched in and not on break**. The image is saved under `<data folder>/screenshots/` and pruned after 7 days. **Only metadata** (time, foreground app, file name) is queued and synced to the Supabase `screenshots` table; the server ignores those rows unless the org switch is on. The window shows today's capture count; the settings screen shows why screenshots are on or off.

```bash
# try it with the simulator (writes a 1x1 placeholder image, no display needed)
ENABLE_SCREENSHOTS=true SCREENSHOT_TEAMS='*' SCREENSHOT_INTERVAL_MINUTES=1 npm run simulate
```

**Not implemented, so do not enable for real use yet:** uploading the image to a private Storage bucket (so managers cannot view images; `storage_path` stays null, `uploaded=false`), blur/redaction (`blurred=false`), an employee notice/consent record, and a manager viewer. Real capture uses the optional `screenshot-desktop` package, which was not exercised here (tests inject a fake capturer).

## Security notes

- The local server binds to `127.0.0.1` only, has no CORS, rejects unexpected `Host`/`Origin` headers, and the Electron window runs with `contextIsolation` on and `nodeIntegration` off.
- The session token and unsynced data sit in `state.json` in the user's profile, unencrypted. Another local user with file access could read them.
- Timestamps use the PC clock and are trusted by the server.
