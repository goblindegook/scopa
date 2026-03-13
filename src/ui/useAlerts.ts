import React from 'react'

export function useAlerts(timeoutMs: number): readonly [string, (message: string) => void] {
  const [alert, setAlert] = React.useState('')
  const alertTimeoutRef = React.useRef<number | null>(null)

  const showAlert = React.useCallback(
    (message: string) => {
      if (!message) return
      if (alertTimeoutRef.current != null) {
        window.clearTimeout(alertTimeoutRef.current)
      }
      setAlert(message)
      alertTimeoutRef.current = window.setTimeout(() => {
        setAlert('')
        alertTimeoutRef.current = null
      }, timeoutMs)
    },
    [timeoutMs],
  )

  React.useEffect(
    () => () => {
      if (alertTimeoutRef.current != null) {
        window.clearTimeout(alertTimeoutRef.current)
      }
    },
    [],
  )

  return [alert, showAlert] as const
}
