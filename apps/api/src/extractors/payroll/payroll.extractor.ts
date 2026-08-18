import {
  parseMonthName,
  runStrategyRegistry,
  type LayoutStrategy,
  type PageInput,
  type PayrollEntry,
  type PayrollPage,
  type PayrollValue,
} from '@quick-filler/domain'

const numericCompetencePattern = /\b(0[1-9]|1[0-2]|[0-1?]{2})[./-](\d{4}|\?{4})\b/g
const namedCompetencePattern = /\b(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(\d{4})\b/gi
const moneyPattern = /-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2}|[\d?.]+,[\d?]{2}/
const baseLabelPattern = /base\s+(?:inss|fgts|irrf)|sal[aá]rio\s+base|total\s+(?:vencimentos|descontos)|fgts\s+do\s+m[eê]s/i

function competenceMatches(text: string) {
  const numeric = [...text.matchAll(numericCompetencePattern)].map((match) => ({
    index: match.index ?? 0,
    month: match[1]!,
    year: match[2]!,
  }))
  const named = [...text.matchAll(namedCompetencePattern)].map((match) => ({
    index: match.index ?? 0,
    month: parseMonthName(match[1]!.replace('c', 'ç')) ?? '??',
    year: match[2]!,
  }))
  return [...numeric, ...named].sort((left, right) => left.index - right.index)
}

function extractEntries(block: string): { fields: PayrollEntry[]; bases: PayrollEntry[] } {
  const fields: PayrollEntry[] = []
  const bases: PayrollEntry[] = []
  const moneyMatches = [...block.matchAll(new RegExp(moneyPattern.source, 'g'))]
  let cursor = 0
  for (const moneyMatch of moneyMatches) {
    const before = block
      .slice(cursor, moneyMatch.index)
      .replace(/^.*?\b(?:0[1-9]|1[0-2]|[0-1?]{2})[./-](?:\d{4}|\?{4})\b/, '')
      .replace(/^[\s|:;-]+/, '')
      .trim()
    cursor = (moneyMatch.index ?? cursor) + moneyMatch[0].length
    if (!/[A-Za-zÀ-ÿ]/.test(before)) continue
    const codeMatch = before.match(/^(\d{1,5})\s+/)
    const withoutCode = codeMatch ? before.slice(codeMatch[0].length) : before
    const referenceMatch = withoutCode.match(/\s+(\d+(?:[,.]\d+)?%?|[\d?]+[,.][\d?]+)\s*$/)
    const label = (referenceMatch ? withoutCode.slice(0, referenceMatch.index) : withoutCode).trim()
    if (!label || /compet[eê]ncia|matr[ií]cula|cpf/i.test(label)) continue
    const entry: PayrollEntry = {
      ...(codeMatch ? { code: codeMatch[1] } : {}),
      label,
      ...(referenceMatch ? { reference: referenceMatch[1] } : {}),
      value: moneyMatch[0],
    }
    ;(baseLabelPattern.test(label) ? bases : fields).push(entry)
  }
  return { fields, bases }
}

function extractCompetences(page: PageInput): PayrollPage[] {
  const competences = competenceMatches(page.text)
  const unique = competences.filter(
    (item, index) =>
      index === 0 || item.month !== competences[index - 1]?.month || item.year !== competences[index - 1]?.year,
  )
  return unique.map((competence, index) => {
    const end = unique[index + 1]?.index ?? page.text.length
    const entries = extractEntries(page.text.slice(competence.index, end))
    return { page: page.page, month: competence.month, year: competence.year, ...entries }
  })
}

export const payrollStrategies: LayoutStrategy<PayrollPage>[] = [
  {
    id: 'payroll-financial-sheet-multi-period',
    matches: (page) => /ficha\s+financeira/i.test(page.text) && competenceMatches(page.text).length > 1,
    extract: extractCompetences,
  },
  {
    id: 'payroll-monthly-statement',
    matches: (page) =>
      /holerite|demonstrativo|recibo\s+de\s+pagamento|proventos|descontos/i.test(page.text) &&
      competenceMatches(page.text).length > 0,
    extract: (page) => extractCompetences(page).slice(0, 1),
  },
  {
    id: 'payroll-competence-fallback',
    matches: (page) => competenceMatches(page.text).length > 0 && moneyPattern.test(page.text),
    extract: (page) => extractCompetences(page).slice(0, 1),
  },
]

export function extractPayroll(pages: PageInput[]): PayrollValue {
  const records = pages.flatMap((page) => {
    const result = runStrategyRegistry(page, payrollStrategies)
    if (!result && page.text.trim()) throw new Error(`Layout de holerite não suportado na página ${page.page}.`)
    return result?.records ?? []
  })
  if (!records.length) throw new Error('Não foi possível identificar competências neste holerite.')
  return { pages: records }
}
