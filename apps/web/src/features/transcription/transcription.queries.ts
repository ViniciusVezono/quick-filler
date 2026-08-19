import type { DocumentType, TranscriptionValue } from '@quick-filler/domain'
import { mutationOptions, queryOptions } from '@tanstack/react-query'
import {
  downloadTranscription,
  getTranscription,
  saveTranscription,
  uploadTranscription,
} from './transcription.service'

export type TranscriptionExportFormat = 'xlsx' | 'csv' | 'json'

export type UploadTranscriptionVariables = {
  file: File
  type: DocumentType
}

export const transcriptionKeys = {
  all: ['transcription'] as const,
  detail: (id: string) => [...transcriptionKeys.all, id] as const,
}

export const transcriptionQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: transcriptionKeys.detail(id),
      queryFn: () => getTranscription(id),
      refetchInterval: ({ state }) => (state.data?.status === 'processando' ? 1200 : false),
    }),
}

export const transcriptionMutations = {
  upload: () =>
    mutationOptions({
      mutationFn: ({ file, type }: UploadTranscriptionVariables) => uploadTranscription(file, type),
    }),
  save: (id: string) =>
    mutationOptions({
      mutationFn: (value: TranscriptionValue) => saveTranscription(id, value),
    }),
  download: (id: string) =>
    mutationOptions({
      mutationFn: (format: TranscriptionExportFormat) => downloadTranscription(id, format),
    }),
}
