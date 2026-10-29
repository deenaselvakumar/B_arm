-- MyZenV2 Database Schema for Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees/Users table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255), -- For demo; use proper auth in production
  department VARCHAR(100),
  role VARCHAR(100),
  status VARCHAR(20) DEFAULT 'offline', -- online, offline, away
  machine_id VARCHAR(255),
  is_manager BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity sessions from desktop agent
CREATE TABLE activity_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  app_name VARCHAR(255),
  url TEXT,
  category VARCHAR(50), -- productive, neutral, unproductive
  is_active BOOLEAN DEFAULT true,
  duration_ms BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance punches (in/out)
CREATE TABLE attendance_punches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  punch_type VARCHAR(10) NOT NULL, -- in, out
  punch_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255), -- optional: IP, GPS, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Break tracking
CREATE TABLE breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  break_start TIMESTAMP WITH TIME ZONE NOT NULL,
  break_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  break_type VARCHAR(50) DEFAULT 'regular', -- regular, lunch, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manual timesheet entries
CREATE TABLE timesheet_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  hours DECIMAL(5, 2),
  description TEXT,
  entry_type VARCHAR(50) DEFAULT 'manual', -- manual, automatic
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App category rules (configurable productive/neutral/unproductive apps)
CREATE TABLE app_category_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name VARCHAR(255),
  domain VARCHAR(255),
  category VARCHAR(50) NOT NULL, -- productive, neutral, unproductive
  rule_type VARCHAR(20) NOT NULL, -- app, domain
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_app_rule UNIQUE (app_name, rule_type),
  CONSTRAINT unique_domain_rule UNIQUE (domain, rule_type)
);

-- Daily productivity aggregates (for faster queries)
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  online_minutes INTEGER DEFAULT 0,
  active_minutes INTEGER DEFAULT 0,
  productive_minutes INTEGER DEFAULT 0,
  idle_minutes INTEGER DEFAULT 0,
  unproductive_minutes INTEGER DEFAULT 0,
  productivity_percentage DECIMAL(5, 2),
  present BOOLEAN DEFAULT false,
  total_breaks_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_employee_date UNIQUE (employee_id, stat_date)
);

-- Screenshot metadata (optional, OFF by default)
CREATE TABLE screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  session_id UUID REFERENCES activity_sessions(id) ON DELETE CASCADE,
  screenshot_url TEXT NOT NULL, -- Supabase Storage URL
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
  app_name VARCHAR(255),
  is_blur BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  config_type VARCHAR(50), -- boolean, string, number, json
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_activity_sessions_employee_id ON activity_sessions(employee_id);
CREATE INDEX idx_activity_sessions_start_time ON activity_sessions(start_time);
CREATE INDEX idx_attendance_punches_employee_id ON attendance_punches(employee_id);
CREATE INDEX idx_attendance_punches_punch_time ON attendance_punches(punch_time);
CREATE INDEX idx_breaks_employee_id ON breaks(employee_id);
CREATE INDEX idx_breaks_start ON breaks(break_start);
CREATE INDEX idx_timesheet_entries_employee_id ON timesheet_entries(employee_id);
CREATE INDEX idx_timesheet_entries_date ON timesheet_entries(entry_date);
CREATE INDEX idx_daily_stats_employee_id ON daily_stats(employee_id);
CREATE INDEX idx_daily_stats_date ON daily_stats(stat_date);
CREATE INDEX idx_screenshots_employee_id ON screenshots(employee_id);
CREATE INDEX idx_screenshots_captured_at ON screenshots(captured_at);

-- Insert default app category rules
INSERT INTO app_category_rules (app_name, rule_type, category) VALUES
  ('Visual Studio Code', 'app', 'productive'),
  ('IntelliJ IDEA', 'app', 'productive'),
  ('PyCharm', 'app', 'productive'),
  ('Sublime Text', 'app', 'productive'),
  ('Figma', 'app', 'productive'),
  ('Adobe XD', 'app', 'productive'),
  ('Slack', 'app', 'neutral'),
  ('Teams', 'app', 'neutral'),
  ('Discord', 'app', 'neutral'),
  ('Zoom', 'app', 'neutral'),
  ('Mail', 'app', 'neutral'),
  ('Outlook', 'app', 'neutral');

INSERT INTO app_category_rules (domain, rule_type, category) VALUES
  ('github.com', 'domain', 'productive'),
  ('gitlab.com', 'domain', 'productive'),
  ('stackoverflow.com', 'domain', 'productive'),
  ('docs.microsoft.com', 'domain', 'productive'),
  ('developer.mozilla.org', 'domain', 'productive'),
  ('facebook.com', 'domain', 'unproductive'),
  ('twitter.com', 'domain', 'unproductive'),
  ('instagram.com', 'domain', 'unproductive'),
  ('youtube.com', 'domain', 'unproductive'),
  ('reddit.com', 'domain', 'unproductive');

-- Insert default system config
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
  ('screenshots_enabled', 'false', 'boolean', 'Enable screenshot capture'),
  ('screenshot_interval_minutes', '10', 'number', 'Screenshot capture interval'),
  ('idle_threshold_seconds', '300', 'number', 'Seconds before considering user idle'),
  ('blur_screenshots', 'true', 'boolean', 'Apply blur to screenshots by default');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheet_entries_updated_at BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_stats_updated_at BEFORE UPDATE ON daily_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - adjust for your auth setup)
-- Allow employees to see their own data
CREATE POLICY "Employees can view own data" ON employees
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Employees can view own sessions" ON activity_sessions
  FOR SELECT USING (auth.uid()::text = employee_id::text);

CREATE POLICY "Employees can view own punches" ON attendance_punches
  FOR SELECT USING (auth.uid()::text = employee_id::text);

CREATE POLICY "Employees can insert own punches" ON attendance_punches
  FOR INSERT WITH CHECK (auth.uid()::text = employee_id::text);

CREATE POLICY "Employees can view own breaks" ON breaks
  FOR SELECT USING (auth.uid()::text = employee_id::text);

CREATE POLICY "Employees can insert own breaks" ON breaks
  FOR INSERT WITH CHECK (auth.uid()::text = employee_id::text);

CREATE POLICY "Employees can update own breaks" ON breaks
  FOR UPDATE USING (auth.uid()::text = employee_id::text);

CREATE POLICY "Employees can view own timesheet" ON timesheet_entries
  FOR SELECT USING (auth.uid()::text = employee_id::text);

CREATE POLICY "Employees can insert own timesheet" ON timesheet_entries
  FOR INSERT WITH CHECK (auth.uid()::text = employee_id::text);

CREATE POLICY "Employees can view own stats" ON daily_stats
  FOR SELECT USING (auth.uid()::text = employee_id::text);

-- Managers can see all data (add is_manager check when implementing auth)
-- For now, allow service role to do everything
