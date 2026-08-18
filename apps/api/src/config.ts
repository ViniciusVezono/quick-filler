function positiveNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name] ?? fallback)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const config = {
  port: positiveNumber('PORT', 3000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim()),
  uploadMaxBytes: positiveNumber('UPLOAD_MAX_MB', 15) * 1024 * 1024,
  processingConcurrency: Math.floor(positiveNumber('PROCESSING_CONCURRENCY', 2)),
  processingTimeoutMs: positiveNumber('PROCESSING_TIMEOUT_MS', 120_000),
  retentionHours: positiveNumber('RETENTION_HOURS', 24),
  ocrEnabled: process.env.OCR_ENABLED !== 'false',
  ocrLanguage: process.env.OCR_LANGUAGE ?? 'por',
}
