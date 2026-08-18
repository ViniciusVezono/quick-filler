import { Module } from '@nestjs/common'
import { ExportService } from './exports/export.service.js'
import { ExtractionService } from './extractors/extraction.service.js'
import { HealthController } from './health/health.controller.js'
import { PrismaService } from './infra/prisma.service.js'
import { PdfService } from './pdf/pdf.service.js'
import { ProcessingService } from './processing/processing.service.js'
import { TranscriptionsController } from './transcriptions/transcriptions.controller.js'
import { TranscriptionsRepository } from './transcriptions/transcriptions.repository.js'
import { TranscriptionsService } from './transcriptions/transcriptions.service.js'

@Module({
  controllers: [HealthController, TranscriptionsController],
  providers: [
    PrismaService,
    TranscriptionsRepository,
    PdfService,
    ExtractionService,
    ProcessingService,
    TranscriptionsService,
    ExportService,
  ],
})
export class AppModule {}
