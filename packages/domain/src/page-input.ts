export type BoundingBox = {
  x: number
  y: number
  width: number
  height: number
}

export type PageToken = {
  text: string
  bbox?: BoundingBox
  confidence?: number
}

export type PageInput = {
  page: number
  source: 'text' | 'ocr'
  text: string
  tokens: PageToken[]
}

export type LayoutStrategy<T> = {
  id: string
  matches(page: PageInput): boolean
  extract(page: PageInput): T[]
}

export type StrategyResult<T> = {
  strategyId: string
  records: T[]
}

export function runStrategyRegistry<T>(
  page: PageInput,
  strategies: LayoutStrategy<T>[],
): StrategyResult<T> | null {
  const strategy = strategies.find((candidate) => candidate.matches(page))
  if (!strategy) return null
  return { strategyId: strategy.id, records: strategy.extract(page) }
}
