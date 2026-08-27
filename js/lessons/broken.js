/**
 * Deliberately invalid lesson, loaded only through the `?lesson=broken` test
 * hook. It proves the data-error fallback: the schema gate rejects it and the
 * app shows the static overview view instead of crashing.
 *
 * Faults planted here: a step pointing at a node that is not in the diagram,
 * an input combination that no scenario triggers on, and a decision card
 * missing its Korean body.
 */

export const broken = {
  id: 'broken',
  demo: true,
  minutes: 1,
  asOf: '2026-08',
  title: { en: 'Broken fixture', ko: '손상된 픽스처' },
  intro: {
    en: 'This lesson is intentionally invalid so the fallback view can be tested.',
    ko: '폴백 뷰를 시험하려고 일부러 잘못 만든 레슨입니다.',
  },
  diagram: {
    nodes: [
      { id: 'b.one', role: 'event', x: 0, y: 0, h: 56, label: { en: 'First', ko: '첫 번째' } },
      { id: 'b.two', role: 'terminal', x: 260, y: 0, h: 56, label: { en: 'Second', ko: '두 번째' } },
    ],
    edges: [{ from: 'b.one', to: 'b.two' }],
  },
  inputs: {
    pick: ['a', 'b'],
  },
  scenarios: [
    {
      id: 'b.s1',
      trigger: { pick: 'a' },
      steps: [
        { node: 'b.one', explain: { en: 'Start.', ko: '시작.' } },
        { node: 'b.nowhere', explain: { en: 'This node does not exist.', ko: '이 노드는 존재하지 않습니다.' } },
      ],
    },
  ],
  decisions: [
    {
      id: 'b.d1',
      title: { en: 'A card with no Korean body', ko: '한국어 본문이 없는 카드' },
      body: { en: 'Only English here, which the decisions check must reject.' },
    },
  ],
};

export default broken;
