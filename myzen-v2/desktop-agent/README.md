# MyZen Desktop Agent

The desktop monitoring agent for MyZenV2 productivity suite.

## Features

- **Activity Monitoring**: Tracks active applications and browser URLs
- **Smart Categorization**: Automatically classifies apps as productive, neutral, or unproductive
- **Privacy-First**: No keystroke logging, no screenshots (by default)
- **Local Storage**: All data stored locally in JSON format
- **REST API**: Exposes activity data via HTTP API for portal integration
- **System Tray**: Runs quietly in the background

## Installation

### Windows (Primary Support)

1. Install dependencies:
```bash
npm install
```

2. Run in development:
```bash
npm start
```

3. Build installer:
```bash
npm run build:win
```

### macOS

```bash
npm install
npm run build:mac
```

**Note**: macOS requires accessibility permissions for window tracking.

### Linux

```bash
npm install
npm run build:linux
```

**Note**: Linux support is experimental. Active window detection may require additional setup.

## Usage

### Running the Agent

```bash
npm start
```

The agent will:
- Start monitoring in the background
- Create a system tray icon
- Launch API server on `http://localhost:3001`
- Store data in `data/sessions.json`

### Accessing the Dashboard

Right-click the tray icon → "Open Dashboard"

Or visit: The dashboard opens automatically when you click "Open Dashboard" from the tray.

## API Endpoints

### GET /api/status
Returns agent status and machine ID

### GET /api/stats
Returns today's statistics:
- Online time (minutes)
- Active time (minutes)
- Productive time (minutes)
- Productivity percentage
- All sessions

### GET /api/current
Returns current activity:
- App name
- URL (if browser)
- Category
- Duration

### GET /api/sessions
Returns all today's sessions

### GET /api/config
Returns configuration (productive apps, domains, etc.)

### POST /api/config
Update configuration

## Configuration

Edit `data/config.json` to customize:

- **productiveApps**: Apps considered productive
- **productiveDomains**: URLs considered productive
- **unproductiveDomains**: URLs considered unproductive
- **neutralApps**: Apps considered neutral (e.g., Slack)
- **idleThresholdSeconds**: Time before considering user idle (default: 300)

## Privacy & Data

### What is Tracked
- Active application name
- Browser URL (when applicable)
- Mouse/keyboard activity (boolean only, not content)
- Session timestamps and durations

### What is NOT Tracked
- Keystroke content
- Screenshots (optional, disabled by default)
- Passwords or sensitive input
- Clipboard content
- Microphone or camera

### Data Storage
All data is stored locally in:
- `data/sessions.json` - Activity sessions
- `data/config.json` - Configuration

No data is sent to external servers unless explicitly configured.

## Integration with Portal

The portal can connect to the agent in two modes:

### Mock Mode (Default)
Portal uses seed data when no agent is running.

### Live Mode
Portal connects to `http://localhost:3001` to fetch real-time data from the agent.

To enable live mode in the portal, the agent must be running on the same machine.

## Development

### Project Structure
```
desktop-agent/
├── src/
│   ├── main.js         # Electron main process
│   ├── monitor.js      # Activity monitoring logic
│   ├── server.js       # Express API server
│   └── dashboard.html  # Local dashboard UI
├── data/               # Local data storage
├── package.json
└── README.md
```

### Building

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Output will be in `dist/` directory.

## Troubleshooting

### Windows
- If window detection fails, run as administrator
- Check Windows Defender hasn't blocked the app

### macOS
- Grant accessibility permissions in System Preferences → Security & Privacy → Privacy → Accessibility
- Allow the app to control your computer

### Linux
- Install required dependencies: `libxss1`
- Some desktop environments may require additional configuration

## Future Enhancements

- [ ] Optional screenshot capture (with user consent)
- [ ] Multi-user support
- [ ] Cloud sync (optional)
- [ ] Custom productivity rules
- [ ] Break reminders
- [ ] Focus mode

## License

MIT License - B-Arm India

## Support

For issues or questions, contact the B-Arm development team.
