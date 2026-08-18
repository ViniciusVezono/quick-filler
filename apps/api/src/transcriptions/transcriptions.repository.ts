import { Injectable } from '@nestjs/common'
import type { DocumentType, TranscriptionValue } from '@quick-filler/domain'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../infra/prisma.service.js'

function toDatabaseType(type: DocumentType): 'cartao_ponto' | 'holerite' {
  return type === 'cartao-ponto' ? 'cartao_ponto' : 'holerite'
}

function fromDatabaseType(type: 'cartao_ponto' | 'holerite'): DocumentType {
  return type === 'cartao_ponto' ? 'cartao-ponto' : 'holerite'
}

@Injectable()
export class TranscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(type: DocumentType, pdfData: Buffer, expiresAt: Date) {
    return this.prisma.transcription.create({
      data: {
        id: randomUUID(),
        type: toDatabaseType(type),
        pdfData: Uint8Array.from(pdfData),
        pdfSize: pdfData.length,
        expiresAt,
      },
    })
  }

  find(id: string) {
    return this.prisma.transcription.findUnique({ where: { id } })
  }

  async publicResult(id: string) {
    const record = await this.find(id)
    if (!record) return null
    return {
      id: record.id,
      tipo: fromDatabaseType(record.type),
      status: record.status,
      erro: record.error,
      value: record.value,
    }
  }

  complete(id: string, value: TranscriptionValue) {
    return this.prisma.transcription.update({
      where: { id },
      data: { status: 'concluido', error: null, value: value as Prisma.InputJsonValue },
    })
  }

  fail(id: string, message: string) {
    return this.prisma.transcription.update({
      where: { id },
      data: { status: 'erro', error: message, value: Prisma.JsonNull },
    })
  }

  replaceValue(id: string, value: TranscriptionValue) {
    return this.prisma.transcription.update({
      where: { id },
      data: { status: 'concluido', error: null, value: value as Prisma.InputJsonValue },
    })
  }

  markStaleProcessing(before: Date) {
    return this.prisma.transcription.updateMany({
      where: { status: 'processando', updatedAt: { lt: before } },
      data: {
        status: 'erro',
        error: 'O processamento foi interrompido. Reenvie o documento para tentar novamente.',
      },
    })
  }

  deleteExpired(now: Date) {
    return this.prisma.transcription.deleteMany({ where: { expiresAt: { lte: now } } })
  }
}
