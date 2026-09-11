import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { App } from './App'
import { ThemeProvider } from './context/ThemeContext'

// Registers the service worker (fallback shell + Web Push). immediate: true
// activates updates as soon as they install (autoUpdate).
registerSW({ immediate: true })

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
