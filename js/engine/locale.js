/**
 * Locale helpers shared by the engine, the app shell and the node tests.
 * Pure functions only — no DOM access, so tests can import this directly.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author). Fixes made there should be reconciled with this copy.
 */

export const LOCALES = ['en', 'ko'];
export const DEFAULT_LOCALE = 'en';

/** True when `value` carries a non-empty string for every supported locale. */
export function isLocalized(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return LOCALES.every((loc) => typeof value[loc] === 'string' && value[loc].trim() !== '');
}

/**
 * Read a display string out of a plain string or a {en, ko} record.
 * Falls back to the default locale, then to any available string.
 */
export function pickText(value, locale = DEFAULT_LOCALE) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return String(value);
  const wanted = value[locale];
  if (typeof wanted === 'string' && wanted !== '') return wanted;
  const fallback = value[DEFAULT_LOCALE];
  if (typeof fallback === 'string' && fallback !== '') return fallback;
  for (const loc of LOCALES) {
    if (typeof value[loc] === 'string' && value[loc] !== '') return value[loc];
  }
  return '';
}

/** Normalize an arbitrary value to a supported locale code. */
export function coerceLocale(value) {
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}
