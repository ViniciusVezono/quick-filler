import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { config } from '../config.js'
import { ExportService } from '../exports/export.service.js'
import { TranscriptionsService } from './transcriptions.service.js'

@Controller('api/transcricoes')
export class TranscriptionsController {
  constructor(
    private readonly transcriptions: TranscriptionsService,
    private readonly exports: ExportService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: config.uploadMaxBytes } }))
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Body('tipo') type: unknown) {
    return this.transcriptions.upload(file, type)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.transcriptions.get(id)
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body('value') value: unknown) {
    return this.transcriptions.replace(id, value)
  }

  @Get(':id/arquivo')
  async file(@Param('id') id: string, @Res() response: Response) {
    const pdf = await this.transcriptions.file(id)
    response.set({ 'Content-Type': 'application/pdf', 'Content-Length': String(pdf.length) })
    response.send(pdf)
  }

  @Get(':id/planilha')
  async spreadsheet(
    @Param('id') id: string,
    @Query('formato') format: string | undefined,
    @Res() response: Response,
  ) {
    const result = await this.exports.export(id, format ?? 'xlsx')
    response.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename=transcricao-${id}.${result.extension}`,
    })
    response.send(result.data)
  }
}
