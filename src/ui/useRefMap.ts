import React from 'react'

export function useRefMap<K>() {
  const refs = React.useRef(new Map<K, HTMLElement>())
  const callbacks = React.useRef(new Map<K, (el?: HTMLElement | null) => void>())
  const getRef = React.useCallback((key: K) => {
    const existing = callbacks.current.get(key)
    if (existing) return existing
    const callback = (el?: HTMLElement | null) => {
      if (el) refs.current.set(key, el)
      else refs.current.delete(key)
    }
    callbacks.current.set(key, callback)
    return callback
  }, [])
  return [refs, getRef] as const
}
