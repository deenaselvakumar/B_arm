import { Employee, ProductivityData, AppUsage, AttendanceRecord } from './types'

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Chandru P',
    email: 'chandru.p@barm.in',
    department: 'Engineering',
    role: 'Senior Developer',
    status: 'online',
  },
  {
    id: '2',
    name: 'Deena Selvakumar',
    email: 'deena.s@barm.in',
    department: 'Engineering',
    role: 'Full Stack Developer',
    status: 'online',
  },
  {
    id: '3',
    name: 'Arun Kumar',
    email: 'arun.k@barm.in',
    department: 'AI/ML',
    role: 'ML Engineer',
    status: 'away',
  },
  {
    id: '4',
    name: 'Priya Sharma',
    email: 'priya.s@barm.in',
    department: 'Design',
    role: 'UI/UX Designer',
    status: 'online',
  },
  {
    id: '5',
    name: 'Vikram Singh',
    email: 'vikram.s@barm.in',
    department: 'Product',
    role: 'Product Manager',
    status: 'offline',
  },
]

export const mockProductivityData: ProductivityData[] = [
  {
    employeeId: '1',
    date: '2026-10-29',
    onlineTime: 480,
    activeTime: 420,
    productiveTime: 325,
    productivity: 77.34,
    presentDays: 21,
  },
  {
    employeeId: '2',
    date: '2026-10-29',
    onlineTime: 510,
    activeTime: 480,
    productiveTime: 428,
    productivity: 89.01,
    presentDays: 23,
  },
  {
    employeeId: '3',
    date: '2026-10-29',
    onlineTime: 465,
    activeTime: 435,
    productiveTime: 360,
    productivity: 82.76,
    presentDays: 22,
  },
  {
    employeeId: '4',
    date: '2026-10-29',
    onlineTime: 445,
    activeTime: 410,
    productiveTime: 340,
    productivity: 82.93,
    presentDays: 20,
  },
  {
    employeeId: '5',
    date: '2026-10-29',
    onlineTime: 420,
    activeTime: 380,
    productiveTime: 305,
    productivity: 80.26,
    presentDays: 19,
  },
]

export const mockAppUsage: AppUsage[] = [
  { employeeId: '1', date: '2026-10-29', appName: 'Visual Studio Code', category: 'productive', duration: 240, url: undefined },
  { employeeId: '1', date: '2026-10-29', appName: 'Chrome', category: 'productive', duration: 120, url: 'github.com' },
  { employeeId: '1', date: '2026-10-29', appName: 'Slack', category: 'neutral', duration: 45, url: undefined },
  { employeeId: '1', date: '2026-10-29', appName: 'Chrome', category: 'unproductive', duration: 30, url: 'youtube.com' },
  
  { employeeId: '2', date: '2026-10-29', appName: 'IntelliJ IDEA', category: 'productive', duration: 280, url: undefined },
  { employeeId: '2', date: '2026-10-29', appName: 'Chrome', category: 'productive', duration: 140, url: 'stackoverflow.com' },
  { employeeId: '2', date: '2026-10-29', appName: 'Teams', category: 'neutral', duration: 50, url: undefined },
  
  { employeeId: '3', date: '2026-10-29', appName: 'PyCharm', category: 'productive', duration: 220, url: undefined },
  { employeeId: '3', date: '2026-10-29', appName: 'Jupyter Notebook', category: 'productive', duration: 140, url: undefined },
  { employeeId: '3', date: '2026-10-29', appName: 'Chrome', category: 'neutral', duration: 60, url: 'arxiv.org' },
  
  { employeeId: '4', date: '2026-10-29', appName: 'Figma', category: 'productive', duration: 260, url: undefined },
  { employeeId: '4', date: '2026-10-29', appName: 'Adobe XD', category: 'productive', duration: 80, url: undefined },
  { employeeId: '4', date: '2026-10-29', appName: 'Chrome', category: 'productive', duration: 70, url: 'dribbble.com' },
]

const generateAttendanceForEmployee = (employeeId: string, presentDays: number[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = []
  const daysInOctober = 31
  
  for (let day = 1; day <= daysInOctober; day++) {
    const date = `2026-10-${day.toString().padStart(2, '0')}`
    const dayOfWeek = new Date(date).getDay()
    
    if (dayOfWeek === 0) {
      continue
    }
    
    const isPresent = presentDays.includes(day)
    
    if (isPresent) {
      const hours = 7 + Math.random() * 3
      const punchIn = `09:${Math.floor(Math.random() * 30).toString().padStart(2, '0')}`
      const punchOutHour = 9 + Math.floor(hours)
      const punchOutMin = Math.floor((hours % 1) * 60)
      const punchOut = `${punchOutHour.toString().padStart(2, '0')}:${punchOutMin.toString().padStart(2, '0')}`
      
      records.push({
        employeeId,
        date,
        punchIn,
        punchOut,
        totalHours: hours,
        status: 'present',
      })
    } else {
      records.push({
        employeeId,
        date,
        punchIn: '-',
        punchOut: '-',
        totalHours: 0,
        status: 'absent',
      })
    }
  }
  
  return records
}

export const mockAttendanceData: AttendanceRecord[] = [
  ...generateAttendanceForEmployee('1', [1, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 26, 27, 28, 29]),
  ...generateAttendanceForEmployee('2', [1, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 26, 27, 28, 29]),
  ...generateAttendanceForEmployee('3', [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 26, 27]),
  ...generateAttendanceForEmployee('4', [1, 2, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 26, 27]),
  ...generateAttendanceForEmployee('5', [1, 2, 3, 5, 6, 7, 8, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27, 28]),
]

export const getEmployeeById = (id: string) => mockEmployees.find(emp => emp.id === id)
export const getProductivityByEmployeeId = (id: string) => 
  mockProductivityData.find(data => data.employeeId === id)
export const getAppUsageByEmployeeId = (id: string) => 
  mockAppUsage.filter(usage => usage.employeeId === id)
export const getAttendanceByEmployeeId = (id: string) => 
  mockAttendanceData.filter(att => att.employeeId === id)
