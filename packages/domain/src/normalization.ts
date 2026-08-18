const months: Record<string, string> = {
  janeiro: '01',
  fevereiro: '02',
  marco: '03',
  março: '03',
  abril: '04',
  maio: '05',
  junho: '06',
  julho: '07',
  agosto: '08',
  setembro: '09',
  outubro: '10',
  novembro: '11',
  dezembro: '12',
}

export function containsUncertainty(value: string): boolean {
  return value.includes('?')
}

export function normalizeTime(value: string): string | null {
  const compact = value.trim().replace(/[h.]/gi, ':').replace(/\s+/g, '')
  const match = compact.match(/^([0-9?]{1,2}):([0-9?]{2})$/)
  if (!match) return null
  const hour = match[1]!.padStart(2, '0')
  const minute = match[2]!
  if (!containsUncertainty(hour) && Number(hour) > 23) return null
  if (!containsUncertainty(minute) && Number(minute) > 59) return null
  return `${hour}:${minute}`
}

export function isPossibleMonth(value: string): boolean {
  if (containsUncertainty(value)) return /^[0-1?]{2}$/.test(value)
  return /^(0[1-9]|1[0-2])$/.test(value)
}

export function parseMonthName(value: string): string | null {
  return months[value.toLocaleLowerCase('pt-BR').normalize('NFC')] ?? null
}

export function parseDateParts(value: string): { day: number; month: number; year?: number } | null {
  if (containsUncertainty(value)) return null
  const match = value.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const rawYear = match[3]
  const year = rawYear ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear) : undefined
  return { day, month, year }
}

export function isPossibleDate(value: string): boolean {
  if (containsUncertainty(value)) return /^[0-9?]{1,2}[./-][0-9?]{1,2}(?:[./-][0-9?]{2,4})?$/.test(value)
  const parsed = parseDateParts(value)
  if (!parsed) return false
  const year = parsed.year ?? 2000
  const date = new Date(Date.UTC(year, parsed.month - 1, parsed.day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === parsed.month - 1 &&
    date.getUTCDate() === parsed.day
  )
}

export function monthOrdinal(month: string, year: string): number | null {
  if (containsUncertainty(month) || containsUncertainty(year) || !isPossibleMonth(month)) return null
  return Number(year) * 12 + Number(month) - 1
}
