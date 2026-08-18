import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import type { DocumentType } from '@quick-filler/domain'
import { config } from '../config.js'
import { ExtractionService } from '../extractors/extraction.service.js'
import { PdfService } from '../pdf/pdf.service.js'
import { TranscriptionsRepository } from '../transcriptions/transcriptions.repository.js'

@Injectable()
export class ProcessingService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ProcessingService.name)
  private readonly queue: string[] = []
  private active = 0
  private cleanupTimer?: NodeJS.Timeout

  constructor(
    private readonly repository: TranscriptionsRepository,
    private readonly pdf: PdfService,
    private readonly extraction: ExtractionService,
  ) {}

  async onApplicationBootstrap() {
    const staleBefore = new Date(Date.now() - config.processingTimeoutMs)
    await this.repository.markStaleProcessing(staleBefore)
    this.cleanupTimer = setInterval(() => void this.cleanup(), 60 * 60 * 1000)
    this.cleanupTimer.unref()
    await this.cleanup()
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
  }

  enqueue(id: string) {
    this.queue.push(id)
    queueMicrotask(() => this.drain())
  }

  private drain() {
    while (this.active < config.processingConcurrency && this.queue.length > 0) {
      const id = this.queue.shift()!
      this.active += 1
      void this.processWithTimeout(id)
        .catch(() => undefined)
        .finally(() => {
          this.active -= 1
          this.drain()
        })
    }
  }

  private async processWithTimeout(id: string) {
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        this.process(id),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Tempo limite de processamento excedido.')), config.processingTimeoutMs)
        }),
      ])
    } catch (error) {
      const message = this.safeProcessingMessage(error)
      await this.repository.fail(id, message).catch(() => undefined)
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  private async process(id: string) {
    const record = await this.repository.find(id)
    if (!record) return
    const pages = await this.pdf.acquire(Buffer.from(record.pdfData))
    const type: DocumentType = record.type === 'cartao_ponto' ? 'cartao-ponto' : 'holerite'
    const value = this.extraction.extract(type, pages)
    await this.repository.complete(id, value)
  }

  private safeProcessingMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : ''
    if (/layout|identificar|OCR|tempo limite/i.test(message)) return message
    this.logger.error(message || 'Falha desconhecida no processamento')
    return 'Não foi possível processar o documento. Verifique o arquivo e tente novamente.'
  }

  private async cleanup() {
    await this.repository.deleteExpired(new Date()).catch((error) => {
      this.logger.error(error instanceof Error ? error.message : 'Falha na retenção')
    })
  }
}
