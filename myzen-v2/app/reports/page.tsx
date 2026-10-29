'use client'

import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { mockEmployees, mockProductivityData, mockAppUsage, mockAttendanceData } from '@/lib/mockData'
import { formatDuration } from '@/lib/utils'

type ReportType = 'summary' | 'attendance' | 'productivity' | 'apps'

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('summary')

  const downloadCSV = (data: string[][], filename: string) => {
    const csvContent = data.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const generateSummaryCSV = () => {
    const headers = ['Employee', 'Present Days', 'Online Time', 'Active Time', 'Productive Time', 'Productivity %']
    const rows = mockEmployees.map(emp => {
      const prod = mockProductivityData.find(p => p.employeeId === emp.id)
      return [
        emp.name,
        prod?.presentDays?.toString() || '0',
        prod ? formatDuration(prod.onlineTime * (prod.presentDays || 1)) : '0',
        prod ? formatDuration(prod.activeTime * (prod.presentDays || 1)) : '0',
        prod ? formatDuration(prod.productiveTime * (prod.presentDays || 1)) : '0',
        prod ? `${prod.productivity.toFixed(2)}%` : '0%'
      ]
    })
    downloadCSV([headers, ...rows], 'summary_report_oct2026.csv')
  }

  const generateAttendanceCSV = () => {
    const daysInMonth = 31
    const headers = ['Employee', ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()), 'Total Present', 'Total Absent']
    
    const rows = mockEmployees.map(emp => {
      const attendance = mockAttendanceData.filter(a => a.employeeId === emp.id)
      const dayData = Array.from({ length: daysInMonth }, (_, i) => {
        const date = `2026-10-${(i + 1).toString().padStart(2, '0')}`
        const record = attendance.find(a => a.date === date)
        if (!record) return 'N/A'
        const dayOfWeek = new Date(date).getDay()
        if (dayOfWeek === 0) return 'Weekly off'
        if (record.status === 'present') {
          return `${record.totalHours.toFixed(0)}h ${Math.round((record.totalHours % 1) * 60)}m`
        }
        return 'A'
      })
      const totalPresent = attendance.filter(a => a.status === 'present').length
      const totalAbsent = attendance.filter(a => a.status === 'absent').length
      return [emp.name, ...dayData, totalPresent.toString(), totalAbsent.toString()]
    })
    
    downloadCSV([headers, ...rows], 'monthly_attendance_oct2026.csv')
  }

  const generateProductivityCSV = () => {
    const headers = ['Employee', 'Date', 'Online Time', 'Active Time', 'Productive Time', 'Productivity %']
    const rows = mockEmployees.map(emp => {
      const prod = mockProductivityData.find(p => p.employeeId === emp.id)
      return [
        emp.name,
        '2026-10-29',
        prod ? formatDuration(prod.onlineTime) : '0',
        prod ? formatDuration(prod.activeTime) : '0',
        prod ? formatDuration(prod.productiveTime) : '0',
        prod ? `${prod.productivity.toFixed(2)}%` : '0%'
      ]
    })
    downloadCSV([headers, ...rows], 'productivity_report_oct2026.csv')
  }

  const generateAppsCSV = () => {
    const headers = ['Employee', 'Application', 'Category', 'Duration', 'URL']
    const rows = mockAppUsage.map(usage => {
      const emp = mockEmployees.find(e => e.id === usage.employeeId)
      return [
        emp?.name || '',
        usage.appName,
        usage.category,
        formatDuration(usage.duration),
        usage.url || ''
      ]
    })
    downloadCSV([headers, ...rows], 'apps_urls_report_oct2026.csv')
  }

  const reports = [
    { id: 'summary' as ReportType, label: 'Summary Report', icon: FileText },
    { id: 'attendance' as ReportType, label: 'Monthly Attendance', icon: FileText },
    { id: 'productivity' as ReportType, label: 'Productivity Report', icon: FileText },
    { id: 'apps' as ReportType, label: 'Apps & URLs', icon: FileText },
  ]

  const handleDownload = () => {
    switch (activeReport) {
      case 'summary':
        generateSummaryCSV()
        break
      case 'attendance':
        generateAttendanceCSV()
        break
      case 'productivity':
        generateProductivityCSV()
        break
      case 'apps':
        generateAppsCSV()
        break
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Generate and download detailed reports</p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Download CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              activeReport === report.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <report.icon className={`w-8 h-8 mb-3 ${
              activeReport === report.id ? 'text-blue-600' : 'text-gray-400'
            }`} />
            <h3 className={`font-semibold ${
              activeReport === report.id ? 'text-blue-900' : 'text-gray-900'
            }`}>
              {report.label}
            </h3>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {activeReport === 'summary' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary Report - October 2026</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Present Days</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Online Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Active Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Productive Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Productivity %</th>
                  </tr>
                </thead>
                <tbody>
                  {mockEmployees.map(emp => {
                    const prod = mockProductivityData.find(p => p.employeeId === emp.id)
                    return (
                      <tr key={emp.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium text-gray-900">{emp.name}</td>
                        <td className="py-3 px-4 text-gray-700">{prod?.presentDays || 0}</td>
                        <td className="py-3 px-4 text-gray-700">
                          {prod ? formatDuration(prod.onlineTime * (prod.presentDays || 1)) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {prod ? formatDuration(prod.activeTime * (prod.presentDays || 1)) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {prod ? formatDuration(prod.productiveTime * (prod.presentDays || 1)) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${
                            (prod?.productivity || 0) >= 80 ? 'text-green-600' : 
                            (prod?.productivity || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {prod?.productivity.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'attendance' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Attendance - October 2026</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 sticky left-0 bg-white">Employee</th>
                    {Array.from({ length: 31 }, (_, i) => (
                      <th key={i + 1} className="text-center py-3 px-2 font-semibold text-gray-700">
                        {i + 1}
                      </th>
                    ))}
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {mockEmployees.map(emp => {
                    const attendance = mockAttendanceData.filter(a => a.employeeId === emp.id)
                    const totalPresent = attendance.filter(a => a.status === 'present').length
                    return (
                      <tr key={emp.id} className="border-b border-gray-100">
                        <td className="py-3 px-2 font-medium text-gray-900 sticky left-0 bg-white">
                          {emp.name}
                        </td>
                        {Array.from({ length: 31 }, (_, i) => {
                          const date = `2026-10-${(i + 1).toString().padStart(2, '0')}`
                          const record = attendance.find(a => a.date === date)
                          const dayOfWeek = new Date(date).getDay()
                          
                          return (
                            <td key={i + 1} className="py-3 px-2 text-center">
                              {dayOfWeek === 0 ? (
                                <span className="text-gray-400 text-xs">W</span>
                              ) : record?.status === 'present' ? (
                                <span className="text-green-600 font-medium">
                                  {record.totalHours.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-red-500 font-medium">A</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="py-3 px-2 text-center font-semibold text-gray-900">
                          {totalPresent}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'productivity' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Productivity Report - October 29, 2026</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Online Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Active Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Productive Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Productivity %</th>
                  </tr>
                </thead>
                <tbody>
                  {mockEmployees.map(emp => {
                    const prod = mockProductivityData.find(p => p.employeeId === emp.id)
                    return (
                      <tr key={emp.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium text-gray-900">{emp.name}</td>
                        <td className="py-3 px-4 text-gray-700">{emp.department}</td>
                        <td className="py-3 px-4 text-gray-700">
                          {prod ? formatDuration(prod.onlineTime) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {prod ? formatDuration(prod.activeTime) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {prod ? formatDuration(prod.productiveTime) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${prod?.productivity || 0}%` }}
                              />
                            </div>
                            <span className="font-semibold text-gray-900 min-w-[50px]">
                              {prod?.productivity.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'apps' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Apps & URLs Report - October 29, 2026</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Application</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {mockAppUsage.map((usage, idx) => {
                    const emp = mockEmployees.find(e => e.id === usage.employeeId)
                    return (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium text-gray-900">{emp?.name}</td>
                        <td className="py-3 px-4 text-gray-700">{usage.appName}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            usage.category === 'productive' ? 'bg-green-100 text-green-700' :
                            usage.category === 'neutral' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {usage.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{formatDuration(usage.duration)}</td>
                        <td className="py-3 px-4 text-gray-600">{usage.url || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
