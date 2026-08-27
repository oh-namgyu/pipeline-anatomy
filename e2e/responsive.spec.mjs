import { test, expect } from '@playwright/test';

/**
 * Responsive, reduced-motion and accessibility parity, ported from cc-anatomy
 * @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT, same author) and pointed at
 * this project's lessons.
 */

const LESSON = 'l0-foundations';

async function open(page, id = LESSON) {
  await page.goto(`/#/lesson/${id}`);
  await expect(page.locator('body[data-ready="true"]')).toBeAttached();
  await expect(page.locator('svg.diagram')).toBeVisible();
}

test.describe('reduced motion', () => {
  test('the player still works, with the flow pulse turned off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    expect(await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )).toBe(true);

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-indicator]')).toHaveText('2 / 8');
    await expect(page.locator('[data-explain]')).not.toHaveText('');

    const edge = page.locator('[data-edge="l0.queue->l0.claim"]');
    await expect(edge).toHaveClass(/is-pulse/);
    const animation = await edge.locator('.edge-line').evaluate(
      (node) => window.getComputedStyle(node).animationName,
    );
    expect(animation).toBe('none');
    await expect(page.locator('[data-node="l0.claim"]')).toHaveClass(/is-active/);
  });
});

test.describe('narrow viewport', () => {
  test.use({ viewport: { width: 420, height: 780 } });

  test('the stage stacks and the controls stay usable', async ({ page }) => {
    await open(page);
    const canvas = await page.locator('.canvas').boundingBox();
    const panel = await page.locator('.panel').boundingBox();
    expect(panel.y).toBeGreaterThan(canvas.y);
    await page.locator('[data-next]').click();
    await expect(page.locator('[data-indicator]')).toHaveText('2 / 8');

    // the page itself must not scroll sideways; only the canvas may
    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.documentElement.clientWidth,
      canvas: document.querySelector('.canvas').scrollWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(0);
    expect(overflow.canvas).toBeGreaterThan(420);
  });
});

test.describe('touch layout at 860px', () => {
  test.use({ viewport: { width: 860, height: 900 } });

  test('the stage stacks, widgets wrap, and every control is at least 40px', async ({ page }) => {
    await open(page, 'l1-audiobook-line');

    const canvas = await page.locator('.canvas').boundingBox();
    const panel = await page.locator('.panel').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
    expect(Math.round(panel.width)).toBeCloseTo(Math.round(canvas.width), -1);

    // the widget zone wraps instead of overflowing its container
    const zone = await page.locator('.widget-zone').boundingBox();
    for (const id of ['format', 'render']) {
      const box = await page.locator(`.widget[data-widget="${id}"]`).boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(zone.x + zone.width + 1);
    }

    const controls = ['[data-prev]', '[data-next]', '[data-auto]', '[data-quiz-open]',
      '[data-decision-btn]', '.chip', '.seg', '.dot', '.loc-btn'];
    for (const selector of controls) {
      const box = await page.locator(selector).first().boundingBox();
      expect(Math.min(box.width, box.height), `${selector} touch target`).toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe('accessibility', () => {
  test('controls, the diagram and the live region are named in both locales', async ({ page }) => {
    await open(page);

    const panel = page.locator('.panel');
    await expect(panel).toHaveAttribute('aria-live', 'polite');
    await expect(panel).toHaveAttribute('aria-label', 'Current step');
    await expect(page.locator('[data-next]')).toHaveAttribute('aria-label', 'Next step');
    await expect(page.locator('svg.diagram')).toHaveAttribute('aria-label', 'Pipeline flow diagram');
    await expect(page.locator('.dot').first()).toHaveAttribute('aria-label', 'Step 1');

    await page.locator('.loc-btn[data-locale="ko"]').click();
    await expect(panel).toHaveAttribute('aria-label', '현재 단계');
    await expect(page.locator('[data-next]')).toHaveAttribute('aria-label', '다음 단계');
    await expect(page.locator('svg.diagram')).toHaveAttribute('aria-label', '파이프라인 흐름 다이어그램');
    await expect(page.locator('.dot').first()).toHaveAttribute('aria-label', '단계 1');
  });

  test('the decision accordion announces its own state', async ({ page }) => {
    await open(page);
    const button = page.locator('[data-decision-btn]').first();
    const bodyId = await button.getAttribute('aria-controls');
    expect(bodyId).toBeTruthy();
    await expect(page.locator(`#${bodyId}`)).toHaveCount(1);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  test('the keyboard drives a real lesson and focus is visible', async ({ page }) => {
    await open(page, 'l2-content-hub');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-indicator]')).toHaveText('2 / 8');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-indicator]')).toHaveText('1 / 8');

    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const node = document.activeElement;
      return { tag: node.tagName, outline: window.getComputedStyle(node).outlineWidth };
    });
    expect(focus.tag).not.toBe('BODY');
    expect(parseFloat(focus.outline)).toBeGreaterThan(0);
  });

  test('the home hero and the unofficial-context footer carry the generalization notice', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body[data-ready="true"]')).toBeAttached();
    await expect(page.locator('.hero-title'))
      .toHaveText('Inside three real content-automation pipelines — generalized, step by step.');
    await expect(page.locator('.hero-meta')).toContainText('nothing you do here leaves the browser');
    await expect(page.locator('.footer'))
      .toHaveText('Generalized from real production systems, as-built 2026-08; no real identifiers included.');

    await page.locator('.loc-btn[data-locale="ko"]').click();
    await expect(page.locator('.hero-title')).toContainText('일반화해서');
    await expect(page.locator('.footer')).toContainText('as-built 2026-08');
  });
});
