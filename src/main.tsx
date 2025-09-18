import { render } from 'preact'
import '@picocss/pico/css/pico.min.css'
import './index.css'
import { App } from './app.tsx'

render(<App />, document.getElementById('app')!)
