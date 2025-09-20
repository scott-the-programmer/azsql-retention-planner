import { render } from 'preact'
import '@picocss/pico/css/pico.min.css'
import './index.css'
import { App } from './app.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'

render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
  document.getElementById('app')!
)
