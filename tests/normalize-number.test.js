import { describe, it, expect } from 'vitest'
import { normalizeNumberInput } from '../normalize-number.js'

describe('normalizeNumberInput', () => {
  it('parses dot decimal and commas as thousands', () => {
    expect(normalizeNumberInput('1,234,567.89')).toBeCloseTo(1234567.89)
  })

  it('parses comma decimal and dots as thousands', () => {
    expect(normalizeNumberInput('1.234.567,89')).toBeCloseTo(1234567.89)
  })

  it('parses simple integers with commas as thousands', () => {
    expect(normalizeNumberInput('1,234')).toBeCloseTo(1234)
  })

  it('returns NaN for empty strings', () => {
    expect(Number.isNaN(normalizeNumberInput(''))).toBe(true)
  })
})
