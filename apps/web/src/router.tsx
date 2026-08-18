import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { UploadPage } from './pages/upload-page'
import { TranscriptionPage } from './pages/transcription-page'

function RootLayout() {
  return (
    <div className="min-h-screen">
      <header className="flex h-15 items-center justify-between border-b border-white/10 bg-navy-950 px-4.5 text-white md:h-17 md:px-[clamp(20px,4vw,64px)]">
        <a
          href="/"
          className="inline-flex items-center gap-3 font-display font-extrabold tracking-tight no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-300/40"
          aria-label="Quick Filler - início"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-white text-[11px] font-bold text-navy-950 md:size-8.5">
            QF
          </span>
          <span>Quick Filler</span>
        </a>
        <span className="hidden text-[13px] text-slate-300 md:block">Transcrição trabalhista</span>
      </header>
      <Outlet />
    </div>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: UploadPage,
})
const transcriptionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transcricoes/$id',
  component: TranscriptionPage,
})
const routeTree = rootRoute.addChildren([indexRoute, transcriptionRoute])

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
