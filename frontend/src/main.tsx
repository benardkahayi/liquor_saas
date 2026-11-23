import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dark.css'
import App from './App.tsx'
import { setUpPwa } from './lib/pwa'

// Install button + offline app files (production only).
setUpPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
