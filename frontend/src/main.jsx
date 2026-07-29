import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { SHARE_DRAFT_STORAGE_KEY } from './constants/shareTarget'

// Runs before the router mounts so the shared payload survives a
// not-logged-in redirect (ProtectedRoute only preserves the pathname, not the
// query string) — stash it, then strip the query string from the URL.
const captureSharedExpenseDraft = () => {
  const params = new URLSearchParams(window.location.search)
  const sharedText = params.get('share_text')
  const sharedTitle = params.get('share_title')
  const sharedUrl = params.get('share_url')

  if (!sharedText && !sharedTitle && !sharedUrl) {
    return
  }

  localStorage.setItem(
    SHARE_DRAFT_STORAGE_KEY,
    JSON.stringify({ text: sharedText || '', title: sharedTitle || '', url: sharedUrl || '' }),
  )
  window.history.replaceState({}, '', window.location.pathname)
}

captureSharedExpenseDraft()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore service worker registration errors in development or unsupported browsers.
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
