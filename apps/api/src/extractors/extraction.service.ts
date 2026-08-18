import { Injectable } from '@nestjs/common'
import {
  parseValueForType,
  type DocumentType,
  type PageInput,
  type TranscriptionValue,
} from '@quick-filler/domain'
import { extractPayroll } from './payroll/payroll.extractor.js'
import { extractTimeCard } from './time-card/time-card.extractor.js'

@Injectable()
export class ExtractionService {
  extract(type: DocumentType, pages: PageInput[]): TranscriptionValue {
    const value = type === 'cartao-ponto' ? extractTimeCard(pages) : extractPayroll(pages)
    return parseValueForType(type, value)
  }
}
