/**
 * L0 scenarios, transcribed from docs/CONTENT-SPEC.md §1.4.
 * Split out of the lesson module so both files stay small.
 */

export const l0Scenarios = [
  {
    id: 'l0.s1',
    trigger: { gate: 'pass', queue: 'stocked' },
    steps: [
      { node: 'l0.schedule', badge: 'unattended', explain: {
        en: 'The run starts on its own, on a fixed cadence, with nobody watching. Everything downstream has to be safe to do unattended.',
        ko: '정해진 주기에 맞춰 아무도 보지 않는 상태로 실행이 시작됩니다. 이후 모든 단계는 무인으로 돌아도 안전해야 합니다.',
      } },
      { node: 'l0.claim', edge: 'l0.queue->l0.claim', explain: {
        en: 'It claims exactly one item from the inventory queue. One item per run keeps a bad run from burning the whole backlog.',
        ko: '재고 큐에서 정확히 한 건만 클레임합니다. 한 번에 한 건이라 실패한 실행이 백로그 전체를 태우지 않습니다.',
      } },
      { node: 'l0.produce', edge: 'l0.claim->l0.produce', explain: {
        en: 'The produce stage turns the source item into a candidate — text, structure, or both. This is where the model calls happen.',
        ko: '생산 단계가 소스 항목을 후보물로 바꿉니다 — 텍스트, 구조, 또는 둘 다. 모델 호출이 일어나는 자리입니다.',
      } },
      { node: 'l0.cache', edge: 'l0.produce->l0.cache', explain: {
        en: 'Each stage writes its output to disk before the next stage starts, so an interrupted run resumes instead of re-paying for finished work.',
        ko: '각 단계는 다음 단계 전에 산출물을 디스크에 씁니다. 그래서 중단된 실행은 이미 끝난 작업을 다시 결제하지 않고 이어서 진행합니다.',
      } },
      { node: 'l0.gate', edge: 'l0.cache->l0.gate', badge: 'pass', explain: {
        en: 'The gate scores the candidate and applies its blocking rules. It runs before the render, because the render is the expensive stage.',
        ko: '게이트가 후보물을 채점하고 차단 규칙을 적용합니다. 렌더가 비싼 단계이므로 게이트는 렌더 앞에 섭니다.',
      } },
      { node: 'l0.render', edge: 'l0.gate->l0.render', explain: {
        en: 'Only approved work reaches the render. Media assembly is measured in minutes per item, not seconds.',
        ko: '승인된 작업만 렌더에 도달합니다. 미디어 조립은 초가 아니라 건당 분 단위입니다.',
      } },
      { node: 'l0.publish', edge: 'l0.render->l0.publish', explain: {
        en: 'The finished file goes into the publish queue rather than straight out the door, so release timing is a separate decision from production timing.',
        ko: '완성 파일은 곧장 나가지 않고 발행 큐로 들어갑니다. 그래서 공개 시점이 제작 시점과 분리된 결정이 됩니다.',
      } },
      { node: 'l0.done', edge: 'l0.report->l0.done', badge: 'end', explain: {
        en: 'The run reports what it did and ends. The report is sent whether the run succeeded or failed.',
        ko: '실행이 결과를 보고하고 끝납니다. 리포트는 성공·실패와 무관하게 발송됩니다.',
      } },
    ],
  },
  {
    id: 'l0.s2',
    trigger: { gate: 'fail', queue: 'stocked' },
    steps: [
      { node: 'l0.schedule', badge: 'unattended', explain: {
        en: 'The scheduled run starts as usual.',
        ko: '예약 실행이 평소대로 시작됩니다.',
      } },
      { node: 'l0.claim', edge: 'l0.queue->l0.claim', explain: {
        en: 'One item is claimed from the inventory queue.',
        ko: '재고 큐에서 한 건이 클레임됩니다.',
      } },
      { node: 'l0.produce', edge: 'l0.claim->l0.produce', explain: {
        en: 'The produce stage generates a candidate.',
        ko: '생산 단계가 후보물을 만듭니다.',
      } },
      { node: 'l0.gate', edge: 'l0.cache->l0.gate', badge: 'rejected', explain: {
        en: 'The gate rejects it. Rejection is a normal outcome, not an error — a run that produces nothing publishable is still a correct run.',
        ko: '게이트가 거부합니다. 거부는 오류가 아니라 정상 결과입니다 — 발행할 것이 하나도 안 나온 실행도 올바른 실행입니다.',
      } },
      { node: 'l0.quarantine', edge: 'l0.gate->l0.quarantine', badge: 'quarantined', explain: {
        en: 'The rejected item is set aside with its reason recorded, and the retry counter is incremented. The render never runs, so the expensive stage costs nothing.',
        ko: '거부된 항목은 사유가 기록된 채 격리되고 재시도 카운터가 올라갑니다. 렌더는 실행되지 않으므로 비싼 단계에 비용이 들지 않습니다.',
      } },
      { node: 'l0.queue', edge: 'l0.quarantine->l0.queue', badge: 'requeued', explain: {
        en: 'With retries remaining, the item goes back to the queue and the next scheduled run picks it up again. Transient failures heal themselves overnight.',
        ko: '재시도 여유가 있으면 항목은 큐로 돌아가고 다음 예약 실행이 다시 집어갑니다. 일시적 실패는 하룻밤 사이에 스스로 낫습니다.',
      } },
      { node: 'l0.report', explain: {
        en: 'The run still reports. A silent failed run is the one failure mode an unattended pipeline cannot tolerate.',
        ko: '그래도 실행은 보고합니다. 조용히 실패하는 실행이야말로 무인 파이프라인이 견딜 수 없는 유일한 실패 형태입니다.',
      } },
      { node: 'l0.done', edge: 'l0.report->l0.done', badge: 'end', explain: {
        en: 'The run ends having produced nothing — by design.',
        ko: '아무것도 만들지 않은 채 실행이 끝납니다 — 설계대로입니다.',
      } },
    ],
  },
  {
    id: 'l0.s3',
    trigger: { gate: 'pass', queue: 'empty' },
    steps: [
      { node: 'l0.schedule', badge: 'unattended', explain: {
        en: 'The scheduled run starts on cadence, as it does every time.',
        ko: '예약 실행이 늘 그렇듯 주기에 맞춰 시작됩니다.',
      } },
      { node: 'l0.queue', edge: 'l0.schedule->l0.queue', badge: 'empty', explain: {
        en: 'The inventory queue is empty. Nothing has been stocked since the last run drained it.',
        ko: '재고 큐가 비어 있습니다. 지난 실행이 비운 뒤로 채워진 것이 없습니다.',
      } },
      { node: 'l0.claim', edge: 'l0.queue->l0.claim', badge: 'no-op', explain: {
        en: 'The claim finds no item. The run does not invent work, and it does not fail either.',
        ko: '클레임이 아무 항목도 찾지 못합니다. 실행은 일을 지어내지도, 실패로 처리하지도 않습니다.',
      } },
      { node: 'l0.report', edge: 'l0.claim->l0.report', explain: {
        en: 'It reports "nothing to do". This is how an empty queue becomes visible — otherwise a drained pipeline looks exactly like a healthy quiet one.',
        ko: '"할 일 없음"을 보고합니다. 빈 큐가 보이게 되는 유일한 경로입니다 — 그러지 않으면 고갈된 파이프라인과 조용히 건강한 파이프라인이 똑같아 보입니다.',
      } },
      { node: 'l0.done', edge: 'l0.report->l0.done', badge: 'end', explain: {
        en: 'The run ends. Restocking the queue is a separate, operator-initiated job.',
        ko: '실행이 끝납니다. 큐를 다시 채우는 것은 운영자가 시작하는 별도의 작업입니다.',
      } },
    ],
  },
  {
    id: 'l0.s4',
    trigger: { gate: 'fail', queue: 'empty' },
    steps: [
      { node: 'l0.schedule', badge: 'unattended', explain: {
        en: 'The scheduled run starts.',
        ko: '예약 실행이 시작됩니다.',
      } },
      { node: 'l0.queue', edge: 'l0.schedule->l0.queue', badge: 'empty', explain: {
        en: 'The queue is empty, so the gate setting has no effect on this run — there is no candidate to judge.',
        ko: '큐가 비어 있어 게이트 설정은 이번 실행에 영향이 없습니다 — 판정할 후보물 자체가 없습니다.',
      } },
      { node: 'l0.claim', edge: 'l0.queue->l0.claim', badge: 'no-op', explain: {
        en: 'Nothing is claimed, so produce, gate and render are all skipped.',
        ko: '클레임되는 것이 없으므로 생산·게이트·렌더가 모두 건너뛰어집니다.',
      } },
      { node: 'l0.report', edge: 'l0.claim->l0.report', explain: {
        en: 'The run reports the empty queue.',
        ko: '실행이 빈 큐를 보고합니다.',
      } },
      { node: 'l0.done', edge: 'l0.report->l0.done', badge: 'end', explain: {
        en: 'The run ends. The order matters: the queue is checked before anything is produced, so an empty queue costs one cheap wake-up rather than a wasted generation.',
        ko: '실행이 끝납니다. 순서가 중요합니다 — 무엇을 생산하기 전에 큐를 먼저 확인하므로, 빈 큐의 비용은 낭비된 생성이 아니라 값싼 기상 한 번입니다.',
      } },
    ],
  },
];

export default l0Scenarios;
