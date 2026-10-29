export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  return `${hours}h ${mins}m`
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function parseTimeString(timeStr: string): number {
  if (!timeStr || timeStr === '-' || timeStr === 'A' || timeStr === 'Weekly off') return 0
  
  const match = timeStr.match(/(\d+)h\s*(\d+)m/)
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2])
  }
  return 0
}

export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
