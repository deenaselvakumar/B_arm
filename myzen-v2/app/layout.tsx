import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MyZenV2 - Productivity Suite',
  description: 'Internal productivity monitoring and management platform for B-Arm (India)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
