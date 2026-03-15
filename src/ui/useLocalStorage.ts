import { useCallback, useState } from 'react'

type Updater<T> = T | ((current: T) => T)

export function useLocalStorage<T>(key: string, fallback: T): [T, (updater: Updater<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    const raw = window?.localStorage?.getItem?.(`scopa:${key}`) ?? null
    if (raw == null) return fallback
    try {
      return JSON.parse(raw) ?? fallback
    } catch {
      return raw as unknown as T
    }
  })

  const update = useCallback(
    (updater: Updater<T>) => {
      setValue((current) => {
        const next = typeof updater === 'function' ? (updater as (current: T) => T)(current) : updater
        window?.localStorage?.setItem?.(`scopa:${key}`, JSON.stringify(next))
        return next
      })
    },
    [key],
  )

  return [value, update]
}
