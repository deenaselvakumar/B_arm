# MyZenV2 - Productivity Suite

An internal We360-style productivity monitoring system for B-Arm (India), consisting of a web portal for managers and a desktop agent for activity tracking.

## 🎯 Overview

MyZenV2 provides comprehensive productivity insights through:

1. **Manager Web Portal** - Next.js dashboard for viewing team productivity, attendance, and detailed reports
2. **Desktop Monitor Agent** - Electron-based background agent that tracks application usage and activity

## 🏗️ Architecture

```
MyZenV2/
├── Portal (Next.js)          → Manager dashboard & reports
│   ├── Dashboard             → Overview metrics & charts
│   ├── Real Time             → Live activity monitoring
│   ├── User Detail           → Individual employee insights
│   ├── Reports               → Summary, Attendance, Productivity, Apps
│   └── Analytics             → Advanced insights (placeholder)
│
└── Desktop Agent (Electron)  → Background monitoring
    ├── Activity Tracker      → App & URL monitoring
    ├── REST API              → Data exposure
    └── Local Storage         → Privacy-first data storage
```

### Data Flow

```
Desktop Agent → Monitors Activity → Local JSON Storage → REST API (localhost:3001)
                                                              ↓
Portal → Mock Data (default) OR Live Data (when agent running) → Dashboard UI
```

## 🚀 Quick Start

### Portal Setup

```bash
cd myzen-v2

# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build
npm start
```

Access at: `http://localhost:3000`

**Demo Login**: Any credentials accepted (demo mode)

### Desktop Agent Setup

```bash
cd desktop-agent

# Install dependencies
npm install

# Run agent
npm start
```

The agent runs in the system tray with API at `http://localhost:3001`

## 📊 Portal Features

### Dashboard
- Online employee count
- Average productivity metrics
- Present today statistics
- Productivity trends (weekly)
- Time breakdown (productive/idle/unproductive)
- Top applications chart
- Team overview table

### User Detail
- Employee selection sidebar
- Multiple tabs:
  - **Overview**: Quick stats and recent activity
  - **Attendance**: Calendar view with daily hours
  - **Productivity**: Breakdown by category
  - **Apps & URLs**: Categorized application usage
  - **Performance Summary**: Monthly aggregates
  - **Settings**: Read-only configuration

### Reports (CSV Export)
- **Summary Report**: Present days, online/active/productive time, productivity %
- **Monthly Attendance**: Day-by-day attendance grid for October 2026
- **Productivity Report**: Daily productivity metrics per employee
- **Apps & URLs**: Detailed application usage with categories

### Real Time
- Live activity feed
- Current application per employee
- Real-time productivity tracking
- Auto-refresh every 5 seconds

### Analytics
- Placeholder for future advanced features

## 🖥️ Desktop Agent Features

### Monitoring
- Tracks foreground application name
- Captures browser URLs (Chrome, Firefox, Safari, Edge)
- Detects active vs idle time (keyboard/mouse activity)
- Smart categorization:
  - **Productive**: IDEs, design tools, development sites
  - **Neutral**: Communication apps (Slack, Teams)
  - **Unproductive**: Social media, entertainment

### Privacy
- **No keystroke logging** - only activity detection
- **No screenshots** - off by default
- **Local storage only** - data stays on device
- **Configurable rules** - customize app categories

### API Endpoints
- `GET /api/status` - Agent status
- `GET /api/stats` - Today's statistics
- `GET /api/current` - Current activity
- `GET /api/sessions` - Session history
- `GET /api/config` - Configuration
- `POST /api/config` - Update config

## 📱 Operating System Support

| OS      | Status              | Notes                                    |
|---------|---------------------|------------------------------------------|
| Windows | ✅ Fully Supported   | Primary development target               |
| macOS   | ⚠️ Experimental     | Requires accessibility permissions       |
| Linux   | ⚠️ Experimental     | May need additional setup                |

## 🎨 Tech Stack

### Portal
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date handling**: date-fns

### Desktop Agent
- **Framework**: Electron
- **Runtime**: Node.js
- **Window Detection**: active-win
- **API Server**: Express
- **Storage**: JSON files

## 📦 Sample Data

Includes realistic seed data for:
- **Chandru P** - 21 present days, 77.34% productivity
- **Deena Selvakumar** - 23 present days, 89.01% productivity
- Plus 3 fictional B-Arm AI team members

Data sourced from provided October 2026 CSVs in `uploads/`.

## 🔐 Security & Privacy

### Agent Privacy Commitments
- No keystroke content captured
- No screenshots by default
- No microphone or camera access
- No clipboard monitoring
- Data stored locally only
- Optional cloud sync (not implemented)

### Portal Authentication
- Demo mode: accepts any credentials
- Production: integrate with B-Arm SSO/Auth system

## 🛠️ Configuration

### Portal
Edit `.env.local` (create if needed):
```env
NEXT_PUBLIC_AGENT_API_URL=http://localhost:3001
NEXT_PUBLIC_MODE=demo  # or 'live'
```

### Desktop Agent
Edit `desktop-agent/data/config.json`:
```json
{
  "productiveApps": ["Visual Studio Code", "Figma", ...],
  "productiveDomains": ["github.com", "stackoverflow.com", ...],
  "unproductiveDomains": ["facebook.com", "youtube.com", ...],
  "neutralApps": ["Slack", "Teams", ...],
  "idleThresholdSeconds": 300
}
```

## 📈 Next Steps

### Immediate
- [ ] Real authentication system
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Agent-to-portal live data sync
- [ ] User management

### Future
- [ ] Optional screenshots with consent
- [ ] Advanced analytics
- [ ] Break reminders
- [ ] Focus mode
- [ ] Mobile app
- [ ] Team comparisons
- [ ] Productivity coaching

## 🧪 Testing

### Portal
```bash
npm run dev
# Visit http://localhost:3000
# Login with any credentials
# Explore dashboard, user detail, reports
```

### Agent
```bash
cd desktop-agent
npm start
# Check system tray icon
# Open dashboard from tray menu
# Visit http://localhost:3001/api/stats
```

### Integration Test
1. Start the agent
2. Start the portal
3. Work in various applications
4. Check real-time feed updates
5. Download CSV reports

## 📝 License

MIT License - B-Arm (India)

## 👥 Credits

Built for B-Arm (India) internal use.

**Original Branding**: MyZenV2 is an original brand - no We360 trademarks or logos used.

## 📞 Support

For issues or feature requests, contact the B-Arm development team.

---

**MyZenV2** v0.1 - Your Team's Productivity Companion
