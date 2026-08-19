import { isTimeCardValue, type TranscriptionValue } from '@quick-filler/domain'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeftIcon, CheckIcon, DownloadIcon, FileIcon, SaveIcon } from '../components/icons'
import { ErrorState, Spinner } from '../components/states'
import {
  buttonPrimary,
  buttonSecondary,
  eyebrow,
  iconButton,
  panelHeading,
} from '../components/ui-classes'
import { PayrollEditor } from '../review/payroll-editor'
import { TimeCardEditor } from '../review/time-card-editor'
import {
  transcriptionKeys,
  transcriptionMutations,
  transcriptionQueries,
  type TranscriptionExportFormat,
} from '../transcription/transcription.queries'
import { getTranscriptionPdfUrl } from '../transcription/transcription.service'

export function TranscriptionPage() {
  const { id } = useParams({ from: '/transcricoes/$id' })
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<TranscriptionValue | null>(null)
  const [dirty, setDirty] = useState(false)
  const [format, setFormat] = useState<TranscriptionExportFormat>('xlsx')
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const query = useQuery(transcriptionQueries.detail(id))
  const saveMutation = useMutation({
    ...transcriptionMutations.save(id),
    onSuccess: (result) => {
      queryClient.setQueryData(transcriptionKeys.detail(id), result)
      setDraft(result.value)
      setDirty(false)
    },
  })
  const downloadMutation = useMutation({
    ...transcriptionMutations.download(id),
    onError: (error) => setDownloadError(error.message),
  })

  useEffect(() => {
    if (query.data?.value && !dirty) setDraft(structuredClone(query.data.value))
  }, [query.data?.value, dirty])

  function changeDraft(value: TranscriptionValue) {
    setDraft(value)
    setDirty(true)
  }

  function startDownload() {
    setDownloadError(null)
    if (!draft) return

    if (dirty) {
      saveMutation.mutate(draft, {
        onSuccess: () => downloadMutation.mutate(format),
      })
      return
    }

    downloadMutation.mutate(format)
  }

  if (query.isPending)
    return (
      <main className="grid min-h-[calc(100vh-60px)] place-items-center p-8 min-[769px]:min-h-[calc(100vh-68px)]">
        <Spinner label="Abrindo a transcrição" />
      </main>
    )
  if (query.isError)
    return (
      <main className="grid min-h-[calc(100vh-60px)] place-items-center p-8 min-[769px]:min-h-[calc(100vh-68px)]">
        <ErrorState
          message={query.error.message}
          action={
            <Link className={buttonPrimary} to="/">
              Enviar outro PDF
            </Link>
          }
        />
      </main>
    )
  if (query.data.status === 'processando') return <ProcessingState id={id} />
  if (query.data.status === 'erro')
    return (
      <main className="grid min-h-[calc(100vh-60px)] place-items-center p-8 min-[769px]:min-h-[calc(100vh-68px)]">
        <ErrorState
          message={query.data.erro ?? 'O processamento não foi concluído.'}
          action={
            <Link className={buttonPrimary} to="/">
              Tentar com outro arquivo
            </Link>
          }
        />
      </main>
    )
  if (!draft)
    return (
      <main className="grid min-h-[calc(100vh-60px)] place-items-center p-8 min-[769px]:min-h-[calc(100vh-68px)]">
        <ErrorState
          message="A transcrição foi concluída sem dados revisáveis."
          action={
            <Link className={buttonPrimary} to="/">
              Voltar ao início
            </Link>
          }
        />
      </main>
    )

  const timeCard = isTimeCardValue(draft)
  return (
    <main className="flex min-h-[calc(100vh-60px)] flex-col overflow-visible min-[769px]:h-[calc(100vh-68px)] min-[769px]:min-h-155 min-[769px]:overflow-hidden">
      <header className="sticky top-0 z-10 flex min-h-20 flex-col items-stretch justify-between gap-2.5 border-b border-slate-200 bg-white px-3 py-2.5 min-[769px]:static min-[769px]:flex-row min-[769px]:items-center min-[769px]:gap-5 min-[769px]:px-6 min-[769px]:py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className={iconButton} aria-label="Voltar">
            <ArrowLeftIcon />
          </Link>
          <div>
            <span className={`${eyebrow} hidden min-[421px]:block`}>Revisão da transcrição</span>
            <h1 className="font-display text-[17px] font-bold tracking-tight min-[769px]:text-xl">
              {timeCard ? 'Cartão de ponto' : 'Holerite'}
            </h1>
          </div>
          <span
            className={`ml-auto hidden h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold min-[421px]:inline-flex min-[769px]:ml-0 ${dirty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}
          >
            {dirty ? (
              'Alterações não salvas'
            ) : (
              <>
                <CheckIcon className="size-3.5" /> Salvo
              </>
            )}
          </span>
        </div>
        <div className="grid grid-cols-1 items-center gap-2 min-[421px]:grid-cols-[1fr_1.25fr] min-[769px]:flex min-[769px]:gap-3">
          <button
            className={buttonSecondary}
            type="button"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate(draft)}
          >
            <SaveIcon /> {saveMutation.isPending ? 'Salvando…' : 'Salvar correções'}
          </button>
          <div className="grid grid-cols-[82px_1fr] items-center gap-1.5 min-[769px]:flex min-[769px]:border-l min-[769px]:border-slate-200 min-[769px]:pl-3">
            <select
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-2.5 font-semibold text-slate-800 focus:border-navy-700 focus:outline-none focus:ring-3 focus:ring-blue-200/60 min-[769px]:w-auto"
              aria-label="Formato do download"
              value={format}
              onChange={(event) => setFormat(event.target.value as TranscriptionExportFormat)}
            >
              <option value="xlsx">XLSX</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <button
              className={buttonPrimary}
              type="button"
              disabled={saveMutation.isPending || downloadMutation.isPending}
              onClick={startDownload}
            >
              <DownloadIcon />{' '}
              {saveMutation.isPending || downloadMutation.isPending ? 'Preparando…' : 'Baixar'}
            </button>
          </div>
        </div>
      </header>
      {(saveMutation.error || downloadError) && (
        <div
          className="mx-6 mt-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800"
          role="alert"
        >
          {saveMutation.error?.message ?? downloadError}
        </div>
      )}
      <div className="grid flex-1 grid-cols-1 gap-2.5 p-2.5 min-[769px]:min-h-0 min-[769px]:grid-cols-[minmax(300px,.72fr)_minmax(500px,1.28fr)] min-[769px]:gap-3.5 min-[769px]:overflow-x-auto min-[1025px]:grid-cols-[minmax(340px,.82fr)_minmax(520px,1.18fr)] min-[1025px]:p-3.5">
        <section
          className="flex h-[58vh] min-h-95 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white min-[769px]:h-auto min-[769px]:min-h-0"
          aria-label="Documento original"
        >
          <div className={panelHeading}>
            <div className="flex items-center gap-2 font-bold [&_svg]:size-4.5 [&_svg]:text-navy-700">
              <FileIcon />
              <span>Documento original</span>
            </div>
            <a
              className="font-bold text-navy-700 underline-offset-2 hover:underline"
              href={getTranscriptionPdfUrl(id)}
              target="_blank"
              rel="noreferrer"
            >
              Abrir em nova guia
            </a>
          </div>
          <iframe
            className="w-full flex-1 border-0 bg-slate-200"
            src={`${getTranscriptionPdfUrl(id)}#toolbar=1&navpanes=0`}
            title="PDF original"
          />
        </section>
        <section
          className="flex min-h-130 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white min-[769px]:min-h-0"
          aria-label="Campos transcritos"
        >
          <div className={panelHeading}>
            <div className="flex items-center gap-2 font-bold">
              <span className="size-2 rounded-full bg-navy-700" /> <span>Campos transcritos</span>
            </div>
            <small className="hidden text-slate-500 min-[769px]:block">
              Edite o que não corresponder ao PDF
            </small>
          </div>
          <div className="flex-1 overflow-visible bg-slate-50 min-[769px]:min-h-0 min-[769px]:overflow-auto">
            {timeCard ? (
              <TimeCardEditor value={draft} onChange={changeDraft} />
            ) : (
              <PayrollEditor value={draft} onChange={changeDraft} />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function ProcessingState({ id }: { id: string }) {
  return (
    <main className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center bg-slate-50 p-8 text-center min-[769px]:min-h-[calc(100vh-68px)]">
      <div className="relative mb-7 grid size-23 place-items-center" aria-hidden="true">
        <span className="absolute size-9 animate-processing-pulse rounded-full border border-navy-800 bg-navy-800 motion-reduce:animate-none" />
        <span className="absolute size-16 animate-processing-pulse rounded-full border border-slate-400 [animation-delay:.3s] motion-reduce:animate-none" />
        <span className="absolute size-23 animate-processing-pulse rounded-full border border-slate-400 [animation-delay:.6s] motion-reduce:animate-none" />
      </div>
      <span className={eyebrow}>Transcrição #{id.slice(0, 8)}</span>
      <h1 className="mt-4 font-display text-[clamp(30px,5vw,48px)] font-extrabold tracking-[-.045em]">
        Lendo o documento…
      </h1>
      <p className="mt-3.5 max-w-135 leading-relaxed text-slate-500">
        Estamos identificando páginas, campos e possíveis incertezas. Você poderá revisar tudo antes
        do download.
      </p>
      <div className="my-8 h-1.5 w-full max-w-105 overflow-hidden rounded-full bg-slate-200">
        <span className="block h-full w-[35%] animate-processing-track bg-navy-700 motion-reduce:animate-none" />
      </div>
      <small className="text-slate-500">Esta página atualiza automaticamente.</small>
      <Link
        to="/"
        className="mt-7.5 inline-flex items-center gap-2 text-[13px] text-slate-500 no-underline hover:text-navy-700 [&_svg]:size-4"
      >
        <ArrowLeftIcon /> Cancelar e enviar outro
      </Link>
    </main>
  )
}
