/**
 * View rendering: home grid, lesson player, and the two static fallbacks.
 * Markup comes from the <template> elements in index.html; every dynamic
 * string is written with textContent.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author), plus the design-decision accordion this project adds.
 */

import { pickText } from './engine/locale.js';
import { paintText } from './engine/richtext.js';
import { createDiagram } from './engine/diagram.js';
import { createPlayer } from './engine/player.js';
import { createWidgets } from './engine/widgets.js';
import { createQuiz } from './engine/quiz.js';
import { findScenario } from './engine/schema.js';
import { applyChrome, t } from './ui-text.js';

function clone(id) {
  const tpl = document.getElementById(id);
  return tpl.content.cloneNode(true);
}

function mountView(mount, fragment, locale) {
  mount.textContent = '';
  mount.appendChild(fragment);
  applyChrome(mount, locale);
}

/** not started / viewed / completed — the three states a home card shows. */
function progressLabel(entry, locale) {
  if (!entry) return t('notStarted', locale);
  return entry.done ? t('completed', locale) : t('viewed', locale);
}

function buildCard(lesson, ordinal, locale, progress) {
  const frag = clone('tpl-card');
  const link = frag.querySelector('[data-card]');
  link.href = `#/lesson/${lesson.id}`;
  link.dataset.lessonId = lesson.id;
  frag.querySelector('[data-num]').textContent = String(ordinal).padStart(2, '0');
  frag.querySelector('[data-title]').textContent = pickText(lesson.title, locale);
  paintText(frag.querySelector('[data-intro]'), pickText(lesson.intro, locale));
  const meta = [];
  if (lesson.minutes) meta.push(`${lesson.minutes} ${t('minutes', locale)}`);
  if (lesson.demo) meta.push(t('demoTag', locale));
  frag.querySelector('[data-meta]').textContent = meta.join(' · ');
  const mark = frag.querySelector('[data-progress]');
  const entry = progress[lesson.id];
  mark.textContent = progressLabel(entry, locale);
  mark.dataset.state = entry ? (entry.done ? 'completed' : 'viewed') : 'none';
  return frag;
}

/** Home: hero plus the pipeline card grid. */
export function renderHome(mount, { lessons, locale, progress }) {
  const frag = clone('tpl-home');
  const grid = frag.querySelector('[data-grid]');
  lessons.forEach((lesson, i) => grid.appendChild(buildCard(lesson, i + 1, locale, progress)));
  mountView(mount, frag, locale);
  return { setLocale() {}, destroy() {} };
}

/** Static overview shown when a lesson fails the schema gate. */
export function renderFallback(mount, { lesson, errors, locale }) {
  const frag = clone('tpl-fallback');
  frag.querySelector('[data-title]').textContent = pickText(lesson.title, locale) || lesson.id;
  paintText(frag.querySelector('[data-intro]'), pickText(lesson.intro, locale));
  const list = frag.querySelector('[data-errors]');
  for (const message of errors) {
    const item = document.createElement('li');
    item.textContent = message;
    list.appendChild(item);
  }
  mountView(mount, frag, locale);
  return { setLocale() {}, destroy() {} };
}

/** Unknown lesson id. */
export function renderMissing(mount, locale) {
  mountView(mount, clone('tpl-missing'), locale);
  return { setLocale() {}, destroy() {} };
}

function lessonEls(root) {
  const q = (sel) => root.querySelector(sel);
  return {
    title: q('[data-title]'),
    intro: q('[data-intro]'),
    widgets: q('[data-widgets]'),
    canvas: q('[data-canvas]'),
    stepline: q('[data-stepline]'),
    explain: q('[data-explain]'),
    badge: q('[data-badge]'),
    indicator: q('[data-indicator]'),
    dots: q('[data-dots]'),
    prev: q('[data-prev]'),
    next: q('[data-next]'),
    auto: q('[data-auto]'),
    quizOpen: q('[data-quiz-open]'),
    quiz: q('[data-quiz]'),
    decisions: q('[data-decisions]'),
    decisionList: q('[data-decision-list]'),
    asOf: q('[data-as-of]'),
  };
}

/**
 * `lesson.decisions` as a disclosure list: one button per card, its body
 * revealed on click. Text only — nothing here loads or links anywhere.
 */
function paintDecisions(els, lesson, locale) {
  const cards = Array.isArray(lesson.decisions) ? lesson.decisions : [];
  els.decisions.hidden = cards.length === 0;
  els.decisionList.textContent = '';
  cards.forEach((card, index) => {
    const frag = clone('tpl-decision');
    const item = frag.querySelector('[data-decision]');
    item.dataset.decision = card.id;
    const button = frag.querySelector('[data-decision-btn]');
    const body = frag.querySelector('[data-decision-body]');
    const bodyId = `decision-${lesson.id}-${index}`;
    body.id = bodyId;
    button.setAttribute('aria-controls', bodyId);
    button.setAttribute('aria-expanded', 'false');
    frag.querySelector('[data-decision-title]').textContent = pickText(card.title, locale);
    paintText(body, pickText(card.body, locale));
    body.hidden = true;
    button.addEventListener('click', () => {
      const open = body.hidden;
      body.hidden = !open;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    els.decisionList.appendChild(frag);
  });
}

/**
 * Lesson view: widget zone, diagram canvas, explanation panel, control bar,
 * design-decision accordion, quiz.
 * @returns {{setLocale: (l: string) => void, destroy: () => void}}
 */
export function renderLesson(mount, { lesson, locale, onStep, onComplete }) {
  let current = locale;
  const frag = clone('tpl-lesson');
  mount.textContent = '';
  mount.appendChild(frag);
  const els = lessonEls(mount);

  const diagram = createDiagram(els.canvas, lesson.diagram, current);

  function paintHead() {
    els.title.textContent = pickText(lesson.title, current);
    paintText(els.intro, pickText(lesson.intro, current));
    els.asOf.textContent = lesson.asOf || '';
  }

  function showQuiz() {
    if (!els.quiz.hidden) return;
    els.quiz.hidden = false;
    els.quizOpen.setAttribute('aria-expanded', 'true');
  }

  function paintStepline(index, total) {
    els.stepline.textContent = `${t('stepOf', current)} ${index + 1} / ${total}`;
    if (index >= total - 1) showQuiz();
    if (onStep) onStep(index, total);
  }

  const player = createPlayer({
    diagram,
    els,
    locale: current,
    onStep: paintStepline,
  });

  const widgets = createWidgets(els.widgets, lesson, {
    locale: current,
    onChange: (selection) => player.load(findScenario(lesson, selection)),
  });

  const quiz = createQuiz(els.quiz, lesson, { locale: current, onComplete });

  els.quizOpen.addEventListener('click', showQuiz);
  els.quizOpen.hidden = !Array.isArray(lesson.quiz) || lesson.quiz.length === 0;

  paintHead();
  paintDecisions(els, lesson, current);
  applyChrome(mount, current);
  player.load(widgets.getScenario());

  return {
    setLocale(next) {
      current = next;
      paintHead();
      paintDecisions(els, lesson, next);
      applyChrome(mount, next);
      widgets.setLocale(next);
      player.setLocale(next);
      quiz.setLocale(next);
    },
    destroy() {
      player.destroy();
      widgets.destroy();
      quiz.destroy();
    },
  };
}
