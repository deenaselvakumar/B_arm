'use client'

import { useState } from 'react'
import { 
  User, 
  Mail, 
  Briefcase, 
  Calendar, 
  TrendingUp, 
  Clock,
  Activity,
  Monitor
} from 'lucide-react'
import { 
  mockEmployees, 
  mockProductivityData, 
  mockAppUsage, 
  getAttendanceByEmployeeId 
} from '@/lib/mockData'
import { formatDuration } from '@/lib/utils'

type TabType = 'overview' | 'attendance' | 'productivity' | 'apps' | 'performance' | 'settings'

export default function UserDetailPage() {
  const [selectedEmployee, setSelectedEmployee] = useState(mockEmployees[0])
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const productivity = mockProductivityData.find(p => p.employeeId === selectedEmployee.id)
  const appUsage = mockAppUsage.filter(a => a.employeeId === selectedEmployee.id)
  const attendance = getAttendanceByEmployeeId(selectedEmployee.id)
  const presentDays = attendance.filter(a => a.status === 'present').length

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'apps', label: 'Apps & URLs' },
    { id: 'performance', label: 'Performance Summary' },
    { id: 'settings', label: 'Settings' },
  ]

  const productiveApps = appUsage.filter(a => a.category === 'productive')
  const unproductiveApps = appUsage.filter(a => a.category === 'unproductive')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Detail</h1>
        <p className="text-gray-600 mt-1">View detailed information about team members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Team Members</h3>
            <div className="space-y-2">
              {mockEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedEmployee.id === emp.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      emp.status === 'online' ? 'bg-green-100' : 
                      emp.status === 'away' ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}>
                      <User className={`w-5 h-5 ${
                        emp.status === 'online' ? 'text-green-600' : 
                        emp.status === 'away' ? 'text-yellow-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{emp.name}</p>
                      <p className="text-xs text-gray-500 truncate">{emp.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                  <p className="text-gray-600">{selectedEmployee.role}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Mail className="w-4 h-4" />
                      <span>{selectedEmployee.email}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Briefcase className="w-4 h-4" />
                      <span>{selectedEmployee.department}</span>
                    </div>
                  </div>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedEmployee.status === 'online'
                    ? 'bg-green-100 text-green-800'
                    : selectedEmployee.status === 'away'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {selectedEmployee.status}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-4 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Present Days</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{presentDays}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Productivity</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{productivity?.productivity.toFixed(1)}%</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Online Time</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">
                        {productivity ? formatDuration(productivity.onlineTime) : '-'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Activity className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">Active Time</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-900">
                        {productivity ? formatDuration(productivity.activeTime) : '-'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
                    <div className="space-y-3">
                      {appUsage.slice(0, 5).map((usage, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Monitor className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{usage.appName}</p>
                              {usage.url && <p className="text-sm text-gray-500">{usage.url}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatDuration(usage.duration)}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              usage.category === 'productive' ? 'bg-green-100 text-green-700' :
                              usage.category === 'neutral' ? 'bg-gray-100 text-gray-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {usage.category}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
                        {day}
                      </div>
                    ))}
                    {attendance.slice(0, 31).map((record, idx) => {
                      const date = new Date(record.date)
                      const day = date.getDate()
                      const isWeekend = date.getDay() === 0
                      
                      return (
                        <div
                          key={idx}
                          className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${
                            isWeekend ? 'bg-gray-100 text-gray-400' :
                            record.status === 'present' ? 'bg-green-100 text-green-900' :
                            'bg-red-100 text-red-900'
                          }`}
                        >
                          <span className="font-semibold">{day}</span>
                          {!isWeekend && record.status === 'present' && (
                            <span className="text-xs">{record.totalHours.toFixed(1)}h</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'productivity' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Breakdown</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Productive Time</span>
                          <span className="text-sm font-medium text-gray-900">
                            {productivity ? formatDuration(productivity.productiveTime) : '-'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full"
                            style={{ width: `${(productivity?.productiveTime || 0) / (productivity?.onlineTime || 1) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Neutral Time</span>
                          <span className="text-sm font-medium text-gray-900">
                            {productivity ? formatDuration(productivity.activeTime - productivity.productiveTime) : '-'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-yellow-500 h-3 rounded-full"
                            style={{ 
                              width: `${((productivity?.activeTime || 0) - (productivity?.productiveTime || 0)) / (productivity?.onlineTime || 1) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Idle Time</span>
                          <span className="text-sm font-medium text-gray-900">
                            {productivity ? formatDuration(productivity.onlineTime - productivity.activeTime) : '-'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gray-400 h-3 rounded-full"
                            style={{ 
                              width: `${((productivity?.onlineTime || 0) - (productivity?.activeTime || 0)) / (productivity?.onlineTime || 1) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'apps' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Productive Applications</h3>
                    <div className="space-y-2">
                      {productiveApps.map((app, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="font-medium text-gray-900">{app.appName}</span>
                          <span className="text-green-700 font-medium">{formatDuration(app.duration)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {unproductiveApps.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Unproductive Applications</h3>
                      <div className="space-y-2">
                        {unproductiveApps.map((app, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div>
                              <span className="font-medium text-gray-900">{app.appName}</span>
                              {app.url && <p className="text-sm text-gray-500">{app.url}</p>}
                            </div>
                            <span className="text-red-700 font-medium">{formatDuration(app.duration)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'performance' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">October 2026 Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Present Days</p>
                        <p className="text-2xl font-bold text-gray-900">{presentDays} days</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Average Productivity</p>
                        <p className="text-2xl font-bold text-gray-900">{productivity?.productivity.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Online Time</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {productivity ? formatDuration(productivity.onlineTime * presentDays) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Productive Time</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {productivity ? formatDuration(productivity.productiveTime * presentDays) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="text-center py-12 text-gray-500">
                  <p>Settings are read-only in this version</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
