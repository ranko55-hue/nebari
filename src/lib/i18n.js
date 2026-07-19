/**
 * i18n.js — tiny translation helper. No library needed at this size.
 *
 * Usage:
 *   import { t, setLocale, getLocale } from './lib/i18n'
 *   t('import.title')                          -> 'Bring your history in'
 *   t('import.uploading', { done: 3, total: 9 }) -> 'Uploading 3 of 9…'
 *
 * English is the default (decision #009). Hebrew flips the document to RTL.
 */

import en from '../locales/en'
import he from '../locales/he'

const locales = { en, he }
const RTL = new Set(['he'])

let current = localStorage.getItem('nebari_locale') || 'en'

export function getLocale() {
  return current
}

export function setLocale(code) {
  if (!locales[code]) return
  current = code
  localStorage.setItem('nebari_locale', code)
  document.documentElement.lang = code
  document.documentElement.dir = RTL.has(code) ? 'rtl' : 'ltr'
}

// apply direction on first load
setLocale(current)

/** Look up a dot-path key with {placeholder} interpolation. */
export function t(key, params) {
  const parts = key.split('.')

  let node = locales[current]
  for (const p of parts) {
    node = node?.[p]
    if (node === undefined) break
  }

  // fall back to English so a missing Hebrew key never shows raw key names
  if (node === undefined) {
    node = locales.en
    for (const p of parts) {
      node = node?.[p]
      if (node === undefined) return key
    }
  }

  if (typeof node !== 'string') return key

  if (!params) return node
  return node.replace(/\{(\w+)\}/g, (_, name) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  )
}
