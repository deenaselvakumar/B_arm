'use client'

import { Users, TrendingUp, Clock, Activity } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts'
import { mockEmployees, mockProductivityData, mockAppUsage } from '@/lib/mockData'
import { formatDuration } from '@/lib/utils'

export default function DashboardPage() {
  const onlineEmployees = mockEmployees.filter(emp => emp.status === 'online' || emp.status === 'away').length
  const totalEmployees = mockEmployees.length
  const presentToday = mockProductivityData.length
  const avgProductivity = mockProductivityData.reduce((sum, data) => sum + data.productivity, 0) / mockProductivityData.length

  const totalProductiveTime = mockProductivityData.reduce((sum, data) => sum + data.productiveTime, 0)
  const totalActiveTime = mockProductivityData.reduce((sum, data) => sum + data.activeTime, 0)
  const totalIdleTime = mockProductivityData.reduce((sum, data) => sum + (data.onlineTime - data.activeTime), 0)
  const totalUnproductiveTime = mockProductivityData.reduce((sum, data) => sum + (data.activeTime - data.productiveTime), 0)

  const productivityBreakdown = [
    { name: 'Productive', value: totalProductiveTime, color: '#10b981' },
    { name: 'Idle', value: totalIdleTime, color: '#f59e0b' },
    { name: 'Unproductive', value: totalUnproductiveTime, color: '#ef4444' },
  ]

  const topApps = mockAppUsage
    .reduce((acc, usage) => {
      const existing = acc.find(item => item.name === usage.appName)
      if (existing) {
        existing.duration += usage.duration
      } else {
        acc.push({ name: usage.appName, duration: usage.duration })
      }
      return acc
    }, [] as { name: string; duration: number }[])
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 8)

  const productivityTrend = [
    { day: 'Mon', productivity: 75 },
    { day: 'Tue', productivity: 82 },
    { day: 'Wed', productivity: 78 },
    { day: 'Thu', productivity: 85 },
    { day: 'Fri', productivity: avgProductivity },
  ]

  const stats = [
    {
      title: 'Online Now',
      value: onlineEmployees,
      subtitle: `of ${totalEmployees} employees`,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Avg Productivity',
      value: `${avgProductivity.toFixed(1)}%`,
      subtitle: 'across all users',
      icon: TrendingUp,
      color: 'bg-blue-500',
    },
    {
      title: 'Present Today',
      value: presentToday,
      subtitle: `of ${totalEmployees} employees`,
      icon: Activity,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Active Time',
      value: formatDuration(totalActiveTime),
      subtitle: 'today',
      icon: Clock,
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Productivity Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={productivityTrend}>
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="productivity" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Breakdown</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={productivityBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {productivityBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatDuration(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-6 mt-4">
            {productivityBreakdown.map((item) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Applications</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topApps}>
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip formatter={(value: number) => formatDuration(value)} />
            <Bar dataKey="duration" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Online Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Productivity</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Present Days</th>
              </tr>
            </thead>
            <tbody>
              {mockEmployees.map((emp) => {
                const productivity = mockProductivityData.find(p => p.employeeId === emp.id)
                return (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{emp.name}</p>
                        <p className="text-sm text-gray-500">{emp.role}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emp.status === 'online'
                            ? 'bg-green-100 text-green-800'
                            : emp.status === 'away'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {productivity ? formatDuration(productivity.onlineTime) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${productivity?.productivity || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {productivity?.productivity.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {productivity?.presentDays || 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
