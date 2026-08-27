/**
 * Engine demo lesson — placeholder content, not teaching material.
 *
 * It exists to exercise every engine feature end to end: a cluster box, an
 * elbow edge, a straight edge, a loop-back edge with a bow, a valve-styled
 * `gate` node, two widget types, the full 2x2 branch matrix, badges of each
 * tone, three design-decision cards, and EN/KO throughout.
 */

const NODE_H = 56;

export const dummy = {
  id: 'dummy',
  demo: true,
  minutes: 2,
  asOf: '2026-08',
  title: { en: 'Engine demo', ko: '엔진 데모' },
  intro: {
    en: 'A placeholder lesson used to exercise the simulation engine. The wording here teaches nothing — the documented pipelines arrive in the next stage.',
    ko: '시뮬레이션 엔진을 점검하려고 만든 자리표시 레슨입니다. 여기 문구는 학습 내용이 아니며, 실제 파이프라인 레슨은 다음 단계에 들어옵니다.',
  },

  diagram: {
    nodes: [
      {
        id: 'd.trigger', role: 'event', x: 0, y: 60, w: 200, h: NODE_H,
        label: { en: 'Scheduled run starts', ko: '예약 실행 시작' },
      },
      {
        id: 'd.context', role: 'cluster', x: 322, y: -30, group: ['d.queue', 'd.cache'],
        label: { en: 'Read together — no order', ko: '함께 조회 — 순서 없음' },
      },
      {
        id: 'd.queue', role: 'artifact', x: 340, y: 10, h: NODE_H,
        label: { en: 'Inventory queue', ko: '재고 큐' },
      },
      {
        id: 'd.cache', role: 'artifact', x: 340, y: 82, h: NODE_H,
        label: { en: 'Stage cache', ko: '단계 캐시' },
      },
      {
        id: 'd.gate', role: 'gate', x: 680, y: 60, h: NODE_H,
        label: { en: 'Quality gate', ko: '품질 게이트' },
      },
      {
        id: 'd.result', role: 'terminal', x: 1000, y: 60, h: NODE_H,
        label: { en: 'Run ends', ko: '실행 종료' },
      },
    ],
    edges: [
      { from: 'd.trigger', to: 'd.context', label: { en: 'wakes up', ko: '기상' } },
      { from: 'd.context', to: 'd.gate', label: { en: 'candidate', ko: '후보물' } },
      { from: 'd.gate', to: 'd.result', label: { en: 'passes', ko: '통과' } },
      { from: 'd.gate', to: 'd.trigger', bow: 78, label: { en: 'requeued', ko: '큐로 반환' } },
    ],
  },

  inputs: {
    mode: ['stock', 'drain'],
    gate: ['open', 'shut'],
  },

  widgets: {
    mode: {
      type: 'chips',
      label: { en: 'What the run does', ko: '실행 내용' },
      valueLabels: {
        stock: { en: 'stock the queue', ko: '큐를 채운다' },
        drain: { en: 'drain one item', ko: '한 건을 꺼낸다' },
      },
    },
    gate: {
      type: 'toggle',
      label: { en: 'Quality gate', ko: '품질 게이트' },
      valueLabels: {
        open: { en: 'not configured', ko: '설정 안 함' },
        shut: { en: 'configured', ko: '설정함' },
      },
    },
  },

  scenarios: [
    {
      id: 'd.s1',
      trigger: { mode: 'stock', gate: 'open' },
      steps: [
        { node: 'd.trigger', explain: { en: 'The scheduled run starts with nothing configured to stop it.', ko: '멈춰 세울 것이 아무것도 설정되지 않은 채 예약 실행이 시작됩니다.' } },
        { node: 'd.context', edge: 'd.trigger->d.context', badge: 'unordered', explain: {
          en: 'The cluster box lights up as a whole: its members are drawn together because nothing orders them.',
          ko: '클러스터 상자가 통째로 켜집니다 — 구성원 사이에 순서가 없어 함께 그려집니다.',
        } },
        { node: 'd.gate', edge: 'd.context->d.gate', explain: { en: 'No gate is configured, so nothing inspects the candidate.', ko: '게이트가 설정되지 않아 아무것도 후보물을 검사하지 않습니다.' } },
        { node: 'd.result', edge: 'd.gate->d.result', badge: 'end', explain: { en: 'The run finishes.', ko: '실행이 끝납니다.' } },
      ],
    },
    {
      id: 'd.s2',
      trigger: { mode: 'stock', gate: 'shut' },
      steps: [
        { node: 'd.trigger', explain: { en: 'The scheduled run starts, and a gate is configured.', ko: '예약 실행이 시작되고, 게이트가 설정돼 있습니다.' } },
        { node: 'd.context', edge: 'd.trigger->d.context', badge: 'unordered', explain: { en: 'The same unordered cluster is read first.', ko: '순서 없는 같은 클러스터를 먼저 읽습니다.' } },
        { node: 'd.gate', edge: 'd.context->d.gate', explain: { en: 'The gate scores the candidate.', ko: '게이트가 후보물을 채점합니다.' } },
        { node: 'd.gate', badge: 'pass', explain: { en: 'Stocking the queue changes nothing downstream, so the gate lets it through.', ko: '큐를 채우는 일은 하류를 바꾸지 않으므로 게이트가 통과시킵니다.' } },
        { node: 'd.result', edge: 'd.gate->d.result', badge: 'end', explain: { en: 'The run finishes.', ko: '실행이 끝납니다.' } },
      ],
    },
    {
      id: 'd.s3',
      trigger: { mode: 'drain', gate: 'open' },
      steps: [
        { node: 'd.trigger', explain: { en: 'The run claims one item to produce.', ko: '실행이 생산할 항목 한 건을 클레임합니다.' } },
        { node: 'd.context', edge: 'd.trigger->d.context', badge: 'unordered', explain: { en: 'Queue and cache are read together, in no stated order.', ko: '큐와 캐시를 순서 없이 함께 읽습니다.' } },
        { node: 'd.gate', edge: 'd.context->d.gate', explain: { en: 'With no gate configured, the candidate is not inspected.', ko: '게이트가 없어 후보물이 검사되지 않습니다.' } },
        { node: 'd.gate', badge: 'pass', explain: { en: 'Nothing checks the candidate before the expensive stage.', ko: '비싼 단계 앞에서 무엇도 후보물을 검사하지 않습니다.' } },
        { node: 'd.result', edge: 'd.gate->d.result', badge: 'end', explain: { en: 'The item is released and the run finishes.', ko: '항목이 공개되고 실행이 끝납니다.' } },
      ],
    },
    {
      id: 'd.s4',
      trigger: { mode: 'drain', gate: 'shut' },
      steps: [
        { node: 'd.trigger', explain: { en: 'The run claims one item, and a gate is configured.', ko: '실행이 한 건을 클레임하고, 게이트가 설정돼 있습니다.' } },
        { node: 'd.context', edge: 'd.trigger->d.context', badge: 'unordered', explain: { en: 'Queue and cache are read together, in no stated order.', ko: '큐와 캐시를 순서 없이 함께 읽습니다.' } },
        { node: 'd.gate', edge: 'd.context->d.gate', explain: { en: 'The gate inspects the candidate before the expensive stage runs.', ko: '비싼 단계가 돌기 전에 게이트가 후보물을 검사합니다.' } },
        { node: 'd.gate', badge: 'quarantined', explain: { en: 'It rejects the candidate, so the flow never reaches the end node.', ko: '후보물을 거부하므로 흐름이 종료 노드까지 가지 않습니다.' } },
        { node: 'd.trigger', edge: 'd.gate->d.trigger', badge: 'requeued', explain: { en: 'The bowed pipe carries the item back to the queue for the next run.', ko: '휘어진 배관이 항목을 다음 실행을 위해 큐로 되돌립니다.' } },
      ],
    },
  ],

  decisions: [
    {
      id: 'd.d1',
      title: { en: 'Why this lesson exists', ko: '이 레슨이 존재하는 이유' },
      body: {
        en: 'It is the engine fixture: every renderer feature has to appear somewhere that is not real teaching material, so a regression shows up in the tests rather than in a lesson.',
        ko: '엔진 픽스처입니다. 렌더러의 모든 기능이 실제 학습 자료가 아닌 어딘가에 한 번씩은 나타나야, 회귀가 레슨이 아니라 테스트에서 드러납니다.',
      },
    },
    {
      id: 'd.d2',
      title: { en: 'Why the decision cards are data', ko: '왜 결정 카드가 데이터인가' },
      body: {
        en: 'The reasoning behind a pipeline ages differently from the diagram of it. Keeping the cards in the same data module as the diagram means the schema gate can prove both are complete in both languages before anything renders.',
        ko: '파이프라인의 근거는 그 다이어그램과 다른 속도로 낡습니다. 카드를 다이어그램과 같은 데이터 모듈에 두면, 무엇이 렌더되기 전에 스키마 게이트가 두 언어 모두에서 완결성을 증명할 수 있습니다.',
      },
    },
    {
      id: 'd.d3',
      title: { en: 'Why the fixture is not in the registry', ko: '왜 픽스처가 레지스트리에 없는가' },
      body: {
        en: 'A demo lesson listed on the home page would be indistinguishable from real content. It is registered only when a query parameter asks for it, so the tests can reach it and visitors cannot.',
        ko: '홈에 노출된 데모 레슨은 실제 내용과 구별되지 않습니다. 쿼리 파라미터가 요청할 때만 등록되므로 테스트는 닿고 방문자는 닿지 않습니다.',
      },
    },
  ],
};

export default dummy;
