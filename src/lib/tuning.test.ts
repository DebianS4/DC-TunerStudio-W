import { describe, expect, it } from 'vitest'
import { correctVeForAfr, round } from './tuning'

describe('correctVeForAfr', () => {
  it('increases VE when measured AFR is leaner than target', () => {
    const corrected = correctVeForAfr(46.3, 17.12, 14.6, 0.6)

    expect(corrected).toBeGreaterThan(46.3)
    expect(round(corrected, 1)).toBe(49.4)
  })

  it('decreases VE when measured AFR is richer than target', () => {
    const corrected = correctVeForAfr(76, 9.5, 14.7, 0.6)

    expect(corrected).toBeLessThan(76)
    expect(round(corrected, 1)).toBe(71.6)
  })

  it('keeps VE unchanged when AFR matches the target', () => {
    expect(correctVeForAfr(50, 14.7, 14.7, 0.6)).toBe(50)
  })

  it('does not change VE for invalid AFR readings', () => {
    expect(correctVeForAfr(50, 0, 14.7, 0.6)).toBe(50)
    expect(correctVeForAfr(50, 14.7, Number.NaN, 0.6)).toBe(50)
  })

  it('keeps corrected values within the supported VE range', () => {
    expect(correctVeForAfr(134, 19, 10, 1)).toBeLessThanOrEqual(135)
    expect(correctVeForAfr(11, 9, 19, 1)).toBeGreaterThanOrEqual(10)
  })
})
