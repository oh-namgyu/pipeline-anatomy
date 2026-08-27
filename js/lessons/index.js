/**
 * Lesson registry.
 *
 * Adding a lesson is adding a data module: import it here and register it.
 * Nothing else in the app needs to change.
 *
 * `dummy.js` (engine demo) and `broken.js` (invalid on purpose) are test
 * fixtures, deliberately absent from this registry — app.js registers them on
 * demand from `?lesson=dummy` / `?lesson=broken`.
 */

import { l0 } from './l0_foundations.js';
import { l1 } from './l1_audiobook.js';
import { l2 } from './l2_hub.js';
import { l3 } from './l3_bridge.js';

const registry = new Map();

/** Add a lesson to the registry, keyed by its id. */
export function register(lesson) {
  registry.set(lesson.id, lesson);
  return lesson;
}

/** One lesson by id, or null. */
export function getLesson(id) {
  return registry.get(id) || null;
}

/** Every registered lesson, in registration order. */
export function allLessons() {
  return [...registry.values()];
}

register(l0);
register(l1);
register(l2);
register(l3);
