import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { App } from './App'
import { ThemeProvider } from './context/ThemeContext'

// Registers the service worker (fallback shell + Web Push). New versions are
// kept waiting until the user taps "Actualizar" instead of reloading silently.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast('Nueva versión disponible', {
      description: 'Pulsa Actualizar para aplicar los últimos cambios.',
      duration: Infinity,
      id: 'pwa-update',
      action: {
        label: 'Actualizar',
        onClick: () => updateSW(true),
      },
    })
  },
  onOfflineReady() {
    toast.success('La app ya está lista para usarse sin conexión.')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            },
          }}
          richColors
        />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
