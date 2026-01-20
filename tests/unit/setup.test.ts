import { describe, it, expect } from 'vitest'

describe('Test Setup', () => {
  it('should run tests correctly', () => {
    expect(true).toBe(true)
  })

  it('should have access to DOM matchers', () => {
    const element = document.createElement('div')
    element.textContent = 'Hello'
    document.body.appendChild(element)

    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent('Hello')
  })
})
