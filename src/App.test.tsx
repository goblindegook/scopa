import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { afterEach, test } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

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
