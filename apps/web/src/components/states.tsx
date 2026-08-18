import { AlertIcon } from './icons'

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <div
      className="flex w-full max-w-110 flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-[0_16px_50px_rgba(16,42,86,.09)]"
      role="status"
    >
      <span
        className="mb-2 size-8.5 animate-spin rounded-full border-3 border-slate-200 border-t-navy-700"
        aria-hidden="true"
      />
      <strong>{label}</strong>
      <span className="leading-relaxed text-slate-500">Aguarde só mais um instante.</span>
    </div>
  )
}

export function ErrorState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div
      className="flex w-full max-w-110 flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-[0_16px_50px_rgba(16,42,86,.09)]"
      role="alert"
    >
      <span className="grid size-12 place-items-center rounded-full bg-red-50 text-red-700 [&_svg]:size-6">
        <AlertIcon />
      </span>
      <strong>Não foi possível continuar</strong>
      <span className="leading-relaxed text-slate-500">{message}</span>
      <div className="mt-3">{action}</div>
    </div>
  )
}
