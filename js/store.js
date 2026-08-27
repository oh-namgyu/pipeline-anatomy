/**
 * localStorage-backed preferences and progress.
 * Every access is guarded: a browser with storage disabled still runs the app,
 * it just forgets between visits.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author). Fixes made there should be reconciled with this copy.
 */

import { coerceLocale, DEFAULT_LOCALE } from './engine/locale.js';

const LOCALE_KEY = 'pipeline-anatomy.locale';
const PROGRESS_KEY = 'pipeline-anatomy.progress';

function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — preferences simply do not persist */
  }
}

/** The stored locale, or the default. */
export function readLocale() {
  try {
    return coerceLocale(window.localStorage.getItem(LOCALE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeLocale(locale) {
  try {
    window.localStorage.setItem(LOCALE_KEY, coerceLocale(locale));
  } catch {
    /* ignore */
  }
}

/** `{[lessonId]: {step, total, done}}` */
export function readProgress() {
  const value = readJSON(PROGRESS_KEY, {});
  return value && typeof value === 'object' ? value : {};
}

/**
 * Record the furthest step reached in a lesson. Stepping through marks a
 * lesson as viewed; only the quiz marks it done (see markComplete).
 */
export function markProgress(lessonId, step, total) {
  const all = readProgress();
  const prev = all[lessonId] || { step: 0, total, done: false };
  all[lessonId] = {
    step: Math.max(prev.step || 0, step),
    total,
    done: !!prev.done,
  };
  writeJSON(PROGRESS_KEY, all);
  return all[lessonId];
}

/** Mark a lesson complete — answering every quiz question is the trigger. */
export function markComplete(lessonId) {
  const all = readProgress();
  const prev = all[lessonId] || { step: 0, total: 0 };
  all[lessonId] = { ...prev, done: true };
  writeJSON(PROGRESS_KEY, all);
  return all[lessonId];
}
