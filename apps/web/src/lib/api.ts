import type { DocumentType, TranscriptionStatus, TranscriptionValue } from '@quick-filler/domain'

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export type TranscriptionResponse = {
  id: string
  tipo: DocumentType
  status: TranscriptionStatus
  erro: string | null
  value: TranscriptionValue | null
}

async function parseError(response: Response): Promise<never> {
  let message = `A operação falhou (${response.status}).`
  try {
    const body = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(body.message)) message = body.message.join(' ')
    else if (body.message) message = body.message
  } catch {
    // A resposta pode não ser JSON; a mensagem genérica continua segura.
  }
  throw new Error(message)
}

export async function uploadTranscription(file: File, tipo: DocumentType): Promise<{ id: string }> {
  const form = new FormData()
  form.append('arquivo', file)
  form.append('tipo', tipo)
  const response = await fetch(`${apiUrl}/api/transcricoes`, { method: 'POST', body: form })
  if (!response.ok) return parseError(response)
  return response.json() as Promise<{ id: string }>
}

export async function getTranscription(id: string): Promise<TranscriptionResponse> {
  const response = await fetch(`${apiUrl}/api/transcricoes/${id}`)
  if (!response.ok) return parseError(response)
  return response.json() as Promise<TranscriptionResponse>
}

export async function saveTranscription(
  id: string,
  value: TranscriptionValue,
): Promise<TranscriptionResponse> {
  const response = await fetch(`${apiUrl}/api/transcricoes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  if (!response.ok) return parseError(response)
  return response.json() as Promise<TranscriptionResponse>
}

export async function downloadTranscription(id: string, format: 'xlsx' | 'csv' | 'json') {
  const response = await fetch(`${apiUrl}/api/transcricoes/${id}/planilha?formato=${format}`)
  if (!response.ok) return parseError(response)
  const blob = await response.blob()
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = `transcricao-${id}.${format}`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(href)
}

export function pdfUrl(id: string) {
  return `${apiUrl}/api/transcricoes/${id}/arquivo`
}
