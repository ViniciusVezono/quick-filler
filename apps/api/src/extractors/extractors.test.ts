import { describe, expect, it } from 'vitest'
import type { PageInput } from '@quick-filler/domain'
import { extractPayroll } from './payroll/payroll.extractor.js'
import { extractTimeCard } from './time-card/time-card.extractor.js'

const page = (text: string, pageNumber = 1): PageInput => ({
  page: pageNumber,
  source: 'text',
  text,
  tokens: text.split(' ').map((token) => ({ text: token })),
})

describe('time card extractor', () => {
  it('preserves uncertain punches and alternates IN/OUT', () => {
    const value = extractTimeCard([
      page('CARTÃO DE PONTO Entrada Saída 01/08/2026 08:0? 12:00 13:00 17:30 02/08/2026'),
    ])
    expect(value.pages[0]?.days[0]?.punches).toEqual([
      { kind: 'IN', time_raw: '08:0?', time_hhmm: '08:0?' },
      { kind: 'OUT', time_raw: '12:00', time_hhmm: '12:00' },
      { kind: 'IN', time_raw: '13:00', time_hhmm: '13:00' },
      { kind: 'OUT', time_raw: '17:30', time_hhmm: '17:30' },
    ])
  })
})

describe('payroll extractor', () => {
  it('emits multiple logical records from a financial sheet physical page', () => {
    const value = extractPayroll([
      page(
        'FICHA FINANCEIRA 01/2026 100 Salário base 30 2.500,00 200 INSS 225,00 02/2026 100 Salário base 30 2.600,00 200 INSS 234,00',
      ),
    ])
    expect(value.pages).toHaveLength(2)
    expect(value.pages.map((record) => record.page)).toEqual([1, 1])
    expect(value.pages.map((record) => record.month)).toEqual(['01', '02'])
  })

  it('separates bases from regular fields', () => {
    const value = extractPayroll([
      page('HOLERITE Competência 03/2026 100 Salário 30 3.000,00 Base INSS 3.000,00'),
    ])
    expect(value.pages[0]?.fields[0]?.label).toContain('Salário')
    expect(value.pages[0]?.bases[0]?.label).toContain('Base INSS')
  })
})
