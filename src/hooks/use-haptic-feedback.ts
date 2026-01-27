'use client'

import { useCallback } from 'react'

type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'

/**
 * Hook para proporcionar feedback háptico en dispositivos móviles
 * Compatible con iOS y Android (Progressive Enhancement)
 */
export function useHapticFeedback() {
  const triggerHaptic = useCallback((type: HapticFeedbackType = 'light') => {
    // Verificar si el navegador soporta la API de vibración
    if (!('vibrate' in navigator)) {
      return
    }

    try {
      // Patrones de vibración según el tipo
      const patterns: Record<HapticFeedbackType, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 30,
        selection: 5,
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [30, 100, 30, 100, 30],
      }

      const pattern = patterns[type] || patterns.light

      // Ejecutar vibración
      navigator.vibrate(pattern)
    } catch (error) {
      // Silenciosamente ignorar errores de vibración
      console.debug('Haptic feedback no disponible:', error)
    }
  }, [])

  return { triggerHaptic }
}
