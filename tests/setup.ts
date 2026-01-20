import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Limpieza automática después de cada test
afterEach(() => {
  cleanup()
})
