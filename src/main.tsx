import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initUiTheme } from './store/uiStore'
import { installUnloadSave, watchStyleChanges } from './store/autosave'
import './index.css'
import './ui/controls.css'

initUiTheme()
watchStyleChanges()
installUnloadSave()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
