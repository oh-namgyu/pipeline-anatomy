import { test, expect } from '@playwright/test';

/**
 * The four shipped lessons: load, branch, step through, failure badge,
 * decisions, quiz, progress and locale. Content expectations come from
 * docs/CONTENT-SPEC.md — a change here without a spec change is a bug.
 */

const LESSONS = [
  { id: 'l0-foundations', title: 'Common Foundations', steps: 8, last: 'end', decisions: 4 },
  { id: 'l1-audiobook-line', title: 'Audiobook Line', steps: 7, last: 'end', decisions: 5 },
  { id: 'l2-content-hub', title: 'Multi-channel Content Hub', steps: 8, last: 'scheduled', decisions: 5 },
  { id: 'l3-design-render-bridge', title: 'Story Design → Render Bridge', steps: 8, last: 'end', decisions: 5 },
];

const els = (page) => ({
  indicator: page.locator('[data-indicator]'),
  explain: page.locator('[data-explain]'),
  badge: page.locator('[data-badge]'),
  next: page.locator('[data-next]'),
  quiz: page.locator('[data-quiz]'),
});

async function open(page, id) {
  await page.goto(`/#/lesson/${id}`);
  await expect(page.locator('body[data-ready="true"]')).toBeAttached();
  await expect(page.locator('svg.diagram')).toBeVisible();
}

const pick = (page, widget, value) => page.locator(`[data-widget="${widget}"][data-value="${value}"]`).click();

/** Walk to the end with the next button. */
async function stepToEnd(page, expected) {
  const { next, indicator } = els(page);
  for (let i = 1; i < expected; i += 1) await next.click();
  await expect(indicator).toHaveText(`${expected} / ${expected}`);
  await expect(next).toBeDisabled();
}

for (const lesson of LESSONS) {
  test(`${lesson.id}: loads, steps to the end, and reveals the quiz`, async ({ page }) => {
    await open(page, lesson.id);
    await expect(page.locator('.lesson-title')).toHaveText(lesson.title);
    await expect(els(page).indicator).toHaveText(`1 / ${lesson.steps}`);
    await expect(els(page).quiz).toBeHidden();
    await stepToEnd(page, lesson.steps);
    await expect(els(page).badge).toHaveText(lesson.last);
    await expect(els(page).quiz).toBeVisible();
    await expect(page.locator('[data-as-of]')).toHaveText('2026-08');
    await expect(page.locator('.sources-list')).toHaveCount(0);
  });

  test(`${lesson.id}: the design decisions accordion opens`, async ({ page }) => {
    await open(page, lesson.id);
    const cards = page.locator('[data-decision]');
    await expect(cards).toHaveCount(lesson.decisions);
    const first = cards.first();
    await expect(first.locator('[data-decision-body]')).toBeHidden();
    await first.locator('[data-decision-btn]').click();
    await expect(first.locator('[data-decision-btn]')).toHaveAttribute('aria-expanded', 'true');
    const body = first.locator('[data-decision-body]');
    await expect(body).toBeVisible();
    expect((await body.textContent()).length).toBeGreaterThan(200);
  });

  test(`${lesson.id}: the quiz grades, completes, and shows on the home card`, async ({ page }) => {
    await open(page, lesson.id);
    await page.locator('[data-quiz-open]').click();
    await expect(els(page).quiz).toBeVisible();
    await expect(page.locator('.quiz-card')).toHaveCount(3);

    for (const at of [0, 1, 2]) {
      await page.locator(`[data-question="${at}"] [data-choice="0"]`).click();
    }
    await expect(page.locator('.quiz-verdict:visible')).toHaveCount(3);
    await expect(page.locator('[data-score]')).toHaveText(/^[0-3] \/ 3 correct$/);

    await page.locator('.back').click();
    const card = page.locator(`[data-lesson-id="${lesson.id}"] [data-progress]`);
    await expect(card).toHaveText('completed');
    await expect(card).toHaveAttribute('data-state', 'completed');
  });
}

test('home shows the not-started, viewed and completed states side by side', async ({ page }) => {
  await open(page, 'l0-foundations');
  await els(page).next.click();
  await page.locator('.back').click();
  await expect(page.locator('[data-lesson-id="l0-foundations"] [data-progress]')).toHaveText('viewed');
  await expect(page.locator('[data-lesson-id="l1-audiobook-line"] [data-progress]')).toHaveText('not started');

  await open(page, 'l1-audiobook-line');
  await page.locator('[data-quiz-open]').click();
  for (const at of [0, 1, 2]) await page.locator(`[data-question="${at}"] [data-choice="1"]`).click();
  await page.locator('.back').click();
  await expect(page.locator('[data-lesson-id="l1-audiobook-line"] [data-progress]')).toHaveText('completed');
  await expect(page.locator('[data-lesson-id="l0-foundations"] [data-progress]')).toHaveText('viewed');
});

test('L0: the failing gate quarantines, requeues, and never reaches the render', async ({ page }) => {
  await open(page, 'l0-foundations');
  const { badge, next, indicator } = els(page);
  await pick(page, 'gate', 'fail');
  await expect(indicator).toHaveText('1 / 8');

  for (let i = 0; i < 3; i += 1) await next.click();
  await expect(badge).toHaveText('rejected');
  await expect(badge).toHaveAttribute('data-tone', 'blocked');

  await next.click();
  await expect(badge).toHaveText('quarantined');
  await expect(page.locator('[data-node="l0.quarantine"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-node="l0.render"]')).toHaveClass(/is-idle/);

  await next.click();
  await expect(badge).toHaveText('requeued');
  await expect(badge).toHaveAttribute('data-tone', 'warn');
  await expect(page.locator('[data-edge="l0.quarantine->l0.queue"]')).toHaveClass(/is-pulse/);
});

test('L0: an empty queue is a no-op that still reports', async ({ page }) => {
  await open(page, 'l0-foundations');
  const { badge, next, indicator } = els(page);
  await pick(page, 'queue', 'empty');
  await expect(indicator).toHaveText('1 / 5');
  await next.click();
  await expect(badge).toHaveText('empty');
  await next.click();
  await expect(badge).toHaveText('no-op');
  await expect(els(page).explain).toContainText('does not invent work');
});

test('L1: each format takes a different path and a quota notice is not retried', async ({ page }) => {
  await open(page, 'l1-audiobook-line');
  const { badge, next, indicator } = els(page);

  await pick(page, 'render', 'fail');
  await expect(indicator).toHaveText('1 / 6');
  await next.click();
  await expect(badge).toHaveText('fail');
  await next.click();
  await expect(badge).toHaveText('fail fast');
  await expect(els(page).explain).toContainText('not retried');
  await next.click();
  await expect(badge).toHaveText('kept');

  await pick(page, 'format', 'short');
  await expect(indicator).toHaveText('1 / 5');
  await expect(badge).toHaveText('derived');
  await next.click();
  await expect(badge).toHaveText('stale record');
  await next.click();
  await expect(badge).toHaveText('guarded');
  await next.click();
  await expect(badge).toHaveText('held');
  await expect(page.locator('[data-node="l1.hold"]')).toHaveClass(/is-active/);

  await pick(page, 'format', 'mid');
  await expect(badge).toHaveText('claimed');
  await next.click();
  await expect(badge).toHaveText('retry k');
  await next.click();
  await expect(badge).toHaveText('reaped');
});

test('L2: the risk rule discards a variant no matter how it scored', async ({ page }) => {
  await open(page, 'l2-content-hub');
  const { badge, next, indicator } = els(page);
  await pick(page, 'gate', 'risk-block');
  await expect(indicator).toHaveText('1 / 6');

  for (let i = 0; i < 3; i += 1) await next.click();
  await expect(badge).toHaveText('blocked');
  await expect(badge).toHaveAttribute('data-tone', 'blocked');
  await expect(page.locator('[data-node="l2.blocked"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-node="l2.slot"]')).toHaveClass(/is-idle/);
  await expect(els(page).explain).toContainText('rule, not a score');

  await next.click();
  await expect(badge).toHaveText('logged');
  await expect(els(page).explain).toContainText('kept out of this log');

  await pick(page, 'source', 'curated-seed');
  await expect(indicator).toHaveText('1 / 6');
  await expect(badge).toHaveText('seed');
});

test('L3: a flagged beat is re-rendered on its own and clears itself', async ({ page }) => {
  await open(page, 'l3-design-render-bridge');
  const { badge, next, indicator } = els(page);
  await pick(page, 'review', 'flagged');
  await expect(indicator).toHaveText('1 / 7');
  await expect(badge).toHaveText('reuse');

  await next.click();
  await next.click();
  await expect(badge).toHaveText('flagged');
  await expect(badge).toHaveAttribute('data-tone', 'warn');

  await next.click();
  await expect(badge).toHaveText('one beat');
  await expect(page.locator('[data-node="l3.rerender"]')).toHaveClass(/is-active/);

  await next.click();
  await expect(badge).toHaveText('cleared');
  await expect(page.locator('[data-edge="l3.rerender->l3.review"]')).toHaveClass(/is-pulse/);

  await pick(page, 'cast', 'new');
  await expect(indicator).toHaveText('1 / 7');
  await next.click();
  await expect(badge).toHaveText('fail');
  await next.click();
  await expect(badge).toHaveText('quarantined');
  await next.click();
  await expect(badge).toHaveText('re-approved');
});

test('the locale toggle switches lesson prose, widgets, decisions and quiz', async ({ page }) => {
  await open(page, 'l0-foundations');
  await page.locator('.loc-btn[data-locale="ko"]').click();
  await expect(page.locator('.lesson-title')).toHaveText('공통 기반 구조');
  await expect(els(page).explain).toContainText('무인으로 돌아도 안전');
  await expect(page.locator('[data-widget="gate"] .widget-legend')).toHaveText('품질 게이트');
  await expect(page.locator('text.node-label tspan').first()).toContainText('예약');
  await expect(page.locator('.decisions-head')).toHaveText('설계 결정');
  await page.locator('[data-decision] [data-decision-btn]').first().click();
  await expect(page.locator('[data-decision-body]').first()).toContainText('재고');
  await page.locator('[data-quiz-open]').click();
  await expect(page.locator('.quiz-q').first()).toContainText('품질 게이트는 왜');
  await expect(page.locator('.footer')).toContainText('실제 운영 시스템');
});
