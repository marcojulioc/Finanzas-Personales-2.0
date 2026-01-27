'use client'

import { useEffect, useState } from 'react'

/**
 * Hook para detectar media queries
 * @param query - Media query string (ej: '(max-width: 768px)')
 * @returns boolean - true si el media query coincide
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Verificar si estamos en el cliente
    if (typeof window === 'undefined') {
      return
    }

    const media = window.matchMedia(query)
    
    // Establecer el valor inicial
    setMatches(media.matches)

    // Función para actualizar el estado cuando cambia el media query
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Agregar listener
    media.addEventListener('change', listener)

    // Cleanup
    return () => {
      media.removeEventListener('change', listener)
    }
  }, [query])

  return matches
}
