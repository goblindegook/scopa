import React, { StrictMode } from 'react'
import './index.css'
import App from './App'
import * as serviceWorker from './serviceWorker'
import { createRoot } from 'react-dom/client'

const mount = document.getElementById('root')

if (mount) {
  const root = createRoot(mount)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister()
