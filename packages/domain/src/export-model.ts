import type { PayrollValue, TimeCardValue } from './schemas.js'

export type ExportTable = {
  headers: string[]
  rows: string[][]
}

export function timeCardExportTable(value: TimeCardValue): ExportTable {
  const days = value.pages.flatMap((page) => page.days)
  const maximumPunches = days.reduce((maximum, day) => Math.max(maximum, day.punches.length), 0)
  const headers = ['Data']
  for (let index = 0; index < maximumPunches; index += 1) {
    headers.push(`${index % 2 === 0 ? 'Entrada' : 'Saída'} ${Math.floor(index / 2) + 1}`)
  }
  return {
    headers,
    rows: days.map((day) => [
      day.date_raw,
      ...Array.from({ length: maximumPunches }, (_, index) => day.punches[index]?.time_raw ?? ''),
    ]),
  }
}

export function payrollExportTable(value: PayrollValue): ExportTable {
  const labels: string[] = []
  for (const page of value.pages) {
    for (const field of page.fields) {
      if (!labels.includes(field.label)) labels.push(field.label)
    }
  }
  return {
    headers: ['Pág.', 'Mês', 'Ano', ...labels],
    rows: value.pages.map((page) => {
      const values = new Map(page.fields.map((field) => [field.label, field.value]))
      return [String(page.page), page.month, page.year, ...labels.map((label) => values.get(label) ?? '')]
    }),
  }
}
