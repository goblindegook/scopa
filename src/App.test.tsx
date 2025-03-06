import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

test('render without crashing', () => {
  const div = document.createElement('div')
  const root = createRoot(div)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  root.unmount()
})
