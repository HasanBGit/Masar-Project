import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Provide a working localStorage mock for all tests.
// jsdom sometimes skips or stubs browser storage APIs depending on the
// --localstorage-file flag; defining it here ensures every test file gets
// a consistent, in-memory implementation.
const localStorageStore: Record<string, string> = {}
const localStorageMock: Storage = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value },
  removeItem: (key: string) => { delete localStorageStore[key] },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) },
  get length() { return Object.keys(localStorageStore).length },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  cleanup()
  localStorageMock.clear()
  vi.clearAllMocks()
})

