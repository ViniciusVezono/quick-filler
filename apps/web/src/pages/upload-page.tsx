import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import type { DocumentType } from '@quick-filler/domain'
import { FileIcon, UploadIcon } from '../components/icons'
import { buttonPrimary, eyebrow } from '../components/ui-classes'
import { transcriptionMutations } from '../transcription/transcription.queries'

const maxBytes = 15 * 1024 * 1024

export function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<DocumentType>('cartao-ponto')
  const [localError, setLocalError] = useState<string | null>(null)
  const mutation = useMutation({
    ...transcriptionMutations.upload(),
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
    mutation.mutate({ file, type })
  }

  return (
    <main className="grid min-h-[calc(100vh-60px)] min-[769px]:min-h-[calc(100vh-68px)] min-[769px]:grid-cols-[minmax(340px,.9fr)_minmax(420px,1.1fr)]">
      <section
        className="relative overflow-hidden bg-navy-900 px-6 py-12 text-white after:absolute after:-right-52 after:-bottom-52 after:size-85 after:rounded-full after:border-[70px] after:border-white/[.035] min-[769px]:px-[clamp(28px,7vw,96px)] min-[769px]:py-[clamp(52px,8vw,110px)]"
        aria-labelledby="upload-title"
      >
        <span className={`${eyebrow} text-blue-200`}>PDF para planilha, com revisão humana</span>
        <h1
          id="upload-title"
          className="mt-4.5 max-w-135 font-display text-[43px] leading-[1.02] font-extrabold tracking-[-.055em] min-[769px]:text-[clamp(38px,5vw,64px)]"
        >
          Comece pelo documento.
        </h1>
        <p className="mt-5.5 max-w-125 text-base leading-relaxed text-slate-300 min-[769px]:text-lg">
          Envie um cartão de ponto ou holerite. Você revisa cada campo antes de gerar a planilha.
        </p>
        <ol
          className="mt-9 grid max-w-110 grid-cols-3 list-none p-0 min-[769px]:mt-13 min-[769px]:grid-cols-1 min-[769px]:gap-0.5"
          aria-label="Etapas do processo"
        >
          <li className="grid min-h-18 justify-items-center gap-2 border-t border-blue-300 px-2 py-2.5 text-center text-blue-200 min-[769px]:flex min-[769px]:min-h-16 min-[769px]:items-center min-[769px]:gap-4 min-[769px]:border-t-0 min-[769px]:border-l min-[769px]:pl-6 min-[769px]:text-left">
            <span className="grid size-7.5 shrink-0 place-items-center rounded-full border border-white bg-white text-xs font-bold text-navy-950">
              1
            </span>
            <div className="grid gap-1">
              <strong className="text-sm text-white">Enviar</strong>
              <small className="hidden text-xs min-[769px]:block">PDF e tipo</small>
            </div>
          </li>
          <li className="grid min-h-18 justify-items-center gap-2 border-t border-blue-950 px-2 py-2.5 text-center text-slate-400 min-[769px]:flex min-[769px]:min-h-16 min-[769px]:items-center min-[769px]:gap-4 min-[769px]:border-t-0 min-[769px]:border-l min-[769px]:border-blue-950 min-[769px]:pl-6 min-[769px]:text-left">
            <span className="grid size-7.5 shrink-0 place-items-center rounded-full border border-slate-500 text-xs font-bold">
              2
            </span>
            <div className="grid gap-1">
              <strong className="text-sm text-slate-300">Revisar</strong>
              <small className="hidden text-xs min-[769px]:block">PDF lado a lado</small>
            </div>
          </li>
          <li className="grid min-h-18 justify-items-center gap-2 border-t border-blue-950 px-2 py-2.5 text-center text-slate-400 min-[769px]:flex min-[769px]:min-h-16 min-[769px]:items-center min-[769px]:gap-4 min-[769px]:border-t-0 min-[769px]:border-l min-[769px]:border-blue-950 min-[769px]:pl-6 min-[769px]:text-left">
            <span className="grid size-7.5 shrink-0 place-items-center rounded-full border border-slate-500 text-xs font-bold">
              3
            </span>
            <div className="grid gap-1">
              <strong className="text-sm text-slate-300">Baixar</strong>
              <small className="hidden text-xs min-[769px]:block">XLSX, CSV ou JSON</small>
            </div>
          </li>
        </ol>
        <div className="mt-7.5 flex max-w-110 items-center gap-4 border-t border-white/10 pt-7 min-[769px]:mt-12">
          <span className="grid size-13 shrink-0 place-items-center rounded-full bg-white/10 font-bold">
            24h
          </span>
          <p className="grid gap-1 text-[13px] leading-snug text-slate-400">
            <strong className="text-sm text-slate-200">Retenção curta</strong>O PDF e a transcrição
            expiram automaticamente.
          </p>
        </div>
      </section>

      <section className="grid place-items-center bg-slate-50 px-4 py-6 min-[769px]:px-[clamp(24px,8vw,120px)] min-[769px]:py-[clamp(40px,7vw,100px)]">
        <form
          className="w-full max-w-155 rounded-2xl border border-slate-200 bg-white p-4.5 shadow-[0_16px_50px_rgba(16,42,86,.09)] min-[769px]:p-[clamp(26px,4vw,42px)]"
          onSubmit={submit}
        >
          <div>
            <span className="mb-3 block text-[13px] font-bold text-slate-700">
              Qual é o documento?
            </span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label
                className={`grid min-h-21 cursor-pointer content-center gap-1 rounded-xl border p-4 transition hover:border-slate-400 ${type === 'cartao-ponto' ? 'border-2 border-navy-700 bg-blue-50 p-[15px]' : 'border-slate-200'}`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="type"
                  value="cartao-ponto"
                  checked={type === 'cartao-ponto'}
                  onChange={() => setType('cartao-ponto')}
                />
                <span className="font-bold">Cartão de ponto</span>
                <small className="text-slate-500">Dias e batidas</small>
              </label>
              <label
                className={`grid min-h-21 cursor-pointer content-center gap-1 rounded-xl border p-4 transition hover:border-slate-400 ${type === 'holerite' ? 'border-2 border-navy-700 bg-blue-50 p-[15px]' : 'border-slate-200'}`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="type"
                  value="holerite"
                  checked={type === 'holerite'}
                  onChange={() => setType('holerite')}
                />
                <span className="font-bold">Holerite</span>
                <small className="text-slate-500">Verbas e bases</small>
              </label>
            </div>
          </div>

          <div className="mt-7.5">
            <label className="mb-3 block text-[13px] font-bold text-slate-700" htmlFor="pdf-file">
              Arquivo PDF
            </label>
            <button
              className={`flex min-h-47.5 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-7 transition hover:border-navy-700 hover:bg-blue-50/50 ${file ? 'border-solid border-slate-400 bg-blue-50/50' : 'border-slate-300 bg-slate-50/50'}`}
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                selectFile(event.dataTransfer.files[0])
              }}
            >
              <input
                className="sr-only"
                ref={inputRef}
                id="pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
              <span className="mb-1 grid size-11.5 place-items-center rounded-xl bg-blue-100 text-navy-700 [&_svg]:size-6">
                {file ? <FileIcon /> : <UploadIcon />}
              </span>
              {file ? (
                <>
                  <strong className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                    {file.name}
                  </strong>
                  <small className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · Clique para trocar
                  </small>
                </>
              ) : (
                <>
                  <strong className="text-sm">Arraste o PDF ou clique para selecionar</strong>
                  <small className="text-xs text-slate-500">Até 15 MB</small>
                </>
              )}
            </button>
          </div>

          {(localError || mutation.error) && (
            <div
              className="mt-4.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800"
              role="alert"
            >
              {localError ?? mutation.error?.message}
            </div>
          )}
          <button
            className={`${buttonPrimary} mt-6 w-full`}
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{' '}
                Enviando arquivo…
              </>
            ) : (
              <>
                Transcrever documento <span aria-hidden="true">→</span>
              </>
            )}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">
            A validação final do arquivo acontece com segurança no servidor.
          </p>
        </form>
      </section>
    </main>
  )
}
