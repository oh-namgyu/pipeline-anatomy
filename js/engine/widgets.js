/**
 * Input widgets: lesson.inputs -> preset controls, and the current combination
 * -> the scenario whose trigger matches it.
 *
 * Inputs are presets only (no free text), which is what keeps the branch space
 * closed: the schema gate proves every combination has exactly one scenario.
 * A widget's presentation is declared in `lesson.widgets[id].type`
 * ("chips" or "toggle"); it defaults to chips.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author). Fixes made there should be reconciled with this copy.
 */

import { pickText } from './locale.js';
import { findScenario } from './schema.js';

const DEFAULT_TYPE = 'chips';

function declOf(lesson, id) {
  return (lesson.widgets && lesson.widgets[id]) || {};
}

function valueLabel(lesson, id, value, locale) {
  const labels = declOf(lesson, id).valueLabels || {};
  return labels[value] ? pickText(labels[value], locale) : value;
}

function legendLabel(lesson, id, locale) {
  const decl = declOf(lesson, id);
  return decl.label ? pickText(decl.label, locale) : id;
}

function buildButton(lesson, id, value, locale, type, onPick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = type === 'toggle' ? 'seg' : 'chip';
  button.dataset.widget = id;
  button.dataset.value = value;
  button.textContent = valueLabel(lesson, id, value, locale);
  button.addEventListener('click', () => onPick(id, value));
  return button;
}

/**
 * Mount the widget zone.
 * @param {HTMLElement} mount
 * @param {object} lesson
 * @param {{locale?: string, onChange?: (selection: object) => void}} opts
 */
export function createWidgets(mount, lesson, { locale = 'en', onChange } = {}) {
  let current = locale;
  const widgetIds = Object.keys(lesson.inputs || {});
  const selection = {};
  for (const id of widgetIds) {
    const decl = declOf(lesson, id);
    selection[id] = decl.default != null ? decl.default : lesson.inputs[id][0];
  }

  function paint() {
    for (const button of mount.querySelectorAll('[data-value]')) {
      const on = selection[button.dataset.widget] === button.dataset.value;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function pick(id, value) {
    if (selection[id] === value) return;
    selection[id] = value;
    paint();
    if (onChange) onChange({ ...selection });
  }

  function render() {
    mount.textContent = '';
    for (const id of widgetIds) {
      const type = declOf(lesson, id).type || DEFAULT_TYPE;
      const field = document.createElement('fieldset');
      field.className = `widget widget--${type}`;
      field.dataset.widget = id;
      const legend = document.createElement('legend');
      legend.className = 'widget-legend';
      legend.textContent = legendLabel(lesson, id, current);
      field.appendChild(legend);
      const values = document.createElement('div');
      values.className = 'widget-values';
      for (const value of lesson.inputs[id]) {
        values.appendChild(buildButton(lesson, id, value, current, type, pick));
      }
      field.appendChild(values);
      mount.appendChild(field);
    }
    paint();
  }

  render();

  return {
    /** The current widget combination. */
    getSelection() {
      return { ...selection };
    },
    /** The scenario matching the current combination, or null. */
    getScenario() {
      return findScenario(lesson, selection);
    },
    setLocale(next) {
      if (next === current) return;
      current = next;
      render();
    },
    destroy() {
      mount.textContent = '';
    },
  };
}

export { findScenario };
