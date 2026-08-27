/**
 * Shell strings (everything outside lesson data) in both locales, plus the
 * helper that fills every `[data-t]` element in a subtree.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author); the string values are this project's own.
 */

import { pickText } from './engine/locale.js';

export const UI = {
  tagline: {
    en: 'Generalized from real production systems — no real identifiers included.',
    ko: '실제 운영 시스템에서 일반화했습니다 — 실제 식별자는 포함하지 않습니다.',
  },
  unofficial: {
    en: 'Generalized from real production systems, as-built 2026-08; no real identifiers included.',
    ko: '실제 운영 시스템에서 일반화 (as-built 2026-08). 실제 식별자는 포함하지 않습니다.',
  },
  heroKicker: { en: 'open the line', ko: '배관을 엽니다' },
  heroTitle: {
    en: 'Inside three real content-automation pipelines — generalized, step by step.',
    ko: '실제 콘텐츠 자동화 파이프라인 세 개의 내부 — 일반화해서, 한 단계씩.',
  },
  heroLead: {
    en: 'Each lesson is a piping diagram you can drive. Flip an input, replay the run step by step, and watch what happens when a gate says no.',
    ko: '각 레슨은 직접 움직여 보는 배관도입니다. 입력을 바꾸고, 실행을 한 단계씩 재생하며, 게이트가 거부했을 때 무슨 일이 벌어지는지 지켜보세요.',
  },
  heroMeta: {
    en: 'Four pipelines · EN / KO · nothing you do here leaves the browser.',
    ko: '파이프라인 4개 · EN / KO · 여기서 하는 어떤 것도 브라우저를 떠나지 않습니다.',
  },
  back: { en: '← All pipelines', ko: '← 파이프라인 목록' },
  auto: { en: 'auto', ko: '자동' },
  hint: { en: 'Use ← and → to step through.', ko: '← → 키로 단계를 넘길 수 있습니다.' },
  dataError: { en: 'This lesson could not be played.', ko: '이 레슨은 재생할 수 없습니다.' },
  dataErrorBody: {
    en: 'Its data failed the schema check, so the simulation is unavailable. The overview above is shown instead.',
    ko: '레슨 데이터가 스키마 검사를 통과하지 못해 시뮬레이션을 쓸 수 없습니다. 대신 위 개요를 표시합니다.',
  },
  notFound: { en: 'Lesson not found', ko: '레슨을 찾을 수 없습니다' },
  notFoundBody: { en: 'No lesson is registered under that address.', ko: '그 주소로 등록된 레슨이 없습니다.' },
  minutes: { en: 'min', ko: '분' },
  demoTag: { en: 'engine demo', ko: '엔진 데모' },
  notStarted: { en: 'not started', ko: '시작 전' },
  viewed: { en: 'viewed', ko: '열어 봄' },
  completed: { en: 'completed', ko: '완료' },
  stepOf: { en: 'Step', ko: '단계' },
  quizOpen: { en: 'Quiz', ko: '퀴즈' },
  quizHead: { en: 'Check yourself', ko: '스스로 점검' },
  quizLead: {
    en: 'Three questions on how the pipeline behaves. Answering all three marks the lesson complete.',
    ko: '파이프라인의 동작에 대한 세 문항입니다. 세 문항을 모두 답하면 레슨이 완료로 기록됩니다.',
  },
  correct: { en: 'Correct', ko: '정답' },
  incorrect: { en: 'Not quite', ko: '오답' },
  scoreSuffix: { en: 'correct', ko: '정답' },
  decisionsHead: { en: 'Design decisions', ko: '설계 결정' },
  decisionsLead: {
    en: 'Why this pipeline is shaped the way it is. Open a card to read the reasoning.',
    ko: '이 파이프라인이 왜 이런 모양인지. 카드를 열면 근거를 읽을 수 있습니다.',
  },
  asOf: { en: 'As-built baseline', ko: 'as-built 기준' },

  /* accessible names — applied as aria-label via [data-t-aria] */
  language: { en: 'Language', ko: '언어' },
  prevStep: { en: 'Previous step', ko: '이전 단계' },
  nextStep: { en: 'Next step', ko: '다음 단계' },
  autoPlay: { en: 'Play the scenario automatically', ko: '시나리오 자동 재생' },
  stepList: { en: 'Steps', ko: '단계 목록' },
  currentStep: { en: 'Current step', ko: '현재 단계' },
  diagramLabel: { en: 'Pipeline flow diagram', ko: '파이프라인 흐름 다이어그램' },
};

/**
 * Fill every `[data-t]` element's text and every `[data-t-aria]` element's
 * accessible name under `root`, in `locale`. Called on mount and on every
 * locale switch, so assistive tech follows the language toggle too.
 */
export function applyChrome(root, locale) {
  for (const node of root.querySelectorAll('[data-t]')) {
    const value = UI[node.dataset.t];
    if (value) node.textContent = pickText(value, locale);
  }
  for (const node of root.querySelectorAll('[data-t-aria]')) {
    const value = UI[node.dataset.tAria];
    if (value) node.setAttribute('aria-label', pickText(value, locale));
  }
}

/** One shell string. */
export function t(key, locale) {
  return pickText(UI[key], locale);
}
