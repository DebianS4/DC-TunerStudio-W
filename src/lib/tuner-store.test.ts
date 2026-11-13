import { describe, expect, it } from 'vitest'
import { shouldRunSimulation } from './tuner-store'

describe('shouldRunSimulation', () => {
  it('stops simulation while live ECU telemetry is active', () => {
    expect(shouldRunSimulation({ status: 'connected', live: true })).toBe(false)
  })

  it('allows simulation when the ECU is disconnected or telemetry is paused', () => {
    expect(shouldRunSimulation({ status: 'disconnected', live: false })).toBe(true)
    expect(shouldRunSimulation({ status: 'connected', live: false })).toBe(true)
  })
})
