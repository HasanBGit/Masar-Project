import { describe, it, expect, beforeEach, vi } from 'vitest'
import type i18nType from 'i18next'

const STORAGE_KEY = 'truepoint-language'

/** Imports a fresh copy of the i18n module and waits for init to finish. */
async function loadI18n(): Promise<typeof i18nType> {
  const mod = await import('./index')
  const i18n = mod.default
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on('initialized', () => resolve()))
  }
  return i18n
}

describe('i18n', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.lang = ''
    document.documentElement.removeAttribute('dir')
  })

  it('resolves a stored regional code (ar-SA) to Arabic with dir=rtl', async () => {
    localStorage.setItem(STORAGE_KEY, 'ar-SA')
    const i18n = await loadI18n()

    expect((i18n.resolvedLanguage ?? i18n.language).split('-')[0]).toBe('ar')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('defaults to English with dir=ltr when nothing is stored', async () => {
    await loadI18n()

    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
  })

  it('persists the chosen language under the truepoint-language key', async () => {
    const i18n = await loadI18n()
    await i18n.changeLanguage('ar')

    expect(localStorage.getItem(STORAGE_KEY)).toBe('ar')

    // A fresh load must come back up in Arabic from the stored preference.
    vi.resetModules()
    const reloaded = await loadI18n()
    expect((reloaded.resolvedLanguage ?? reloaded.language).split('-')[0]).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('flips document.dir when the language changes, and en maps to ltr', async () => {
    const i18n = await loadI18n()

    await i18n.changeLanguage('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')

    await i18n.changeLanguage('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('en')
  })

  it('normalizes regional codes passed through changeLanguage', async () => {
    const i18n = await loadI18n()

    await i18n.changeLanguage('ar-SA')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })
})
