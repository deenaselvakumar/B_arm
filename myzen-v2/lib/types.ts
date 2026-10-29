export interface Employee {
  id: string
  name: string
  email: string
  department: string
  role: string
  avatar?: string
  status: 'online' | 'offline' | 'away'
}

export interface ProductivityData {
  employeeId: string
  date: string
  onlineTime: number
  activeTime: number
  productiveTime: number
  productivity: number
  presentDays?: number
}

export interface AppUsage {
  employeeId: string
  date: string
  appName: string
  category: 'productive' | 'neutral' | 'unproductive'
  duration: number
  url?: string
}

export interface AttendanceRecord {
  employeeId: string
  date: string
  punchIn: string
  punchOut: string
  totalHours: number
  status: 'present' | 'absent' | 'half-day' | 'leave'
}

export interface DashboardStats {
  totalEmployees: number
  onlineNow: number
  presentToday: number
  avgProductivity: number
  productiveTime: number
  idleTime: number
  unproductiveTime: number
}

export interface ActivitySession {
  timestamp: number
  appName: string
  url?: string
  category: 'productive' | 'neutral' | 'unproductive'
  duration: number
  isActive: boolean
}
