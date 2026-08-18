import type { PayrollPage, TimeCardDay } from './schemas.js'
import {
  containsUncertainty,
  isPossibleDate,
  monthOrdinal,
  parseDateParts,
} from './normalization.js'

export type WarningSeverity = 'yellow' | 'red'

export type DerivedWarning = {
  severity: WarningSeverity
  reasons: string[]
}

export function hasOddPunches(day: TimeCardDay): boolean {
  return day.punches.length % 2 !== 0
}

export function isNonSequentialDate(previous: string, current: string): boolean {
  const before = parseDateParts(previous)
  const after = parseDateParts(current)
  if (!before || !after) return false
  const beforeDate = Date.UTC(before.year ?? 2000, before.month - 1, before.day)
  const afterDate = Date.UTC(after.year ?? 2000, after.month - 1, after.day)
  return afterDate <= beforeDate
}

export function isPayrollPageEmpty(page: PayrollPage): boolean {
  return page.fields.length === 0 && page.bases.length === 0
}

export function isNonSequentialMonth(previous: PayrollPage, current: PayrollPage): boolean {
  const before = monthOrdinal(previous.month, previous.year)
  const after = monthOrdinal(current.month, current.year)
  return before !== null && after !== null && after <= before
}

function includesQuestionMark(value: unknown): boolean {
  if (typeof value === 'string') return containsUncertainty(value)
  if (Array.isArray(value)) return value.some(includesQuestionMark)
  if (value && typeof value === 'object') return Object.values(value).some(includesQuestionMark)
  return false
}

export function timeCardDayWarning(day: TimeCardDay, previous?: TimeCardDay): DerivedWarning | null {
  const redReasons: string[] = []
  const yellowReasons: string[] = []
  if (!isPossibleDate(day.date_raw)) yellowReasons.push('Data incerta ou inválida')
  if (previous && isNonSequentialDate(previous.date_raw, day.date_raw)) redReasons.push('Data fora de sequência')
  if (hasOddPunches(day)) yellowReasons.push('Quantidade ímpar de batidas')
  if (includesQuestionMark(day)) yellowReasons.push('Há caracteres incertos')
  if (redReasons.length) return { severity: 'red', reasons: [...redReasons, ...yellowReasons] }
  if (yellowReasons.length) return { severity: 'yellow', reasons: yellowReasons }
  return null
}

export function payrollPageWarning(page: PayrollPage, previous?: PayrollPage): DerivedWarning | null {
  const redReasons: string[] = []
  const yellowReasons: string[] = []
  if (previous && isNonSequentialMonth(previous, page)) redReasons.push('Competência fora de sequência')
  if (isPayrollPageEmpty(page)) yellowReasons.push('Registro sem verbas ou bases')
  if (includesQuestionMark(page)) yellowReasons.push('Há caracteres incertos')
  if (redReasons.length) return { severity: 'red', reasons: [...redReasons, ...yellowReasons] }
  if (yellowReasons.length) return { severity: 'yellow', reasons: yellowReasons }
  return null
}
