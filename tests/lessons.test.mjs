/**
 * Lesson data tests: the four shipped lessons against docs/CONTENT-SPEC.md.
 * The schema gate proves structure; these tests pin the content contract the
 * spec calls binding — the totals table, the failure-branch rule, and the
 * per-lesson facts that must not be re-generalized by a later edit.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { validateLesson, combinations, findScenario } from '../js/engine/schema.js';
import { allLessons } from '../js/lessons/index.js';

const lessons = allLessons();
const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
const stepsOf = (lesson) => lesson.scenarios.flatMap((s) => s.steps);
const badgesOf = (scenario) => scenario.steps.map((s) => s.badge).filter(Boolean);

/** nodes / widgets / scenarios / steps / decisions / quiz, per CONTENT-SPEC §5. */
const EXPECTED = {
  'l0-foundations': { nodes: 11, scenarios: 4, steps: 26, decisions: 4, quiz: 3 },
  'l1-audiobook-line': { nodes: 13, scenarios: 6, steps: 34, decisions: 5, quiz: 3 },
  'l2-content-hub': { nodes: 14, scenarios: 4, steps: 28, decisions: 5, quiz: 3 },
  'l3-design-render-bridge': { nodes: 13, scenarios: 4, steps: 30, decisions: 5, quiz: 3 },
};

test('the registry ships exactly the four lessons, in spec order', () => {
  assert.deepEqual(lessons.map((l) => l.id), Object.keys(EXPECTED));
});

test('every registered lesson passes the schema gate', () => {
  for (const lesson of lessons) {
    const result = validateLesson(lesson);
    assert.deepEqual(result.errors, [], `lesson "${lesson.id}" failed the gate`);
  }
});

test('each lesson matches the spec totals table', () => {
  for (const [id, want] of Object.entries(EXPECTED)) {
    const lesson = byId[id];
    assert.equal(lesson.diagram.nodes.length, want.nodes, `${id} nodes`);
    assert.equal(Object.keys(lesson.inputs).length, 2, `${id} widgets`);
    assert.equal(lesson.scenarios.length, want.scenarios, `${id} scenarios`);
    assert.equal(stepsOf(lesson).length, want.steps, `${id} steps`);
    assert.equal(lesson.decisions.length, want.decisions, `${id} decisions`);
    assert.equal(lesson.quiz.length, want.quiz, `${id} quiz`);
  }
});

test('the totals add up to the spec grand total', () => {
  const sum = (key) => Object.values(EXPECTED).reduce((n, want) => n + want[key], 0);
  assert.equal(sum('nodes'), 51);
  assert.equal(sum('scenarios'), 18);
  assert.equal(sum('steps'), 118);
  assert.equal(sum('decisions'), 19);
  assert.equal(sum('quiz'), 12);
});

test('every widget combination resolves to exactly one scenario', () => {
  for (const lesson of lessons) {
    const rows = combinations(lesson.inputs);
    const ids = rows.map((row) => findScenario(lesson, row)).map((s) => s && s.id);
    assert.equal(ids.filter(Boolean).length, rows.length, `${lesson.id} has an uncovered combination`);
    assert.equal(new Set(ids).size, rows.length, `${lesson.id} reuses a scenario`);
  }
});

test('every lesson carries a reading time and the as-built baseline', () => {
  for (const lesson of lessons) {
    assert.equal(lesson.asOf, '2026-08');
    assert.ok(lesson.minutes > 0, `${lesson.id} needs a reading time`);
    assert.equal(lesson.sources, undefined, `${lesson.id} must not link out: the sources are private`);
  }
});

test('every diagram carries a valve-styled gate node', () => {
  for (const lesson of lessons) {
    const gates = lesson.diagram.nodes.filter((n) => n.role === 'gate');
    assert.equal(gates.length, 1, `${lesson.id} should mark exactly one node as the gate`);
  }
});

test('every pipeline lesson ends at least one scenario in a failure branch', () => {
  const failureBadges = new Set([
    'quarantined', 'rejected', 'blocked', 'held', 'requeued', 'fail', 'fail fast', 'guarded skip',
  ]);
  for (const lesson of lessons) {
    const hit = lesson.scenarios.some((s) => badgesOf(s).some((b) => failureBadges.has(b)));
    assert.ok(hit, `${lesson.id} has no failure branch`);
  }
});

test('L0 devotes one of its two widgets to the failure branch', () => {
  const l0 = byId['l0-foundations'];
  assert.deepEqual(l0.inputs.gate, ['pass', 'fail']);
  assert.deepEqual(l0.inputs.queue, ['stocked', 'empty']);
  const fail = l0.scenarios.find((s) => s.id === 'l0.s2');
  assert.deepEqual(fail.trigger, { gate: 'fail', queue: 'stocked' });
  assert.ok(badgesOf(fail).includes('quarantined'));
  assert.ok(badgesOf(fail).includes('requeued'));
  // the render is skipped entirely on the failure path — that is the whole point
  assert.ok(!fail.steps.some((s) => s.node === 'l0.render'));
});

test('L1 gives each format its own path and never retries a quota notice', () => {
  const l1 = byId['l1-audiobook-line'];
  assert.deepEqual(l1.inputs.format, ['long', 'short', 'mid']);
  const byIdOf = (id) => l1.scenarios.find((s) => s.id === id);
  assert.ok(badgesOf(byIdOf('l1.s2')).includes('fail fast'));
  assert.ok(badgesOf(byIdOf('l1.s4')).includes('held'));
  assert.ok(badgesOf(byIdOf('l1.s5')).includes('pre-rendered'));
  assert.ok(badgesOf(byIdOf('l1.s6')).includes('reaped'));
  // the illustration queue is a side feed, never on the nightly critical path
  const assetEdges = l1.diagram.edges.filter((e) => e.from === 'l1.assets');
  assert.deepEqual(assetEdges.map((e) => e.to), ['l1.assemble']);
});

test('L2 treats risk as a rule that no score can buy off', () => {
  const l2 = byId['l2-content-hub'];
  const blocked = l2.scenarios.filter((s) => badgesOf(s).includes('blocked'));
  assert.equal(blocked.length, 2, 'both risk-block combinations must end blocked');
  for (const scenario of blocked) {
    assert.equal(scenario.trigger.gate, 'risk-block');
    assert.ok(scenario.steps.some((s) => s.node === 'l2.blocked'));
    assert.ok(!scenario.steps.some((s) => s.node === 'l2.slot'), 'a blocked variant must never reach a release slot');
  }
  // both adapters converge on one candidate schema, so the gate is shared
  const intoCandidates = l2.diagram.edges.filter((e) => e.to === 'l2.candidates');
  assert.deepEqual(intoCandidates.map((e) => e.from), ['l2.adapter']);
});

test('L3 keeps the crossing deterministic and the rework loop per beat', () => {
  const l3 = byId['l3-design-render-bridge'];
  const s1 = l3.scenarios.find((s) => s.id === 'l3.s1');
  assert.ok(badgesOf(s1).includes('0 model calls'));
  assert.ok(badgesOf(s1).includes('0 generated'));
  const flagged = l3.scenarios.find((s) => s.id === 'l3.s3');
  assert.ok(badgesOf(flagged).includes('one beat'));
  assert.ok(badgesOf(flagged).includes('cleared'));
  // the review loop is a cycle, and the failed row returns through the same door
  const keys = l3.diagram.edges.map((e) => `${e.from}->${e.to}`);
  assert.ok(keys.includes('l3.rerender->l3.review'));
  assert.ok(keys.includes('l3.failed->l3.draft'));
  assert.ok(keys.includes('l3.gate->l3.storyline'));
});

test('every scenario step points at a node the diagram declares', () => {
  for (const lesson of lessons) {
    const ids = new Set(lesson.diagram.nodes.map((n) => n.id));
    for (const step of stepsOf(lesson)) {
      assert.ok(ids.has(step.node), `${lesson.id}: step points at ${step.node}`);
    }
  }
});

test('every quiz question has one answer inside its choice list', () => {
  for (const lesson of lessons) {
    for (const item of lesson.quiz) {
      assert.ok(item.choices.length >= 3, `${lesson.id} quiz needs real distractors`);
      assert.ok(item.choices[item.answer], `${lesson.id} quiz answer out of range`);
    }
  }
});

test('every decision card carries a substantial body in both locales', () => {
  for (const lesson of lessons) {
    for (const card of lesson.decisions) {
      assert.ok(card.body.en.length > 200, `${lesson.id}/${card.id} en body is too thin`);
      assert.ok(card.body.ko.length > 100, `${lesson.id}/${card.id} ko body is too thin`);
    }
  }
});
