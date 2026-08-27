/**
 * Quiz component: lesson.quiz -> answerable question cards.
 *
 * Static grading, no network, no innerHTML — every string lands via
 * textContent. Answering every question is what marks a lesson complete, so
 * the component reports completion once through `onComplete`.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author). Fixes made there should be reconciled with this copy.
 */

import { pickText } from './locale.js';
import { paintText } from './richtext.js';
import { t } from '../ui-text.js';

function el(tag, className, parent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

/**
 * Mount the quiz for one lesson.
 * @param {HTMLElement} mount
 * @param {object} lesson
 * @param {{locale?: string, onComplete?: () => void}} opts
 */
export function createQuiz(mount, lesson, { locale = 'en', onComplete } = {}) {
  const items = Array.isArray(lesson.quiz) ? lesson.quiz : [];
  let current = locale;
  let reported = false;
  /** chosen choice index per question, or -1 while unanswered */
  const picked = items.map(() => -1);

  const answered = () => picked.filter((p) => p >= 0).length;
  const correct = () => picked.filter((p, i) => p === items[i].answer).length;

  let scoreLine = null;

  function paintScore() {
    if (!scoreLine) return;
    scoreLine.textContent = `${correct()} / ${items.length} ${t('scoreSuffix', current)}`;
    scoreLine.hidden = answered() === 0;
  }

  function choose(index, choiceIndex, card) {
    if (picked[index] >= 0) return;
    picked[index] = choiceIndex;
    const right = choiceIndex === items[index].answer;
    for (const button of card.querySelectorAll('[data-choice]')) {
      const at = Number(button.dataset.choice);
      button.disabled = true;
      if (at === items[index].answer) button.classList.add('is-answer');
      if (at === choiceIndex && !right) button.classList.add('is-wrong');
    }
    const verdict = card.querySelector('[data-verdict]');
    verdict.textContent = t(right ? 'correct' : 'incorrect', current);
    verdict.dataset.tone = right ? 'allowed' : 'blocked';
    verdict.hidden = false;
    paintScore();
    if (!reported && answered() === items.length) {
      reported = true;
      if (onComplete) onComplete();
    }
  }

  function buildCard(item, index) {
    const card = el('li', 'quiz-card');
    card.dataset.question = String(index);
    el('p', 'quiz-num', card).textContent = `${index + 1} / ${items.length}`;
    paintText(el('p', 'quiz-q', card), pickText(item.q, current));
    const list = el('div', 'quiz-choices', card);
    item.choices.forEach((choice, at) => {
      const button = el('button', 'quiz-choice', list);
      button.type = 'button';
      button.dataset.choice = String(at);
      paintText(button, pickText(choice, current));
      if (picked[index] >= 0) {
        button.disabled = true;
        if (at === item.answer) button.classList.add('is-answer');
        if (at === picked[index] && at !== item.answer) button.classList.add('is-wrong');
      }
      button.addEventListener('click', () => choose(index, at, card));
    });
    const verdict = el('p', 'quiz-verdict', card);
    verdict.dataset.verdict = '';
    verdict.hidden = picked[index] < 0;
    if (picked[index] >= 0) {
      const right = picked[index] === item.answer;
      verdict.textContent = t(right ? 'correct' : 'incorrect', current);
      verdict.dataset.tone = right ? 'allowed' : 'blocked';
    }
    return card;
  }

  function render() {
    mount.textContent = '';
    if (!items.length) return;
    const head = el('h2', 'quiz-head', mount);
    head.textContent = t('quizHead', current);
    head.id = `quiz-head-${lesson.id}`;
    mount.setAttribute('aria-labelledby', head.id);
    const list = el('ul', 'quiz-list', mount);
    items.forEach((item, index) => list.appendChild(buildCard(item, index)));
    scoreLine = el('p', 'quiz-score', mount);
    scoreLine.dataset.score = '';
    paintScore();
  }

  render();

  return {
    get answered() { return answered(); },
    get correct() { return correct(); },
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
