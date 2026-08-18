import { describe, expect, it } from 'vitest'
import {
  isPossibleDate,
  isPossibleMonth,
  normalizeTime,
  payrollPageWarning,
  runStrategyRegistry,
  timeCardDayWarning,
  type LayoutStrategy,
  type PageInput,
} from './index.js'

describe('normalization and validation', () => {
  it('accepts possible dates and rejects impossible dates', () => {
    expect(isPossibleDate('29/02/2024')).toBe(true)
    expect(isPossibleDate('31/02/2024')).toBe(false)
    expect(isPossibleDate('1?/0?/2024')).toBe(true)
  })

  it('does not invent uncertain time characters', () => {
    expect(normalizeTime('8:0?')).toBe('08:0?')
    expect(normalizeTime('25:00')).toBeNull()
    expect(isPossibleMonth('13')).toBe(false)
  })
})

describe('derived warnings', () => {
  it('gives red precedence over yellow', () => {
    const previous = { date_raw: '03/03/2026', punches: [] }
    const current = {
      date_raw: '02/03/2026',
      punches: [{ kind: 'IN' as const, time_raw: '08:0?', time_hhmm: '08:0?' }],
    }
    expect(timeCardDayWarning(current, previous)?.severity).toBe('red')
  })

  it('marks an empty payroll record', () => {
    expect(
      payrollPageWarning({ page: 1, month: '01', year: '2026', fields: [], bases: [] })?.severity,
    ).toBe('yellow')
  })
})

describe('layout registry', () => {
  it('supports zero to many logical records for one physical page', () => {
    const input: PageInput = { page: 1, source: 'text', text: 'months', tokens: [] }
    const strategy: LayoutStrategy<{ page: number; month: string }> = {
      id: 'multi',
      matches: () => true,
      extract: (page) => [
        { page: page.page, month: '01' },
        { page: page.page, month: '02' },
      ],
    }
    expect(runStrategyRegistry(input, [strategy])?.records).toHaveLength(2)
  })
})
