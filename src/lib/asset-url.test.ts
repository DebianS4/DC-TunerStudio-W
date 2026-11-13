import { describe, expect, it } from 'vitest'

import { assetUrl } from './asset-url'

describe('assetUrl', () => {
  it('keeps root deployments at the root', () => {
    expect(assetUrl('/logo192.png', '/')).toBe('/logo192.png')
  })

  it('prefixes GitHub Pages project paths', () => {
    expect(assetUrl('/downloads/dc-tuner-studio-source.zip', '/DC-TunerStudio-W/')).toBe(
      '/DC-TunerStudio-W/downloads/dc-tuner-studio-source.zip',
    )
  })

  it('normalizes the base when it has no trailing slash', () => {
    expect(assetUrl('manifest.json', '/DC-TunerStudio-W')).toBe(
      '/DC-TunerStudio-W/manifest.json',
    )
  })
})
