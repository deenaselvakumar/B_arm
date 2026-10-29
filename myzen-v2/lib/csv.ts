const cell = (v: string | number) => {
  let s = String(v ?? '')
  // Neutralise spreadsheet formula injection from user-controlled text (app names, URLs, descriptions).
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(cell).join(',')).join('\r\n')

export function downloadCsv(rows: (string | number)[][], filename: string) {
  const blob = new Blob(['\ufeff' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
