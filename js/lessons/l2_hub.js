/**
 * L2 — Multi-channel Content Hub. Transcribed from docs/CONTENT-SPEC.md §3.
 * The spec is the source of truth for every string in this file.
 */

import { l2Scenarios } from './l2_hub_scenarios.js';

const H = 56;

export const l2 = {
  id: 'l2-content-hub',
  minutes: 6,
  asOf: '2026-08',
  title: { en: 'Multi-channel Content Hub', ko: '멀티채널 콘텐츠 허브' },
  intro: {
    en: 'One pipeline, several channels. Each channel plugs in a source adapter and a "colour" — persona, factual standard, risk rules, visual style — and the shared stages do the rest. The gate is the interesting part: it scores some things and refuses others outright.',
    ko: '하나의 파이프라인, 여러 개의 채널. 각 채널은 소스 어댑터와 "색"(페르소나·사실 기준·리스크 규칙·비주얼 스타일)만 꽂고, 공유 단계가 나머지를 처리합니다. 흥미로운 부분은 게이트입니다 — 어떤 것은 점수를 매기고, 어떤 것은 아예 거부합니다.',
  },

  diagram: {
    nodes: [
      { id: 'l2.trigger', role: 'event', x: 0, y: 0, h: H, label: { en: 'Scheduled factory run', ko: '예약 공장 실행' } },
      { id: 'l2.registry', role: 'artifact', x: 280, y: 0, h: H, label: { en: 'Channel registry', ko: '채널 레지스트리' } },
      { id: 'l2.adapter', role: 'decision', x: 560, y: 0, h: H, label: { en: 'Source adapter', ko: '소스 어댑터' } },
      { id: 'l2.candidates', role: 'artifact', x: 840, y: 0, h: H, label: { en: 'Candidate pool', ko: '후보 풀' } },
      { id: 'l2.score', role: 'event', x: 1120, y: 0, h: H, label: { en: 'Two-stage scoring', ko: '2단계 채점' } },
      { id: 'l2.overproduce', role: 'event', x: 1120, y: 170, h: H, label: { en: 'Overproduce variants', ko: '변주 과생산' } },
      { id: 'l2.gate', role: 'gate', x: 1120, y: 340, h: H, label: { en: 'Gate: score + rule', ko: '게이트: 점수 + 규칙' } },
      { id: 'l2.visual', role: 'event', x: 840, y: 340, h: H, label: { en: 'Visual direction', ko: '비주얼 디렉션' } },
      { id: 'l2.render', role: 'event', x: 560, y: 340, h: H, label: { en: 'Render vertical clip', ko: '세로 클립 렌더' } },
      { id: 'l2.route', role: 'decision', x: 280, y: 340, h: H, label: { en: 'Channel routing', ko: '채널 라우팅' } },
      { id: 'l2.slot', role: 'event', x: 0, y: 340, h: H, label: { en: 'Scheduled release slot', ko: '예약 공개 슬롯' } },
      { id: 'l2.blocked', role: 'terminal', x: 840, y: 510, h: H, label: { en: 'Risk-blocked', ko: '리스크 차단' } },
      { id: 'l2.rejectlog', role: 'artifact', x: 560, y: 510, h: H, label: { en: 'Rejection log', ko: '폐기 로그' } },
      { id: 'l2.report', role: 'artifact', x: 280, y: 510, h: H, label: { en: 'Run report', ko: '실행 리포트' } },
    ],
    edges: [
      { from: 'l2.trigger', to: 'l2.registry' },
      { from: 'l2.registry', to: 'l2.adapter' },
      { from: 'l2.adapter', to: 'l2.candidates', label: { en: 'normalize', ko: '정규화' } },
      { from: 'l2.candidates', to: 'l2.score' },
      { from: 'l2.score', to: 'l2.overproduce' },
      { from: 'l2.overproduce', to: 'l2.gate' },
      { from: 'l2.gate', to: 'l2.visual', label: { en: 'pass', ko: '통과' } },
      { from: 'l2.gate', to: 'l2.rejectlog', axis: 'v', label: { en: 'score fail', ko: '점수 미달' } },
      { from: 'l2.gate', to: 'l2.blocked', label: { en: 'risk', ko: '리스크' } },
      { from: 'l2.visual', to: 'l2.render' },
      { from: 'l2.render', to: 'l2.route' },
      { from: 'l2.route', to: 'l2.slot' },
      { from: 'l2.slot', to: 'l2.report' },
      { from: 'l2.rejectlog', to: 'l2.report' },
      { from: 'l2.blocked', to: 'l2.report', bow: 80 },
    ],
  },

  inputs: {
    source: ['archive-feed', 'curated-seed'],
    gate: ['pass', 'risk-block'],
  },

  widgets: {
    source: {
      type: 'chips',
      label: { en: 'Source adapter', ko: '소스 어댑터' },
      valueLabels: {
        'archive-feed': { en: 'harvested public archive', ko: '수확한 공개 아카이브' },
        'curated-seed': { en: 'curated static seed', ko: '큐레이션 시드 파일' },
      },
    },
    gate: {
      type: 'toggle',
      label: { en: 'Gate verdict', ko: '게이트 판정' },
      valueLabels: {
        pass: { en: 'best variant clears', ko: '최선 변주 통과' },
        'risk-block': { en: 'risk rule tripped', ko: '리스크 규칙 위반' },
      },
    },
  },

  scenarios: l2Scenarios,

  decisions: [
    {
      id: 'l2.d1',
      title: { en: 'Why adapters instead of one pipeline per channel', ko: '왜 채널마다 파이프라인이 아니라 어댑터인가' },
      body: {
        en: 'Channels differ in exactly two places: where the material comes from, and what tone and standards it is held to. Everything between — scoring, overproduction, gating, visual direction, rendering, uploading — is identical. So the design isolates the difference into a source adapter and a per-domain "colour" entry, and shares one code path for the rest. Adding a channel becomes a registry row plus a colour entry, and a fix to the shared stages benefits every channel at once instead of being ported four times.',
        ko: '채널은 정확히 두 곳에서만 다릅니다 — 소재가 어디서 오는가, 어떤 톤과 기준으로 다뤄지는가. 그 사이의 모든 것(채점·과생산·게이팅·비주얼 디렉션·렌더·업로드)은 동일합니다. 그래서 설계는 차이를 소스 어댑터와 도메인별 색 항목으로 격리하고 나머지는 한 코드 경로를 공유합니다. 채널 추가는 레지스트리 한 줄 + 색 한 항목이 되고, 공유 단계의 수정은 네 번 이식되는 대신 모든 채널에 한 번에 적용됩니다.',
      },
    },
    {
      id: 'l2.d2',
      title: { en: 'Why overproduce and discard', ko: '왜 과생산하고 버리나' },
      body: {
        en: 'Text generation is the cheapest stage and rendering is the most expensive, so the yield problem should be solved where it is cheap. Producing several variants with deliberately different angles and keeping at most one turned out to be the difference between "no publishable output today" and "two". The uncomfortable consequence is that the gate must be allowed to reject everything, including on days when that leaves the channel silent.',
        ko: '텍스트 생성은 가장 싼 단계이고 렌더는 가장 비싼 단계이므로, 수율 문제는 싼 곳에서 풀어야 합니다. 각도를 일부러 달리한 변주 여러 개를 만들어 많아야 하나만 남기는 방식이, 실측상 "오늘 발행할 게 없다"와 "두 편 있다"를 갈랐습니다. 불편한 귀결은 게이트가 전부 거부할 수 있어야 한다는 것입니다 — 그날 채널이 침묵하게 되더라도.',
      },
    },
    {
      id: 'l2.d3',
      title: { en: 'Why risk is a rule, not a score', ko: '왜 리스크는 점수가 아니라 규칙인가' },
      body: {
        en: 'A weighted score lets a high hook rating buy off a legal problem. It should not be purchasable. So the gate has two kinds of axis: scored axes with thresholds, and one rule axis whose failure discards the item regardless of everything else. The asymmetry reflects the asymmetry of the outcomes — a weak hook loses views, a defamation or a distorted verdict loses the channel.',
        ko: '가중 점수는 높은 후킹 점수로 법적 문제를 상쇄할 수 있게 만듭니다. 그건 살 수 있는 것이면 안 됩니다. 그래서 게이트는 두 종류의 축을 가집니다 — 임계값이 있는 점수 축들과, 실패하면 다른 모든 것과 무관하게 폐기되는 규칙 축 하나. 이 비대칭은 결과의 비대칭을 반영합니다 — 약한 훅은 조회수를 잃지만, 명예훼손이나 왜곡된 결말은 채널을 잃습니다.',
      },
    },
    {
      id: 'l2.d4',
      title: { en: 'Why the rejection log excludes passing-but-unused variants', ko: '왜 폐기 로그에서 통과했으나 미채택을 빼는가' },
      body: {
        en: 'The rejection log exists to teach the sourcing stage what does not work. Variants split three ways — selected, passing-but-not-chosen, and rejected — and only the last belongs in that log. Logging the middle group would tell the feedback loop that perfectly good hooks failed, which corrupts exactly the signal the log was built to carry. This was found by walking one item through the whole pipeline by hand before automating it.',
        ko: '폐기 로그는 소싱 단계에 "무엇이 안 먹히는가"를 가르치기 위해 존재합니다. 변주는 셋으로 갈립니다 — 채택 / 통과했으나 미채택 / 탈락 — 그리고 마지막 것만 그 로그에 들어갑니다. 가운데 그룹을 기록하면 멀쩡한 훅이 실패했다고 피드백 루프에 알려 주게 되고, 로그가 나르려던 바로 그 신호가 오염됩니다. 이 사실은 자동화 전에 한 건을 손으로 전 구간 관통시켜 보다가 발견됐습니다.',
      },
    },
    {
      id: 'l2.d5',
      title: { en: 'Why release time is decoupled from production time', ko: '왜 공개 시각을 제작 시각에서 떼어내나' },
      body: {
        en: 'The factory runs when the machine is free, which is not when an audience is awake. Publishing at production time produced items nobody saw. The fix is to upload at production time but set the item to become public at a chosen later slot, with siblings spaced apart, so a batch does not land as a wall. It also means a produced item can sit unreleased indefinitely without any special "hold" mechanism — the slot simply has not arrived.',
        ko: '공장은 기계가 한가할 때 돌고, 그때는 시청자가 깨어 있는 시간이 아닙니다. 제작 시점에 발행했더니 아무도 보지 않는 편이 나왔습니다. 해법은 제작 시점에 업로드하되 선택한 나중 슬롯에 공개되도록 설정하고, 형제 편들의 간격을 벌리는 것입니다 — 배치가 벽처럼 쏟아지지 않게. 덕분에 제작된 항목이 별도의 보류 장치 없이도 얼마든지 미공개로 앉아 있을 수 있습니다. 슬롯이 아직 안 왔을 뿐이니까요.',
      },
    },
  ],

  quiz: [
    {
      q: {
        en: 'What does adding a new channel require in this design?',
        ko: '이 설계에서 새 채널 추가에는 무엇이 필요합니까?',
      },
      choices: [
        { en: 'A copy of the pipeline with the new tone applied', ko: '새 톤을 적용한 파이프라인 사본' },
        { en: 'A registry row plus a domain-colour entry; the shared stages are untouched', ko: '레지스트리 한 줄 + 도메인 색 한 항목, 공유 단계는 무수정' },
        { en: 'A separate scheduler and a separate state store', ko: '별도 스케줄러와 별도 상태 저장소' },
        { en: 'Nothing — channels are detected automatically', ko: '아무것도 — 채널은 자동 감지된다' },
      ],
      answer: 1,
    },
    {
      q: {
        en: 'A variant scores very highly on hook strength but trips the risk axis. What happens?',
        ko: '한 변주가 후킹력 점수는 매우 높은데 리스크 축에 걸렸습니다. 어떻게 됩니까?',
      },
      choices: [
        { en: 'It is published with a disclaimer', ko: '면책 문구를 붙여 발행된다' },
        { en: 'The scores are averaged and it passes', ko: '점수가 평균되어 통과한다' },
        { en: 'It is discarded regardless of its other scores', ko: '다른 점수와 무관하게 폐기된다' },
        { en: 'It is downgraded to a backup variant', ko: '백업 변주로 강등된다' },
      ],
      answer: 2,
    },
    {
      q: {
        en: 'Which variants belong in the rejection log?',
        ko: '폐기 로그에는 어떤 변주가 들어갑니까?',
      },
      choices: [
        { en: 'Every variant that was not published', ko: '발행되지 않은 모든 변주' },
        { en: 'Only variants the gate rejected — not passing variants that simply were not chosen', ko: '게이트가 탈락시킨 변주만 — 통과했지만 미채택된 것은 제외' },
        { en: 'Only the selected variant, for comparison', ko: '비교를 위해 채택된 변주만' },
        { en: 'None; the log records published items', ko: '없다; 로그는 발행분을 기록한다' },
      ],
      answer: 1,
    },
  ],
};

export default l2;
