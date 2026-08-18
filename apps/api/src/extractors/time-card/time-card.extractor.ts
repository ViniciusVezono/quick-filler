import {
  normalizeTime,
  runStrategyRegistry,
  type LayoutStrategy,
  type PageInput,
  type TimeCardDay,
  type TimeCardPage,
  type TimeCardValue,
} from '@quick-filler/domain'

const datePatternSource = String.raw`\b([0-3?]?\d[/.\-][0-1?]?\d(?:[/.\-](?:\d{2}|\d{4}|\?{2,4}))?)\b`
const timePattern = /(?<!\d)([0-2?]?[0-9?][:h.]\s*[0-5?][0-9?])(?!\d)/gi

function extractDays(text: string): TimeCardDay[] {
  const dates = [...text.matchAll(new RegExp(datePatternSource, 'g'))]
  return dates.map((dateMatch, index) => {
    const start = (dateMatch.index ?? 0) + dateMatch[0].length
    const end = dates[index + 1]?.index ?? text.length
    const block = text.slice(start, end)
    const punches = [...block.matchAll(timePattern)].flatMap((match, punchIndex) => {
      const normalized = normalizeTime(match[1]!)
      if (!normalized) return []
      return [
        {
          kind: punchIndex % 2 === 0 ? ('IN' as const) : ('OUT' as const),
          time_raw: match[1]!.replace(/\s+/g, ''),
          time_hhmm: normalized,
        },
      ]
    })
    return { date_raw: dateMatch[1]!, punches }
  })
}

export const timeCardStrategies: LayoutStrategy<TimeCardPage>[] = [
  {
    id: 'time-card-structured-lines',
    matches: (page) => {
      const structuralLabel = /cart[aã]o\s+de\s+ponto|registro\s+de\s+ponto|entrada|sa[ií]da|jornada/i.test(
        page.text,
      )
      return structuralLabel && new RegExp(datePatternSource).test(page.text)
    },
    extract: (page) => [{ page: page.page, days: extractDays(page.text) }],
  },
  {
    id: 'time-card-date-time-fallback',
    matches: (page) => extractDays(page.text).some((day) => day.punches.length > 0),
    extract: (page) => [{ page: page.page, days: extractDays(page.text) }],
  },
]

export function extractTimeCard(pages: PageInput[]): TimeCardValue {
  const records = pages.flatMap((page) => {
    const result = runStrategyRegistry(page, timeCardStrategies)
    if (!result && page.text.trim()) throw new Error(`Layout de cartão não suportado na página ${page.page}.`)
    return result?.records ?? []
  })
  if (!records.some((record) => record.days.length > 0)) {
    throw new Error('Não foi possível identificar dias e batidas neste cartão de ponto.')
  }
  return { pages: records }
}
