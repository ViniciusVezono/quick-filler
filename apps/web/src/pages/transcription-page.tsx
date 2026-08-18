import { isTimeCardValue, type TranscriptionValue } from '@quick-filler/domain'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeftIcon, CheckIcon, DownloadIcon, FileIcon, SaveIcon } from '../components/icons'
import { ErrorState, Spinner } from '../components/states'
import { PayrollEditor } from '../features/review/payroll-editor'
import { TimeCardEditor } from '../features/review/time-card-editor'
import { downloadTranscription, getTranscription, pdfUrl, saveTranscription } from '../lib/api'

export function TranscriptionPage() {
  const { id } = useParams({ from: '/transcricoes/$id' })
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<TranscriptionValue | null>(null)
  const [dirty, setDirty] = useState(false)
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx')
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['transcription', id],
    queryFn: () => getTranscription(id),
    refetchInterval: ({ state }) => state.data?.status === 'processando' ? 1200 : false,
  })
  const saveMutation = useMutation({
    mutationFn: (value: TranscriptionValue) => saveTranscription(id, value),
    onSuccess: (result) => {
      queryClient.setQueryData(['transcription', id], result)
      setDraft(result.value)
      setDirty(false)
    },
  })
  const downloadMutation = useMutation({
    mutationFn: async () => {
      setDownloadError(null)
      if (!draft) return
      if (dirty) await saveMutation.mutateAsync(draft)
      await downloadTranscription(id, format)
    },
    onError: (error) => setDownloadError(error.message),
  })

  useEffect(() => {
    if (query.data?.value && !dirty) setDraft(structuredClone(query.data.value))
  }, [query.data?.value, dirty])

  function changeDraft(value: TranscriptionValue) {
    setDraft(value)
    setDirty(true)
  }

  if (query.isPending) return <main className="centered-page"><Spinner label="Abrindo a transcrição" /></main>
  if (query.isError) return <main className="centered-page"><ErrorState message={query.error.message} action={<Link className="button button-primary" to="/">Enviar outro PDF</Link>} /></main>
  if (query.data.status === 'processando') return <ProcessingState id={id} />
  if (query.data.status === 'erro') return <main className="centered-page"><ErrorState message={query.data.erro ?? 'O processamento não foi concluído.'} action={<Link className="button button-primary" to="/">Tentar com outro arquivo</Link>} /></main>
  if (!draft) return <main className="centered-page"><ErrorState message="A transcrição foi concluída sem dados revisáveis." action={<Link className="button button-primary" to="/">Voltar ao início</Link>} /></main>

  const timeCard = isTimeCardValue(draft)
  return (
    <main className="review-page">
      <header className="review-toolbar">
        <div className="toolbar-title">
          <Link to="/" className="icon-button back-button" aria-label="Voltar"><ArrowLeftIcon /></Link>
          <div><span className="eyebrow">Revisão da transcrição</span><h1>{timeCard ? 'Cartão de ponto' : 'Holerite'}</h1></div>
          <span className={`dirty-status ${dirty ? 'is-dirty' : ''}`}>{dirty ? 'Alterações não salvas' : <><CheckIcon /> Salvo</>}</span>
        </div>
        <div className="toolbar-actions">
          <button className="button button-secondary" type="button" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate(draft)}><SaveIcon /> {saveMutation.isPending ? 'Salvando…' : 'Salvar correções'}</button>
          <div className="download-control">
            <select aria-label="Formato do download" value={format} onChange={(event) => setFormat(event.target.value as typeof format)}><option value="xlsx">XLSX</option><option value="csv">CSV</option><option value="json">JSON</option></select>
            <button className="button button-primary" type="button" disabled={downloadMutation.isPending} onClick={() => downloadMutation.mutate()}><DownloadIcon /> {downloadMutation.isPending ? 'Preparando…' : 'Baixar'}</button>
          </div>
        </div>
      </header>
      {(saveMutation.error || downloadError) && <div className="global-error" role="alert">{saveMutation.error?.message ?? downloadError}</div>}
      <div className="review-grid">
        <section className="pdf-panel" aria-label="Documento original">
          <div className="panel-heading"><div><FileIcon /><span>Documento original</span></div><a href={pdfUrl(id)} target="_blank" rel="noreferrer">Abrir em nova guia</a></div>
          <iframe src={`${pdfUrl(id)}#toolbar=1&navpanes=0`} title="PDF original" />
        </section>
        <section className="transcription-panel" aria-label="Campos transcritos">
          <div className="panel-heading"><div><span className="panel-dot" /> <span>Campos transcritos</span></div><small>Edite o que não corresponder ao PDF</small></div>
          <div className="editor-scroll">
            {timeCard ? <TimeCardEditor value={draft} onChange={changeDraft} /> : <PayrollEditor value={draft} onChange={changeDraft} />}
          </div>
        </section>
      </div>
    </main>
  )
}

function ProcessingState({ id }: { id: string }) {
  return (
    <main className="processing-page">
      <div className="processing-visual" aria-hidden="true"><span /><span /><span /></div>
      <span className="product-kicker">Transcrição #{id.slice(0, 8)}</span>
      <h1>Lendo o documento…</h1>
      <p>Estamos identificando páginas, campos e possíveis incertezas. Você poderá revisar tudo antes do download.</p>
      <div className="processing-track"><span /></div>
      <small>Esta página atualiza automaticamente.</small>
      <Link to="/" className="quiet-link"><ArrowLeftIcon /> Cancelar e enviar outro</Link>
    </main>
  )
}
