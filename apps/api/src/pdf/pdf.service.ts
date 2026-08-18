import { BadRequestException, Injectable } from '@nestjs/common'
import type { PageInput, PageToken } from '@quick-filler/domain'
import { createCanvas } from '@napi-rs/canvas'
import { recognize } from 'tesseract.js'
import { config } from '../config.js'

type PdfTextItem = {
  str: string
  transform: number[]
  width: number
  height: number
}

@Injectable()
export class PdfService {
  async validate(data: Buffer): Promise<void> {
    if (data.length < 5 || data.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new BadRequestException('O arquivo enviado não possui uma assinatura PDF válida.')
    }
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) })
      const document = await loadingTask.promise
      if (document.numPages < 1) throw new Error('empty')
      await loadingTask.destroy()
    } catch {
      throw new BadRequestException('O PDF está corrompido ou não pode ser aberto.')
    }
  }

  async acquire(data: Buffer): Promise<PageInput[]> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) })
    const document = await loadingTask.promise
    const pages: PageInput[] = []
    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber)
        const text = await this.textPage(page, pageNumber)
        pages.push(this.needsOcr(text) ? await this.ocrPage(page, pageNumber) : text)
        page.cleanup()
      }
    } finally {
      await loadingTask.destroy()
    }
    return pages
  }

  needsOcr(page: PageInput): boolean {
    const meaningful = page.text.replace(/\s+/g, '')
    return meaningful.length < 24 || page.tokens.length < 4
  }

  private async textPage(page: any, pageNumber: number): Promise<PageInput> {
    const content = await page.getTextContent()
    const tokens: PageToken[] = (content.items as unknown[])
      .filter((item): item is PdfTextItem => typeof (item as PdfTextItem).str === 'string')
      .map((item) => ({
        text: item.str,
        bbox: {
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
          width: item.width,
          height: item.height || Math.abs(item.transform[3] ?? 0),
        },
      }))
      .filter((token) => token.text.trim().length > 0)
    return {
      page: pageNumber,
      source: 'text',
      text: tokens.map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim(),
      tokens,
    }
  }

  private async ocrPage(page: any, pageNumber: number): Promise<PageInput> {
    if (!config.ocrEnabled) {
      throw new Error(`A página ${pageNumber} exige OCR, mas OCR_ENABLED=false.`)
    }
    const viewport = page.getViewport({ scale: 2 })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    const context = canvas.getContext('2d')
    await page.render({ canvasContext: context, viewport, canvas }).promise
    const result = await recognize(canvas.toBuffer('image/png'), config.ocrLanguage, {
      logger: () => undefined,
    })
    const tsv = result.data.tsv ?? ''
    const tokens = this.tokensFromTsv(tsv)
    return {
      page: pageNumber,
      source: 'ocr',
      text: result.data.text.replace(/\s+/g, ' ').trim(),
      tokens,
    }
  }

  private tokensFromTsv(tsv: string): PageToken[] {
    const lines = tsv.split(/\r?\n/)
    const header = lines.shift()?.split('\t') ?? []
    const index = (name: string) => header.indexOf(name)
    const textIndex = index('text')
    const confidenceIndex = index('conf')
    if (textIndex < 0) return []
    return lines.flatMap((line) => {
      const parts = line.split('\t')
      const text = parts[textIndex]?.trim()
      if (!text) return []
      return [
        {
          text,
          confidence: Number(parts[confidenceIndex] ?? 0) / 100,
          bbox: {
            x: Number(parts[index('left')] ?? 0),
            y: Number(parts[index('top')] ?? 0),
            width: Number(parts[index('width')] ?? 0),
            height: Number(parts[index('height')] ?? 0),
          },
        },
      ]
    })
  }
}
