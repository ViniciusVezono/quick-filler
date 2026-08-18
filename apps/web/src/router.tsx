import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { UploadPage } from './pages/upload-page'

function RootLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="brand" aria-label="Quick Filler - início"><span className="brand-mark">QF</span><span>Quick Filler</span></a>
        <span className="header-caption">Transcrição trabalhista</span>
      </header>
      <Outlet />
    </div>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: UploadPage })
const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
