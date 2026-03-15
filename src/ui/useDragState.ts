import React from 'react'
import type { Card } from '../engine/cards'

interface Position {
  x: number
  y: number
}

interface PointerDragState {
  readonly type: 'pointer'
  readonly card: Card
  readonly pointerId: number
  readonly origin: Position
  readonly offset: Position
  readonly position: Position
  readonly active: boolean
}

interface ReturnDragState {
  readonly type: 'returning'
  readonly card: Card
  readonly from: Position
  readonly to: Position
}

export type DragState = PointerDragState | ReturnDragState | null

type OnDropCallback = (card: Card, position: Position, pointer: Position) => boolean

export function useDragState(enabled: boolean, onDrop: OnDropCallback) {
  const [dragState, setDragStateState] = React.useState<DragState>(null)
  const dragStateRef = React.useRef<DragState>(dragState)
  const suppressClickRef = React.useRef(false)

  React.useEffect(() => {
    if (!enabled) {
      dragStateRef.current = null
      setDragStateState(null)
      return
    }

    if (dragState?.type !== 'pointer') return

    const finishDrag = (wasActive: boolean, nextState: DragState) => {
      suppressClickRef.current = wasActive
      dragStateRef.current = nextState
      setDragStateState(nextState)
      if (!wasActive) return
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }

    const onPointerDragMove = (event: PointerEvent) => {
      const current = dragStateRef.current
      if (current?.type !== 'pointer' || event.pointerId !== current.pointerId) return
      const dx = event.clientX - current.origin.x
      const dy = event.clientY - current.origin.y
      const active = current.active || Math.hypot(dx, dy) > 6
      const nextState = { ...current, active, position: { x: event.clientX, y: event.clientY } }
      dragStateRef.current = nextState
      setDragStateState(nextState)
    }

    const onPointerDragEnd = (event: PointerEvent) => {
      const current = dragStateRef.current
      if (current?.type !== 'pointer' || event.pointerId !== current.pointerId) return

      if (!current.active) {
        finishDrag(false, null)
        return
      }

      const dropPosition = {
        x: current.position.x - current.offset.x,
        y: current.position.y - current.offset.y,
      }

      if (enabled && onDrop(current.card, dropPosition, { x: event.clientX, y: event.clientY })) {
        finishDrag(true, null)
        return
      }

      const originalPosition = { x: current.origin.x - current.offset.x, y: current.origin.y - current.offset.y }

      finishDrag(true, {
        type: 'returning',
        card: current.card,
        from: dropPosition,
        to: originalPosition,
      })
    }

    window.addEventListener('pointermove', onPointerDragMove)
    window.addEventListener('pointerup', onPointerDragEnd)
    window.addEventListener('pointercancel', onPointerDragEnd)

    return () => {
      window.removeEventListener('pointermove', onPointerDragMove)
      window.removeEventListener('pointerup', onPointerDragEnd)
      window.removeEventListener('pointercancel', onPointerDragEnd)
    }
  }, [dragState, enabled, onDrop])

  const startDragging = React.useCallback(
    (card: Card, element: Element, position: Position, pointerId: number) => {
      if (!enabled) return
      const rect = element.getBoundingClientRect()
      const nextState: DragState = {
        type: 'pointer',
        card,
        pointerId,
        origin: position,
        offset: { x: position.x - rect.left, y: position.y - rect.top },
        position: position,
        active: false,
      }
      dragStateRef.current = nextState
      setDragStateState(nextState)
    },
    [enabled],
  )

  const isClickSuppressed = React.useCallback(() => suppressClickRef.current, [])

  return {
    isClickSuppressed,
    dragState,
    startDragging,
    clearDragging: () => {
      dragStateRef.current = null
      setDragStateState(null)
    },
  } as const
}
