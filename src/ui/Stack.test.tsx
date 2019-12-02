import React from 'react'
import { assert, property, integer, string } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Stack } from './Stack'

test('renders stack of cards', () => {
  assert(
    property(
      string().map(s => s.trim()),
      integer(1, 40),
      (title, size) => {
        cleanup()
        const { getByTitle } = render(<Stack title={title} size={size} />)
        const container = getByTitle(title)
        expect(container.children).toHaveLength(size)
      }
    )
  )
})
