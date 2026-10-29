'use client'

import { useState, useEffect } from 'react'
import { Activity, Monitor, Clock, Circle } from 'lucide-react'
import { mockEmployees, mockProductivityData } from '@/lib/mockData'
import { formatDuration } from '@/lib/utils'

export default function RealTimePage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [liveActivities, setLiveActivities] = useState<Array<{
    employeeId: string
    app: string
    url?: string
    duration: number
  }>>([])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const activities = mockEmployees
      .filter(emp => emp.status === 'online')
      .map(emp => ({
        employeeId: emp.id,
        app: ['Visual Studio Code', 'Chrome', 'Slack', 'IntelliJ IDEA', 'Figma'][Math.floor(Math.random() * 5)],
        url: Math.random() > 0.5 ? 'github.com' : undefined,
        duration: Math.floor(Math.random() * 30) + 1,
      }))
    setLiveActivities(activities)

    const interval = setInterval(() => {
      const newActivities = mockEmployees
        .filter(emp => emp.status === 'online')
        .map(emp => ({
          employeeId: emp.id,
          app: ['Visual Studio Code', 'Chrome', 'Slack', 'IntelliJ IDEA', 'Figma'][Math.floor(Math.random() * 5)],
          url: Math.random() > 0.5 ? 'github.com' : undefined,
          duration: Math.floor(Math.random() * 30) + 1,
        }))
      setLiveActivities(newActivities)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const onlineEmployees = mockEmployees.filter(emp => emp.status === 'online')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real Time Activity</h1>
          <p className="text-gray-600 mt-1">Monitor live employee activity</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="font-mono text-lg font-semibold text-gray-900">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Online Now</p>
              <p className="text-4xl font-bold text-green-700 mt-2">{onlineEmployees.length}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Active Sessions</p>
              <p className="text-4xl font-bold text-blue-700 mt-2">{liveActivities.length}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Monitor className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900">Avg Productivity</p>
              <p className="text-4xl font-bold text-purple-700 mt-2">
                {(mockProductivityData.reduce((sum, p) => sum + p.productivity, 0) / mockProductivityData.length).toFixed(1)}%
              </p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Live Activity Feed</h2>
          <div className="flex items-center space-x-2">
            <Circle className="w-3 h-3 text-green-500 fill-green-500 animate-pulse" />
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>

        <div className="space-y-4">
          {onlineEmployees.map((emp) => {
            const activity = liveActivities.find(a => a.employeeId === emp.id)
            const productivity = mockProductivityData.find(p => p.employeeId === emp.id)
            
            return (
              <div key={emp.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                      <p className="text-sm text-gray-600">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Current App</p>
                      <p className="font-medium text-gray-900">{activity?.app || 'Idle'}</p>
                      {activity?.url && (
                        <p className="text-xs text-gray-500">{activity.url}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900">{activity?.duration || 0}m</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Today&apos;s Productivity</p>
                      <p className="font-semibold text-blue-600">
                        {productivity?.productivity.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Online: {productivity ? formatDuration(productivity.onlineTime) : '-'}
                    </span>
                    <span className="text-gray-600">
                      Active: {productivity ? formatDuration(productivity.activeTime) : '-'}
                    </span>
                    <span className="text-gray-600">
                      Productive: {productivity ? formatDuration(productivity.productiveTime) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {onlineEmployees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No employees are currently online</p>
          </div>
        )}
      </div>
    </div>
  )
}
