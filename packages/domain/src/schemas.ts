import { z } from 'zod'

export const documentTypeSchema = z.enum(['cartao-ponto', 'holerite'])
export const transcriptionStatusSchema = z.enum(['processando', 'concluido', 'erro'])

const rawString = z.string().trim().min(1)
const rawOptionalString = z.string().trim().optional()

export const punchSchema = z.object({
  kind: z.enum(['IN', 'OUT']),
  time_raw: rawString,
  time_hhmm: z.string().regex(/^[0-9?]{2}:[0-9?]{2}$/),
})

export const timeCardDaySchema = z.object({
  date_raw: rawString,
  punches: z.array(punchSchema),
})

export const timeCardPageSchema = z.object({
  page: z.number().int().positive(),
  days: z.array(timeCardDaySchema),
})

export const timeCardValueSchema = z.object({
  pages: z.array(timeCardPageSchema),
})

export const payrollEntrySchema = z.object({
  code: rawOptionalString,
  label: rawString,
  reference: rawOptionalString,
  value: rawString,
})

export const payrollPageSchema = z.object({
  page: z.number().int().positive(),
  year: z.string().regex(/^[0-9?]{4}$/),
  month: z.string().regex(/^(0[1-9]|1[0-2]|[0-1?]{2})$/),
  fields: z.array(payrollEntrySchema),
  bases: z.array(payrollEntrySchema),
})

export const payrollValueSchema = z.object({
  pages: z.array(payrollPageSchema),
})

export const transcriptionValueSchema = z.union([timeCardValueSchema, payrollValueSchema])

export type DocumentType = z.infer<typeof documentTypeSchema>
export type TranscriptionStatus = z.infer<typeof transcriptionStatusSchema>
export type Punch = z.infer<typeof punchSchema>
export type TimeCardDay = z.infer<typeof timeCardDaySchema>
export type TimeCardPage = z.infer<typeof timeCardPageSchema>
export type TimeCardValue = z.infer<typeof timeCardValueSchema>
export type PayrollEntry = z.infer<typeof payrollEntrySchema>
export type PayrollPage = z.infer<typeof payrollPageSchema>
export type PayrollValue = z.infer<typeof payrollValueSchema>
export type TranscriptionValue = TimeCardValue | PayrollValue

export function parseValueForType(type: DocumentType, value: unknown): TranscriptionValue {
  return type === 'cartao-ponto'
    ? timeCardValueSchema.parse(value)
    : payrollValueSchema.parse(value)
}

export function isTimeCardValue(value: TranscriptionValue): value is TimeCardValue {
  const firstPage = value.pages[0]
  return firstPage ? 'days' in firstPage : true
}
