import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import type { DocumentType } from '@quick-filler/domain'
import { FileIcon, UploadIcon } from '../components/icons'
import { uploadTranscription } from '../lib/api'

const maxBytes = 15 * 1024 * 1024

export function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<DocumentType>('cartao-ponto')
  const [localError, setLocalError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => uploadTranscription(file!, type),
    onSuccess: ({ id }) => navigate({ to: '/transcricoes/$id', params: { id } }),
  })

  function selectFile(next: File | undefined) {
    setLocalError(null)
    if (!next) return setFile(null)
    if (!next.name.toLowerCase().endsWith('.pdf')) {
      setFile(null)
      return setLocalError('Selecione um arquivo com extensão .pdf.')
    }
    if (next.size > maxBytes) {
      setFile(null)
      return setLocalError('O arquivo excede o limite de 15 MB.')
    }
    setFile(next)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) return setLocalError('Selecione um PDF para continuar.')
    mutation.mutate()
  }

  return (
    <main className="upload-page">
      <section className="upload-intro" aria-labelledby="upload-title">
        <span className="product-kicker">PDF para planilha, com revisão humana</span>
        <h1 id="upload-title">Comece pelo documento.</h1>
        <p>Envie um cartão de ponto ou holerite. Você revisa cada campo antes de gerar a planilha.</p>
        <ol className="flow-steps" aria-label="Etapas do processo">
          <li className="active"><span>1</span><div><strong>Enviar</strong><small>PDF e tipo</small></div></li>
          <li><span>2</span><div><strong>Revisar</strong><small>PDF lado a lado</small></div></li>
          <li><span>3</span><div><strong>Baixar</strong><small>XLSX, CSV ou JSON</small></div></li>
        </ol>
        <div className="privacy-note"><span>24h</span><p><strong>Retenção curta</strong>O PDF e a transcrição expiram automaticamente.</p></div>
      </section>

      <section className="upload-panel">
        <form onSubmit={submit}>
          <div className="field-group">
            <span className="field-label">Qual é o documento?</span>
            <div className="segmented-control">
              <label className={type === 'cartao-ponto' ? 'selected' : ''}><input type="radio" name="type" value="cartao-ponto" checked={type === 'cartao-ponto'} onChange={() => setType('cartao-ponto')} /><span>Cartão de ponto</span><small>Dias e batidas</small></label>
              <label className={type === 'holerite' ? 'selected' : ''}><input type="radio" name="type" value="holerite" checked={type === 'holerite'} onChange={() => setType('holerite')} /><span>Holerite</span><small>Verbas e bases</small></label>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="pdf-file">Arquivo PDF</label>
            <button className={`drop-zone ${file ? 'has-file' : ''}`} type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]) }}>
              <input ref={inputRef} id="pdf-file" type="file" accept="application/pdf,.pdf" onChange={(event) => selectFile(event.target.files?.[0])} />
              <span className="drop-icon">{file ? <FileIcon /> : <UploadIcon />}</span>
              {file ? <><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · Clique para trocar</small></> : <><strong>Arraste o PDF ou clique para selecionar</strong><small>Até 15 MB</small></>}
            </button>
          </div>

          {(localError || mutation.error) && <div className="form-error" role="alert">{localError ?? mutation.error?.message}</div>}
          <button className="button button-primary submit-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <><span className="button-spinner" /> Enviando arquivo…</> : <>Transcrever documento <span aria-hidden="true">→</span></>}
          </button>
          <p className="upload-footnote">A validação final do arquivo acontece com segurança no servidor.</p>
        </form>
      </section>
    </main>
  )
}
