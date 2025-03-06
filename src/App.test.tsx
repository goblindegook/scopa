import { cleanup } from '@testing-library/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, test } from 'vitest'
import App from './App'

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
