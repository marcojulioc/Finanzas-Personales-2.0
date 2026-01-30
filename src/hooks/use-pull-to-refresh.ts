'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useHapticFeedback } from './use-haptic-feedback'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean
  pullDistance: number
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const { triggerHaptic } = useHapticFeedback()

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return
    const touch = e.touches[0]
    if (!touch) return

    startY.current = touch.clientY
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || startY.current === 0) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) {
      startY.current = 0
      setPullDistance(0)
      return
    }
    const touch = e.touches[0]
    if (!touch) return

    currentY.current = touch.clientY
    const distance = Math.max(0, currentY.current - startY.current)

    // Apply resistance
    const resistance = 0.5
    const resistedDistance = distance * resistance

    setPullDistance(Math.min(resistedDistance, threshold * 1.5))

    if (resistedDistance >= threshold) {
      triggerHaptic('light')
    }
  }, [disabled, isRefreshing, threshold, triggerHaptic])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      triggerHaptic('medium')

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
    startY.current = 0
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh, triggerHaptic])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    isRefreshing,
    pullDistance,
    containerRef,
  }
}
