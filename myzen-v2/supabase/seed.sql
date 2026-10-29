-- MyZenV2 Sample Data Seed Script
-- Run this after schema.sql to populate demo data

-- Insert sample employees (Chandru P and Deena Selvakumar + team)
INSERT INTO employees (id, email, name, department, role, status, is_manager) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'chandru.p@barm.in', 'Chandru P', 'Engineering', 'Senior Developer', 'online', false),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'deena.s@barm.in', 'Deena Selvakumar', 'Engineering', 'Full Stack Developer', 'online', false),
  ('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'arun.k@barm.in', 'Arun Kumar', 'AI/ML', 'ML Engineer', 'away', false),
  ('d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a', 'priya.s@barm.in', 'Priya Sharma', 'Design', 'UI/UX Designer', 'online', false),
  ('e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b', 'vikram.s@barm.in', 'Vikram Singh', 'Product', 'Product Manager', 'offline', false),
  ('f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c', 'manager@barm.in', 'Admin Manager', 'Management', 'Manager', 'online', true);

-- October 2026 attendance punches for Chandru P (21 present days)
INSERT INTO attendance_punches (employee_id, punch_type, punch_time) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'in', '2026-10-01 09:00:00+00'),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'out', '2026-10-01 16:00:00+00'),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'in', '2026-10-05 09:00:00+00'),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'out', '2026-10-05 18:00:00+00'),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'in', '2026-10-06 09:00:00+00'),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'out', '2026-10-06 18:00:00+00');

-- October 2026 attendance punches for Deena Selvakumar (23 present days)
INSERT INTO attendance_punches (employee_id, punch_type, punch_time) VALUES
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'in', '2026-10-01 09:08:00+00'),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'out', '2026-10-01 18:16:00+00'),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'in', '2026-10-03 08:49:00+00'),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'out', '2026-10-03 17:38:00+00');

-- Sample daily stats for October 2026
INSERT INTO daily_stats (employee_id, stat_date, online_minutes, active_minutes, productive_minutes, productivity_percentage, present) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2026-10-29', 480, 420, 325, 77.34, true),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', '2026-10-29', 510, 480, 428, 89.01, true),
  ('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', '2026-10-29', 465, 435, 360, 82.76, true),
  ('d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a', '2026-10-29', 445, 410, 340, 82.93, true),
  ('e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b', '2026-10-29', 420, 380, 305, 80.26, true);

-- Sample activity sessions
INSERT INTO activity_sessions (employee_id, start_time, end_time, app_name, category, is_active, duration_ms) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2026-10-29 09:00:00+00', '2026-10-29 13:00:00+00', 'Visual Studio Code', 'productive', true, 14400000),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2026-10-29 13:00:00+00', '2026-10-29 15:00:00+00', 'Chrome', 'productive', true, 7200000),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', '2026-10-29 09:08:00+00', '2026-10-29 13:48:00+00', 'IntelliJ IDEA', 'productive', true, 16800000),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', '2026-10-29 13:48:00+00', '2026-10-29 16:08:00+00', 'Chrome', 'productive', true, 8400000);

-- Sample breaks
INSERT INTO breaks (employee_id, break_start, break_end, duration_minutes, break_type) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2026-10-29 12:00:00+00', '2026-10-29 12:30:00+00', 30, 'lunch'),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', '2026-10-29 12:00:00+00', '2026-10-29 12:45:00+00', 45, 'lunch');

-- Sample timesheet entries
INSERT INTO timesheet_entries (employee_id, entry_date, start_time, end_time, hours, description, entry_type, approved) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2026-10-29', '09:00', '17:00', 8.0, 'Regular workday', 'automatic', true),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', '2026-10-29', '09:08', '18:08', 9.0, 'Regular workday', 'automatic', true);

-- Confirm data
SELECT 'Employees:', COUNT(*) FROM employees;
SELECT 'Attendance Punches:', COUNT(*) FROM attendance_punches;
SELECT 'Daily Stats:', COUNT(*) FROM daily_stats;
SELECT 'Activity Sessions:', COUNT(*) FROM activity_sessions;
SELECT 'Breaks:', COUNT(*) FROM breaks;
SELECT 'Timesheet Entries:', COUNT(*) FROM timesheet_entries;
SELECT 'App Rules:', COUNT(*) FROM app_category_rules;
SELECT 'System Config:', COUNT(*) FROM system_config;
