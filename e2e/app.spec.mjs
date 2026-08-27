import { test, expect } from '@playwright/test';

/**
 * Engine-level end-to-end cover, driven through the demo fixture so it stays
 * independent of lesson content. Ported from cc-anatomy
 * @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT, same author) and extended
 * with the design-decision accordion.
 */

// The engine demo lives outside the lesson list; ?lesson=dummy registers it.
const LESSON = '?lesson=dummy#/lesson/dummy';

const els = (page) => ({
  indicator: page.locator('[data-indicator]'),
  explain: page.locator('[data-explain]'),
  badge: page.locator('[data-badge]'),
  next: page.locator('[data-next]'),
  prev: page.locator('[data-prev]'),
  auto: page.locator('[data-auto]'),
});

async function openLesson(page) {
  await page.goto(`/${LESSON}`);
  await expect(page.locator('body[data-ready="true"]')).toBeAttached();
  await expect(page.locator('svg.diagram')).toBeVisible();
}

async function pick(page, widget, value) {
  await page.locator(`[data-widget="${widget}"][data-value="${value}"]`).click();
}

test('the home page opens a lesson card', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-title')).toContainText('content-automation pipelines');
  const card = page.locator('[data-card]').first();
  await expect(card.locator('[data-progress]')).toHaveText('not started');
  await card.click();
  await expect(page.locator('svg.diagram')).toBeVisible();
});

test('the control bar steps forward and back', async ({ page }) => {
  await openLesson(page);
  const { indicator, explain, prev, next } = els(page);
  await expect(prev).toBeDisabled();
  const first = await explain.textContent();

  await next.click();
  await expect(indicator).toHaveText('2 / 4');
  await expect(explain).not.toHaveText(first);
  await expect(prev).toBeEnabled();

  await prev.click();
  await expect(indicator).toHaveText('1 / 4');
  await expect(explain).toHaveText(first);

  await next.click();
  await next.click();
  await next.click();
  await expect(indicator).toHaveText('4 / 4');
  await expect(next).toBeDisabled();
});

test('the arrow keys step through the scenario', async ({ page }) => {
  await openLesson(page);
  const { indicator } = els(page);
  await page.keyboard.press('ArrowRight');
  await expect(indicator).toHaveText('2 / 4');
  await page.keyboard.press('ArrowRight');
  await expect(indicator).toHaveText('3 / 4');
  await page.keyboard.press('ArrowLeft');
  await expect(indicator).toHaveText('2 / 4');
});

test('a cluster step highlights every member at once', async ({ page }) => {
  await openLesson(page);
  await page.keyboard.press('ArrowRight');
  await expect(els(page).indicator).toHaveText('2 / 4');
  await expect(page.locator('[data-node="d.context"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-node="d.queue"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-node="d.cache"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-node="d.gate"]')).toHaveClass(/is-idle/);
  await expect(page.locator('[data-edge="d.trigger->d.context"]')).toHaveClass(/is-pulse/);
});

test('the gate node is drawn in its own valve role', async ({ page }) => {
  await openLesson(page);
  await expect(page.locator('[data-node="d.gate"]')).toHaveAttribute('data-role', 'gate');
  await expect(page.locator('[data-node="d.gate"]')).toHaveClass(/node--gate/);
  await expect(page.locator('[data-node="d.queue"]')).toHaveAttribute('data-role', 'artifact');
});

test('changing an input switches scenario and resets to the first step', async ({ page }) => {
  await openLesson(page);
  const { indicator } = els(page);
  await expect(indicator).toHaveText('1 / 4');

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(indicator).toHaveText('3 / 4');

  await pick(page, 'gate', 'shut');
  await expect(indicator).toHaveText('1 / 5');

  await pick(page, 'gate', 'open');
  await expect(indicator).toHaveText('1 / 4');
});

test('the rejected branch shows a red badge and never reaches the end node', async ({ page }) => {
  await openLesson(page);
  const { badge, next, indicator } = els(page);
  await expect(badge).toBeHidden();

  await pick(page, 'mode', 'drain');
  await pick(page, 'gate', 'shut');
  await expect(indicator).toHaveText('1 / 5');

  await next.click();
  await expect(badge).toHaveText('unordered');
  await expect(badge).toHaveAttribute('data-tone', 'neutral');

  await next.click();
  await next.click();
  await expect(indicator).toHaveText('4 / 5');
  await expect(badge).toHaveText('quarantined');
  await expect(badge).toHaveAttribute('data-tone', 'blocked');
  await expect(page.locator('[data-node="d.result"]')).toHaveClass(/is-idle/);

  await next.click();
  await expect(badge).toHaveText('requeued');
  await expect(badge).toHaveAttribute('data-tone', 'warn');
  await expect(page.locator('[data-edge="d.gate->d.trigger"]')).toHaveClass(/is-pulse/);
});

test('the passing branch shows a green badge', async ({ page }) => {
  await openLesson(page);
  const { badge, next } = els(page);
  await pick(page, 'gate', 'shut');
  await next.click();
  await next.click();
  await next.click();
  await expect(badge).toHaveText('pass');
  await expect(badge).toHaveAttribute('data-tone', 'allowed');
});

test('auto play advances the scenario on its own', async ({ page }) => {
  await openLesson(page);
  const { indicator, auto } = els(page);
  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(indicator).toHaveText('2 / 4', { timeout: 6000 });
  await expect(indicator).toHaveText('3 / 4', { timeout: 6000 });
  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
});

test('the design decision cards open one at a time and carry both locales', async ({ page }) => {
  await openLesson(page);
  const cards = page.locator('[data-decision]');
  await expect(cards).toHaveCount(3);

  const first = cards.first();
  const button = first.locator('[data-decision-btn]');
  const body = first.locator('[data-decision-body]');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(body).toBeHidden();

  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(body).toBeVisible();
  await expect(body).toContainText('engine fixture');

  await button.click();
  await expect(body).toBeHidden();

  await page.locator('.loc-btn[data-locale="ko"]').click();
  await expect(page.locator('.decisions-head')).toHaveText('설계 결정');
  await cards.first().locator('[data-decision-btn]').click();
  await expect(cards.first().locator('[data-decision-body]')).toContainText('엔진 픽스처');
});

test('the locale toggle switches every string and survives a reload', async ({ page }) => {
  await openLesson(page);
  const { explain } = els(page);
  await expect(page.locator('.lesson-title')).toHaveText('Engine demo');

  await page.locator('.loc-btn[data-locale="ko"]').click();
  await expect(page.locator('.lesson-title')).toHaveText('엔진 데모');
  await expect(page.locator('.brand-note')).toContainText('일반화');
  await expect(explain).toContainText('예약 실행');
  await expect(page.locator('[data-widget="mode"] .widget-legend')).toHaveText('실행 내용');
  await expect(page.locator('text.node-label tspan').first()).toContainText('예약');

  await page.reload();
  await expect(page.locator('body[data-ready="true"]')).toBeAttached();
  await expect(page.locator('.lesson-title')).toHaveText('엔진 데모');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');

  await page.locator('.loc-btn[data-locale="en"]').click();
  await expect(page.locator('.lesson-title')).toHaveText('Engine demo');
});

test('a broken lesson falls back to the overview view instead of crashing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?lesson=broken#/lesson/broken');
  await expect(page.locator('body[data-ready="true"]')).toBeAttached();

  await expect(page.locator('.lesson-title')).toHaveText('Broken fixture');
  await expect(page.locator('.lesson-intro')).toContainText('intentionally invalid');
  await expect(page.locator('.notice')).toBeVisible();
  await expect(page.locator('.notice-list')).toContainText('E_NODE_REF');
  await expect(page.locator('.notice-list')).toContainText('E_COMBO_UNCOVERED');
  await expect(page.locator('.notice-list')).toContainText('E_DECISIONS');
  await expect(page.locator('svg.diagram')).toHaveCount(0);
  expect(errors).toEqual([]);

  await page.locator('.back').click();
  await expect(page.locator('[data-card]').first()).toBeVisible();
});

test('the app loads no external resource', async ({ page }) => {
  const offsite = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://localhost')) offsite.push(request.url());
  });
  await openLesson(page);
  await page.keyboard.press('ArrowRight');
  expect(offsite).toEqual([]);
});
