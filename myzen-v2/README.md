# MyZenV2 - Productivity Suite

An internal We360-style productivity monitoring system for B-Arm (India), consisting of a **desktop application** for employees and a **web portal** for managers.

## 🎯 Architecture Overview

### Desktop Application (Employee-Facing)
**Installed on each employee's computer**

Employees download and install the desktop agent, which provides:
- **Login** with employee credentials
- **Punch In/Out** - Clock in and out for the day
- **Break Management** - Start and end breaks
- **Manual Time Logging** - Add manual time entries if needed
- **Background Activity Monitoring** - Tracks apps and URLs for productivity insights
- **Auto-sync** - All data syncs to Supabase (or local storage in demo mode)

### Web Portal (Manager-Facing)
**Runs as a web application (Next.js)**

Managers access via browser to view:
- **Dashboard** - Team productivity metrics and trends
- **User Detail** - Individual employee insights and timesheets
- **Reports** - Summary, Attendance, Productivity, Apps/URLs with CSV export
- **Real Time** - Live activity monitoring
- **Analytics** - Advanced insights (placeholder)

### Shared Database
**Supabase (PostgreSQL)**
- Centralizes all data from desktop agents
- Powers manager reports and dashboards
- Falls back to mock data when not configured

## 🚀 Quick Start

### For Employees: Desktop Agent

#### 1. Download & Install
```bash
cd desktop-agent
npm install
```

#### 2. Configure (Optional - for Supabase sync)
Copy `.env.example` to `.env` and add Supabase credentials:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

#### 3. Run the Agent
```bash
npm start
```

#### 4. Login & Punch
- Desktop window opens automatically
- Login with your employee credentials
- Click **Punch In** to start your workday
- Use **Start Break** / **End Break** as needed
- Click **Punch Out** when done

**Demo Accounts:**
- chandru.p@barm.in (password: any)
- deena.s@barm.in (password: any)

### For Managers: Web Portal

#### 1. Install
```bash
cd myzen-v2  # (parent directory)
npm install
```

#### 2. Configure Supabase (Optional)
Copy `.env.example` to `.env.local` and add:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 3. Run Portal
```bash
# Development
npm run dev

# Production
npm run build && npm start
```

Access at: `http://localhost:3000`

**Demo Login:** Any credentials accepted

## 📊 Data Flow

```
Employee Desktop Agent
    ↓
  Login + Punch In/Out + Break + Activity Tracking
    ↓
  Supabase Database (PostgreSQL)
    ↓
Manager Web Portal
    ↓
  Dashboard + Reports + User Detail
```

## 🗄️ Database Setup

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com)
- Create a new project
- Copy your project URL and keys

### 2. Run Schema Migration
In Supabase SQL Editor, run:
```bash
supabase/schema.sql
```

### 3. Seed Sample Data (Optional)
Run in Supabase SQL Editor:
```bash
supabase/seed.sql
```

### 4. Configure Applications
Add environment variables to both:
- Desktop agent: `desktop-agent/.env`
- Web portal: `.env.local`

## 🔐 Privacy & Security

### What is Tracked
- **Punch in/out times** - Employee attendance
- **Break duration** - Rest period tracking
- **Active application name** - What software is being used
- **Browser URLs** - Web activity (when browser is active)
- **Activity status** - Active vs idle (boolean only, not content)

### What is NOT Tracked
- ❌ Keystroke content
- ❌ Screenshots (OFF by default; configurable)
- ❌ Passwords or sensitive input
- ❌ Clipboard content
- ❌ Microphone or camera

### Screenshots (Optional Feature)
**Default: OFF**

Can be enabled per-team by setting in agent `.env`:
```bash
ENABLE_SCREENSHOTS=true
SCREENSHOT_INTERVAL_MINUTES=10
BLUR_SCREENSHOTS=true
```

When enabled:
- Screenshots captured at intervals
- Stored locally or synced to Supabase Storage
- Can be blurred automatically
- Clear privacy disclosure required

## 📱 Operating System Support

| OS | Desktop Agent | Web Portal |
|----|---------------|------------|
| **Windows** | ✅ Full Support | ✅ Any Browser |
| **macOS** | ⚠️ Experimental | ✅ Any Browser |
| **Linux** | ⚠️ Experimental | ✅ Any Browser |

**macOS Note:** Requires accessibility permissions  
**Linux Note:** May require additional window detection setup

## 🎨 Features by Role

### Employee Features (Desktop Agent)
- ✅ Secure login with employee credentials
- ✅ One-click punch in/out
- ✅ Break start/end tracking
- ✅ Manual time entry (for missed punches)
- ✅ Live productivity stats
- ✅ Today's summary (hours, productivity, breaks)
- ✅ Runs in system tray
- ✅ Auto-sync to Supabase

### Manager Features (Web Portal)
- ✅ Team dashboard with KPIs
- ✅ Productivity trends and charts
- ✅ Individual employee detail pages
- ✅ Timesheet and attendance calendar
- ✅ CSV report export
- ✅ Real-time activity feed
- ✅ Apps & URLs breakdown
- ✅ Performance summaries

## 🛠️ Tech Stack

**Desktop Agent:**
- Electron (cross-platform app framework)
- Node.js (runtime)
- Express (REST API server)
- active-win (window detection)
- screenshot-desktop (optional screenshots)
- @supabase/supabase-js (database sync)

**Web Portal:**
- Next.js 14 (React framework with App Router)
- TypeScript (type safety)
- Tailwind CSS (styling)
- Recharts (charts and graphs)
- Lucide React (icons)
- @supabase/supabase-js (database client)

## 📋 Common Workflows

### Employee: Daily Routine
1. **Morning:** Open MyZen Agent → Login → Punch In
2. **Break:** Click "Start Break" → Take break → Click "End Break"
3. **Evening:** Click "Punch Out" → Close agent (keeps monitoring)

### Manager: Check Team Status
1. Open web portal: `http://localhost:3000`
2. Login with manager credentials
3. View Dashboard for team overview
4. Click employee name for detailed insights
5. Go to Reports → Download CSV for analysis

### Admin: Setup New Employee
1. Add employee to Supabase `employees` table
2. Provide download link for desktop agent
3. Share employee credentials
4. Employee installs and logs in
5. Attendance + monitoring starts automatically

## 🔧 Troubleshooting

### Desktop Agent Issues

**Agent won't start:**
- Check Node.js is installed: `node --version`
- Reinstall dependencies: `npm install`
- Check logs in terminal

**Can't login:**
- Verify Supabase connection (if configured)
- Try demo accounts (works offline)
- Check employee exists in database

**Activity not tracked:**
- Windows: Run as administrator
- macOS: Grant accessibility permissions
- Linux: Check window detection library

### Web Portal Issues

**Build fails:**
- Run `npm install` to install dependencies
- Check Node.js version (16+ required)
- Clear `.next` folder and rebuild

**No data showing:**
- Check Supabase environment variables
- Verify schema is applied
- Ensure employees have synced data
- Try mock mode (remove Supabase env vars)

## 📖 Documentation

Detailed documentation available in:
- `/desktop-agent/README.md` - Desktop agent setup and API
- `/supabase/schema.sql` - Database schema
- `/supabase/seed.sql` - Sample data script

## 🚢 Deployment

### Desktop Agent Distribution
1. Build installers: `npm run build:win` (or :mac, :linux)
2. Distribute installers to employees
3. Provide setup instructions
4. Configure Supabase connection

### Web Portal Hosting
Deploy to any Node.js host:
- Vercel (recommended for Next.js)
- Netlify
- AWS / Google Cloud / Azure
- Self-hosted with PM2

Set environment variables on hosting platform.

## 🔄 Next Steps

**Immediate:**
- [ ] Deploy web portal to production
- [ ] Distribute desktop agent to team
- [ ] Add real authentication (B-Arm SSO)
- [ ] Set up automated backups

**Future:**
- [ ] Mobile app for remote punch
- [ ] Advanced analytics and predictions
- [ ] Custom productivity rules per department
- [ ] Integration with HR systems
- [ ] Multi-language support

## 📞 Support

For issues or questions, contact the B-Arm development team.

---

**MyZenV2** v0.1 - Employee Productivity & Attendance Platform
