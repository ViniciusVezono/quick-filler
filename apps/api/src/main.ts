import 'dotenv/config'
import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { config } from './config.js'
import { SanitizedExceptionFilter } from './infra/sanitized-exception.filter.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true })
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    exposedHeaders: ['Content-Disposition'],
  })
  app.useGlobalFilters(new SanitizedExceptionFilter())
  app.enableShutdownHooks()
  await app.listen(config.port, '0.0.0.0')
  Logger.log(`API disponível na porta ${config.port}`, 'Bootstrap')
}

void bootstrap()
