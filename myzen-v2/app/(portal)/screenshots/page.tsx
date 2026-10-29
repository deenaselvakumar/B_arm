'use client'

import ScreenshotGallery from '@/components/ScreenshotGallery'

export default function ScreenshotsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Screenshots</h1>
        <p className="text-gray-600 mt-1">Only employees mapped to you appear here. Off by default; enabled per team by your administrator.</p>
      </div>
      <ScreenshotGallery />
    </div>
  )
}
