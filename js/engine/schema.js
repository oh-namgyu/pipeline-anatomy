/**
 * Lesson schema gate.
 *
 * Pure data validation — imported both by the browser app (the load-time gate
 * that drives the fallback view) and by `node --test`. Never touches the DOM.
 *
 * Errors are returned as `CODE: message` strings so tests can assert on the
 * stable code rather than on prose.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author). The ported error codes are kept identical; `E_DECISIONS` is
 * new here, for the design-decision cards this project adds to the schema.
 */

import { isLocalized } from './locale.js';
import { checkDiagram, checkStep, edgeKey, normalizeEdgeRef, BADGE_TONES } from './schema-refs.js';

export { edgeKey, normalizeEdgeRef, BADGE_TONES };
export const LIMITS = { maxWidgets: 2, maxCombinations: 8 };
export const DECISION_LIMITS = { min: 3, max: 5 };
export const WIDGET_TYPES = ['chips', 'toggle'];

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';

/** Every combination of the declared input values, in stable widget order. */
export function combinations(inputs) {
  const ids = Object.keys(inputs || {});
  let rows = [{}];
  for (const id of ids) {
    const values = Array.isArray(inputs[id]) ? inputs[id] : [];
    const next = [];
    for (const row of rows) for (const value of values) next.push({ ...row, [id]: value });
    rows = next;
  }
  return rows;
}

/** Order-independent key for a selection or trigger object. */
export function selectionKey(selection, widgetIds) {
  return widgetIds.map((id) => `${id}=${selection ? selection[id] : ''}`).join('&');
}

/** The scenario whose trigger matches the current widget selection, or null. */
export function findScenario(lesson, selection) {
  const ids = Object.keys(lesson.inputs || {});
  const wanted = selectionKey(selection, ids);
  return (lesson.scenarios || []).find((s) => selectionKey(s.trigger, ids) === wanted) || null;
}

function checkMeta(lesson, err) {
  if (!isText(lesson.id)) err.push('E_SHAPE: lesson.id must be a non-empty string');
  if (!isLocalized(lesson.title)) err.push('E_LOCALE: lesson.title needs both en and ko');
  if (!isLocalized(lesson.intro)) err.push('E_LOCALE: lesson.intro needs both en and ko');
  if (lesson.sources != null && !Array.isArray(lesson.sources)) {
    err.push('E_SHAPE: lesson.sources must be an array when present');
  }
}

function checkWidgetDecls(lesson, widgetIds, err) {
  if (lesson.widgets == null) return;
  if (!isObj(lesson.widgets)) {
    err.push('E_INPUTS: lesson.widgets must be an object when present');
    return;
  }
  for (const [id, decl] of Object.entries(lesson.widgets)) {
    if (!widgetIds.includes(id)) {
      err.push(`E_INPUTS: lesson.widgets declares "${id}", which is not in lesson.inputs`);
      continue;
    }
    if (!isObj(decl)) {
      err.push(`E_INPUTS: widget "${id}" declaration must be an object`);
      continue;
    }
    if (decl.type != null && !WIDGET_TYPES.includes(decl.type)) {
      err.push(`E_INPUTS: widget "${id}" type must be one of ${WIDGET_TYPES.join(', ')}`);
    }
    if (decl.type === 'toggle' && (lesson.inputs[id] || []).length !== 2) {
      err.push(`E_INPUTS: widget "${id}" is a toggle, which needs exactly 2 values`);
    }
    if (decl.label != null && !isLocalized(decl.label)) {
      err.push(`E_LOCALE: widget "${id}" label needs both en and ko`);
    }
    for (const [value, text] of Object.entries(decl.valueLabels || {})) {
      if (!(lesson.inputs[id] || []).includes(value)) {
        err.push(`E_INPUTS: widget "${id}" labels unknown value "${value}"`);
      } else if (!isLocalized(text)) {
        err.push(`E_LOCALE: widget "${id}" value "${value}" label needs both en and ko`);
      }
    }
  }
}

function checkInputs(lesson, err) {
  const inputs = lesson.inputs;
  if (!isObj(inputs)) {
    err.push('E_INPUTS: lesson.inputs must be an object of widgetId to allowed values');
    return { widgetIds: [], combos: [] };
  }
  const widgetIds = Object.keys(inputs);
  if (widgetIds.length === 0) err.push('E_INPUTS: lesson.inputs needs at least one widget');
  if (widgetIds.length > LIMITS.maxWidgets) {
    err.push(`E_WIDGET_LIMIT: ${widgetIds.length} widgets declared, at most ${LIMITS.maxWidgets} allowed`);
  }
  for (const id of widgetIds) {
    const values = inputs[id];
    if (!Array.isArray(values) || values.length === 0) {
      err.push(`E_INPUTS: widget "${id}" needs a non-empty array of allowed values`);
      continue;
    }
    if (!values.every(isText)) err.push(`E_INPUTS: widget "${id}" values must be non-empty strings`);
    if (new Set(values).size !== values.length) err.push(`E_INPUTS: widget "${id}" has duplicate values`);
  }
  const combos = combinations(inputs);
  if (combos.length > LIMITS.maxCombinations) {
    err.push(`E_COMBO_LIMIT: ${combos.length} combinations declared, at most ${LIMITS.maxCombinations} allowed`);
  }
  checkWidgetDecls(lesson, widgetIds, err);
  return { widgetIds, combos };
}

function checkTrigger(lesson, scenario, widgetIds, byTrigger, err) {
  if (!isObj(scenario.trigger)) {
    err.push(`E_TRIGGER: scenario "${scenario.id}" needs a trigger object`);
    return;
  }
  const keys = Object.keys(scenario.trigger);
  const missing = widgetIds.filter((id) => !keys.includes(id));
  const extra = keys.filter((id) => !widgetIds.includes(id));
  if (missing.length) err.push(`E_TRIGGER: scenario "${scenario.id}" trigger misses ${missing.join(', ')}`);
  if (extra.length) err.push(`E_TRIGGER: scenario "${scenario.id}" trigger has unknown widget ${extra.join(', ')}`);
  for (const id of widgetIds) {
    const allowed = lesson.inputs[id] || [];
    if (keys.includes(id) && !allowed.includes(scenario.trigger[id])) {
      err.push(`E_TRIGGER: scenario "${scenario.id}" uses value "${scenario.trigger[id]}" outside widget "${id}"`);
    }
  }
  const key = selectionKey(scenario.trigger, widgetIds);
  if (byTrigger.has(key)) {
    err.push(`E_TRIGGER_DUP: scenarios "${byTrigger.get(key)}" and "${scenario.id}" share trigger ${key}`);
  } else {
    byTrigger.set(key, scenario.id);
  }
}

function checkScenarios(lesson, refs, plan, err) {
  const { widgetIds, combos } = plan;
  const scenarios = lesson.scenarios;
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    err.push('E_SCENARIO: lesson.scenarios must be a non-empty array');
    return;
  }
  const seenIds = new Set();
  const byTrigger = new Map();
  for (const scenario of scenarios) {
    if (!isObj(scenario) || !isText(scenario.id)) {
      err.push('E_SCENARIO: every scenario needs a non-empty id');
      continue;
    }
    if (seenIds.has(scenario.id)) err.push(`E_SCENARIO: duplicate scenario id "${scenario.id}"`);
    seenIds.add(scenario.id);
    checkTrigger(lesson, scenario, widgetIds, byTrigger, err);
    if (!Array.isArray(scenario.steps) || scenario.steps.length === 0) {
      err.push(`E_SCENARIO: scenario "${scenario.id}" needs at least one step`);
      continue;
    }
    scenario.steps.forEach((step, i) => checkStep(scenario.id, i, step, refs, err));
  }
  for (const combo of combos) {
    const key = selectionKey(combo, widgetIds);
    if (!byTrigger.has(key)) err.push(`E_COMBO_UNCOVERED: no scenario for combination ${key}`);
  }
}

/**
 * Design-decision cards. New in this project: each lesson explains three to
 * five choices behind the pipeline it replays. Shape and locale completeness
 * both report under E_DECISIONS, because the field itself is new.
 */
function checkDecisions(lesson, err) {
  if (lesson.decisions == null) return;
  if (!Array.isArray(lesson.decisions)) {
    err.push('E_DECISIONS: lesson.decisions must be an array when present');
    return;
  }
  const { min, max } = DECISION_LIMITS;
  if (lesson.decisions.length < min || lesson.decisions.length > max) {
    err.push(`E_DECISIONS: lesson.decisions needs ${min} to ${max} cards, found ${lesson.decisions.length}`);
  }
  const seen = new Set();
  lesson.decisions.forEach((card, i) => {
    const where = `decision card ${i + 1}`;
    if (!isObj(card)) {
      err.push(`E_DECISIONS: ${where} must be an object`);
      return;
    }
    if (!isText(card.id)) err.push(`E_DECISIONS: ${where} needs a non-empty id`);
    else if (seen.has(card.id)) err.push(`E_DECISIONS: duplicate decision id "${card.id}"`);
    else seen.add(card.id);
    if (!isLocalized(card.title)) err.push(`E_DECISIONS: ${where} title needs both en and ko`);
    if (!isLocalized(card.body)) err.push(`E_DECISIONS: ${where} body needs both en and ko`);
  });
}

function checkQuiz(lesson, err) {
  if (lesson.quiz == null) return;
  if (!Array.isArray(lesson.quiz)) {
    err.push('E_QUIZ: lesson.quiz must be an array when present');
    return;
  }
  lesson.quiz.forEach((item, i) => {
    const where = `quiz item ${i + 1}`;
    if (!isObj(item)) return err.push(`E_QUIZ: ${where} must be an object`);
    if (!isLocalized(item.q)) err.push(`E_LOCALE: ${where} question needs both en and ko`);
    if (!Array.isArray(item.choices) || item.choices.length < 2) {
      return err.push(`E_QUIZ: ${where} needs at least two choices`);
    }
    item.choices.forEach((choice, c) => {
      if (!isLocalized(choice)) err.push(`E_LOCALE: ${where} choice ${c + 1} needs both en and ko`);
    });
    if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.choices.length) {
      err.push(`E_QUIZ: ${where} answer must be an index into choices`);
    }
  });
}

/**
 * Validate one lesson data module.
 * @param {object} lesson
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validateLesson(lesson) {
  const errors = [];
  if (!isObj(lesson)) return { ok: false, errors: ['E_SHAPE: lesson must be an object'] };
  checkMeta(lesson, errors);
  const refs = checkDiagram(lesson, errors);
  const plan = checkInputs(lesson, errors);
  checkScenarios(lesson, refs, plan, errors);
  checkDecisions(lesson, errors);
  checkQuiz(lesson, errors);
  return { ok: errors.length === 0, errors };
}
