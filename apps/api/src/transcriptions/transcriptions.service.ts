import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  documentTypeSchema,
  parseValueForType,
  type DocumentType,
  type TranscriptionValue,
} from '@quick-filler/domain'
import { config } from '../config.js'
import { PdfService } from '../pdf/pdf.service.js'
import { ProcessingService } from '../processing/processing.service.js'
import { TranscriptionsRepository } from './transcriptions.repository.js'

@Injectable()
export class TranscriptionsService {
  constructor(
    private readonly repository: TranscriptionsRepository,
    private readonly pdf: PdfService,
    private readonly processing: ProcessingService,
  ) {}

  async upload(file: Express.Multer.File | undefined, rawType: unknown) {
    const typeResult = documentTypeSchema.safeParse(rawType)
    if (!typeResult.success) throw new BadRequestException('Tipo deve ser cartao-ponto ou holerite.')
    if (!file) throw new BadRequestException('Envie o PDF no campo arquivo.')
    if (file.size > config.uploadMaxBytes) throw new BadRequestException('O PDF excede o limite configurado.')
    await this.pdf.validate(file.buffer)
    const expiresAt = new Date(Date.now() + config.retentionHours * 60 * 60 * 1000)
    const record = await this.repository.create(typeResult.data, file.buffer, expiresAt)
    this.processing.enqueue(record.id)
    return { id: record.id }
  }

  async get(id: string) {
    const result = await this.repository.publicResult(id)
    if (!result) throw new NotFoundException('Transcrição não encontrada ou expirada.')
    return result
  }

  async replace(id: string, value: unknown) {
    const record = await this.repository.find(id)
    if (!record) throw new NotFoundException('Transcrição não encontrada ou expirada.')
    const type: DocumentType = record.type === 'cartao_ponto' ? 'cartao-ponto' : 'holerite'
    let parsed: TranscriptionValue
    try {
      parsed = parseValueForType(type, value)
    } catch {
      throw new BadRequestException('O value não corresponde ao tipo do documento.')
    }
    await this.repository.replaceValue(id, parsed)
    return this.get(id)
  }

  async file(id: string) {
    const record = await this.repository.find(id)
    if (!record) throw new NotFoundException('Transcrição não encontrada ou expirada.')
    return Buffer.from(record.pdfData)
  }
}
