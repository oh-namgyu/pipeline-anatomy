/**
 * Engine schema tests, ported from cc-anatomy
 * @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT, same author) so the ported
 * gate is proven to behave identically, plus the E_DECISIONS cases this
 * project's schema extension adds.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateLesson,
  combinations,
  findScenario,
  normalizeEdgeRef,
  edgeKey,
  LIMITS,
  DECISION_LIMITS,
} from '../js/engine/schema.js';
import { pickText, isLocalized } from '../js/engine/locale.js';
import { dummy } from '../js/lessons/dummy.js';
import { broken } from '../js/lessons/broken.js';

const clone = () => structuredClone(dummy);
const codes = (result) => result.errors.map((e) => e.split(':')[0]);

function expectFail(lesson, code) {
  const result = validateLesson(lesson);
  assert.equal(result.ok, false, `expected ${code} but the lesson validated`);
  assert.ok(codes(result).includes(code), `expected ${code}, got ${result.errors.join(' | ')}`);
}

test('the dummy lesson passes the schema gate', () => {
  const result = validateLesson(dummy);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test('the broken fixture fails on all three planted faults', () => {
  const result = validateLesson(broken);
  assert.equal(result.ok, false);
  assert.ok(codes(result).includes('E_NODE_REF'));
  assert.ok(codes(result).includes('E_COMBO_UNCOVERED'));
  assert.ok(codes(result).includes('E_DECISIONS'));
});

test('a missing input combination is rejected', () => {
  const lesson = clone();
  lesson.scenarios = lesson.scenarios.filter((s) => s.id !== 'd.s4');
  expectFail(lesson, 'E_COMBO_UNCOVERED');
});

test('a step pointing at an unknown node is rejected', () => {
  const lesson = clone();
  lesson.scenarios[0].steps[0].node = 'd.does_not_exist';
  expectFail(lesson, 'E_NODE_REF');
});

test('a step pointing at an unknown edge is rejected', () => {
  const lesson = clone();
  lesson.scenarios[0].steps[1].edge = 'd.gate->d.queue';
  expectFail(lesson, 'E_EDGE_REF');
});

test('a missing ko string is rejected', () => {
  const lesson = clone();
  delete lesson.scenarios[0].steps[0].explain.ko;
  expectFail(lesson, 'E_LOCALE');
});

test('a missing ko title is rejected', () => {
  const lesson = clone();
  lesson.title = { en: 'English only' };
  expectFail(lesson, 'E_LOCALE');
});

test('a node label without ko is rejected', () => {
  const lesson = clone();
  lesson.diagram.nodes[0].label = { en: 'English only', ko: '   ' };
  expectFail(lesson, 'E_LOCALE');
});

test('more than eight combinations is rejected', () => {
  const lesson = clone();
  lesson.inputs.extra = ['a', 'b', 'c', 'd', 'e'];
  expectFail(lesson, 'E_COMBO_LIMIT');
  assert.equal(combinations(lesson.inputs).length, 20);
  assert.equal(LIMITS.maxCombinations, 8);
});

test('more than two widgets is rejected', () => {
  const lesson = clone();
  lesson.inputs.extra = ['x', 'y'];
  expectFail(lesson, 'E_WIDGET_LIMIT');
  assert.equal(LIMITS.maxWidgets, 2);
});

test('two scenarios on the same trigger are rejected', () => {
  const lesson = clone();
  lesson.scenarios[1].trigger = { ...lesson.scenarios[0].trigger };
  expectFail(lesson, 'E_TRIGGER_DUP');
});

test('a trigger value outside the declared inputs is rejected', () => {
  const lesson = clone();
  lesson.scenarios[0].trigger.mode = 'sideways';
  expectFail(lesson, 'E_TRIGGER');
});

test('a cluster grouping an unknown node is rejected', () => {
  const lesson = clone();
  lesson.diagram.nodes[1].group = ['d.queue', 'd.ghost'];
  expectFail(lesson, 'E_CLUSTER');
});

test('a toggle widget with other than two values is rejected', () => {
  const lesson = clone();
  lesson.inputs.gate = ['open', 'shut', 'maybe'];
  lesson.scenarios.push(
    { ...structuredClone(lesson.scenarios[0]), id: 'd.s5', trigger: { mode: 'stock', gate: 'maybe' } },
    { ...structuredClone(lesson.scenarios[0]), id: 'd.s6', trigger: { mode: 'drain', gate: 'maybe' } },
  );
  expectFail(lesson, 'E_INPUTS');
});

test('a quiz answer outside the choice list is rejected', () => {
  const lesson = clone();
  lesson.quiz = [{
    q: { en: 'Which?', ko: '어느 것?' },
    choices: [{ en: 'One', ko: '하나' }, { en: 'Two', ko: '둘' }],
    answer: 4,
  }];
  expectFail(lesson, 'E_QUIZ');
});

test('a non-object lesson is rejected without throwing', () => {
  assert.equal(validateLesson(null).ok, false);
  assert.equal(validateLesson('nope').ok, false);
});

test('combinations covers the cartesian product in a stable order', () => {
  const rows = combinations(dummy.inputs);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { mode: 'stock', gate: 'open' });
  assert.deepEqual(rows[3], { mode: 'drain', gate: 'shut' });
});

test('findScenario resolves each combination to exactly one scenario', () => {
  const ids = combinations(dummy.inputs).map((c) => findScenario(dummy, c).id);
  assert.deepEqual(ids, ['d.s1', 'd.s2', 'd.s3', 'd.s4']);
  assert.equal(findScenario(dummy, { mode: 'stock' }), null);
});

test('edge references accept both the string and the object form', () => {
  assert.deepEqual(normalizeEdgeRef('a->b'), { from: 'a', to: 'b' });
  assert.deepEqual(normalizeEdgeRef({ from: 'a', to: 'b' }), { from: 'a', to: 'b' });
  assert.equal(normalizeEdgeRef('a'), null);
  assert.equal(edgeKey('a', 'b'), 'a->b');
});

test('locale helpers read both locales and fall back to en', () => {
  assert.equal(pickText({ en: 'Result', ko: '결과' }, 'ko'), '결과');
  assert.equal(pickText({ en: 'Result', ko: '결과' }, 'de'), 'Result');
  assert.equal(pickText('plain', 'ko'), 'plain');
  assert.equal(pickText(null, 'en'), '');
  assert.equal(isLocalized({ en: 'a', ko: 'b' }), true);
  assert.equal(isLocalized({ en: 'a' }), false);
});

/* ---------- decisions: the schema extension this project adds ---------- */

test('a decision card missing its ko body is rejected', () => {
  const lesson = clone();
  delete lesson.decisions[0].body.ko;
  expectFail(lesson, 'E_DECISIONS');
});

test('a decision card missing its ko title is rejected', () => {
  const lesson = clone();
  lesson.decisions[1].title = { en: 'English only' };
  expectFail(lesson, 'E_DECISIONS');
});

test('a decision card without an id is rejected', () => {
  const lesson = clone();
  delete lesson.decisions[2].id;
  expectFail(lesson, 'E_DECISIONS');
});

test('two decision cards sharing an id are rejected', () => {
  const lesson = clone();
  lesson.decisions[1].id = lesson.decisions[0].id;
  expectFail(lesson, 'E_DECISIONS');
});

test('fewer than three or more than five decision cards is rejected', () => {
  const few = clone();
  few.decisions = few.decisions.slice(0, 2);
  expectFail(few, 'E_DECISIONS');

  const many = clone();
  const extra = (n) => ({
    id: `d.x${n}`,
    title: { en: `Extra ${n}`, ko: `추가 ${n}` },
    body: { en: 'Filler.', ko: '채움.' },
  });
  many.decisions = [...many.decisions, extra(1), extra(2), extra(3)];
  expectFail(many, 'E_DECISIONS');
  assert.deepEqual(DECISION_LIMITS, { min: 3, max: 5 });
});

test('decisions of the wrong type are rejected without throwing', () => {
  const notArray = clone();
  notArray.decisions = { nope: true };
  expectFail(notArray, 'E_DECISIONS');

  const notObjects = clone();
  notObjects.decisions = ['a', 'b', 'c'];
  expectFail(notObjects, 'E_DECISIONS');
});

test('the dummy lesson exercises the engine features it is there to prove', () => {
  const nodes = dummy.diagram.nodes;
  assert.ok(nodes.some((n) => Array.isArray(n.group) && n.group.length >= 2), 'needs a cluster');
  assert.ok(nodes.some((n) => n.role === 'gate'), 'needs a valve-styled gate node');
  assert.ok(dummy.diagram.edges.some((e) => Number.isFinite(e.bow)), 'needs a bowed loop-back edge');
  assert.equal(Object.keys(dummy.inputs).length, 2);
  assert.equal(dummy.scenarios.length, 4);
  assert.equal(dummy.decisions.length, 3);
  const types = Object.values(dummy.widgets).map((w) => w.type);
  assert.deepEqual([...types].sort(), ['chips', 'toggle']);
  const badges = dummy.scenarios.flatMap((s) => s.steps.map((st) => st.badge)).filter(Boolean);
  for (const wanted of ['unordered', 'pass', 'quarantined', 'requeued', 'end']) {
    assert.ok(badges.includes(wanted), `dummy should carry a "${wanted}" badge`);
  }
});
