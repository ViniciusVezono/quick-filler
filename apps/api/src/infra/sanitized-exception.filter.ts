import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Response } from 'express'

@Catch()
export class SanitizedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SanitizedExceptionFilter.name)

  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const safeMessage = this.messageFor(error, status)
    if (status >= 500) this.logger.error(error instanceof Error ? error.message : 'Erro interno')
    response.status(status).json({ statusCode: status, message: safeMessage })
  }

  private messageFor(error: unknown, status: number): string | string[] {
    if (!(error instanceof HttpException)) return 'Não foi possível concluir a operação.'
    const payload = error.getResponse()
    if (typeof payload === 'string') return payload
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = payload.message
      if (typeof message === 'string' || Array.isArray(message)) return message as string | string[]
    }
    return status === 404 ? 'Recurso não encontrado.' : 'Requisição inválida.'
  }
}
