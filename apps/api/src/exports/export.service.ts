import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  isTimeCardValue,
  parseValueForType,
  payrollExportTable,
  payrollPageWarning,
  timeCardDayWarning,
  timeCardExportTable,
  type PayrollValue,
  type TimeCardValue,
  type TranscriptionValue,
} from '@quick-filler/domain'
import ExcelJS from 'exceljs'
import { TranscriptionsRepository } from '../transcriptions/transcriptions.repository.js'

type ExportFormat = 'xlsx' | 'csv' | 'json'

@Injectable()
export class ExportService {
  constructor(private readonly repository: TranscriptionsRepository) {}

  async export(id: string, rawFormat: string) {
    if (!['xlsx', 'csv', 'json'].includes(rawFormat)) {
      throw new BadRequestException('Formato deve ser xlsx, csv ou json.')
    }
    const format = rawFormat as ExportFormat
    const record = await this.repository.find(id)
    if (!record || !record.value) throw new NotFoundException('Transcrição concluída não encontrada.')
    const type = record.type === 'cartao_ponto' ? 'cartao-ponto' : 'holerite'
    const value = parseValueForType(type, record.value)
    if (format === 'json') {
      return {
        data: Buffer.from(JSON.stringify(value, null, 2)),
        contentType: 'application/json; charset=utf-8',
        extension: 'json',
      }
    }
    const table = isTimeCardValue(value)
      ? timeCardExportTable(value)
      : payrollExportTable(value as PayrollValue)
    if (format === 'csv') {
      const csv = [table.headers, ...table.rows].map((row) => row.map(this.csvCell).join(',')).join('\r\n')
      return {
        data: Buffer.from(`\uFEFF${csv}`),
        contentType: 'text/csv; charset=utf-8',
        extension: 'csv',
      }
    }
    return {
      data: await this.xlsx(value),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    }
  }

  private readonly csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`

  private async xlsx(value: TranscriptionValue): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Quick Filler'
    workbook.created = new Date()
    const sheet = workbook.addWorksheet('Transcrição', { views: [{ state: 'frozen', ySplit: 1 }] })
    const timeCard = isTimeCardValue(value)
    const table = timeCard
      ? timeCardExportTable(value as TimeCardValue)
      : payrollExportTable(value as PayrollValue)
    sheet.addRow(table.headers)
    const header = sheet.getRow(1)
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173772' } }
    header.alignment = { vertical: 'middle', horizontal: 'left' }
    header.height = 24
    table.rows.forEach((row) => sheet.addRow(row))

    if (timeCard) this.styleTimeCardRows(sheet, value as TimeCardValue)
    else this.stylePayrollRows(sheet, value as PayrollValue)

    sheet.columns.forEach((column, index) => {
      const cells = [table.headers[index] ?? '', ...table.rows.map((row) => row[index] ?? '')]
      column.width = Math.min(42, Math.max(12, ...cells.map((cell) => cell.length + 2)))
    })
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          ...cell.border,
          bottom: { style: 'hair', color: { argb: 'FFD9E1EC' } },
        }
      })
    })
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

  private styleTimeCardRows(sheet: ExcelJS.Worksheet, value: TimeCardValue) {
    const days = value.pages.flatMap((page) => page.days)
    days.forEach((day, index) => {
      const warning = timeCardDayWarning(day, days[index - 1])
      this.applyWarning(sheet.getRow(index + 2), warning?.severity)
    })
  }

  private stylePayrollRows(sheet: ExcelJS.Worksheet, value: PayrollValue) {
    value.pages.forEach((page, index) => {
      const warning = payrollPageWarning(page, value.pages[index - 1])
      this.applyWarning(sheet.getRow(index + 2), warning?.severity)
    })
  }

  private applyWarning(row: ExcelJS.Row, severity?: 'yellow' | 'red') {
    if (!severity) return
    const color = severity === 'red' ? 'FFF8D7DA' : 'FFFFF3CD'
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    })
    if (severity === 'red') {
      const first = row.getCell(1)
      first.border = {
        ...first.border,
        left: { style: 'medium', color: { argb: 'FFDC3545' } },
      }
    }
  }
}
