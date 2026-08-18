import { AlertIcon } from './icons'

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="state-card" role="status">
      <span className="spinner" aria-hidden="true" />
      <strong>{label}</strong>
      <span>Aguarde só mais um instante.</span>
    </div>
  )
}

export function ErrorState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="state-card state-error" role="alert">
      <span className="state-icon"><AlertIcon /></span>
      <strong>Não foi possível continuar</strong>
      <span>{message}</span>
      {action}
    </div>
  )
}
