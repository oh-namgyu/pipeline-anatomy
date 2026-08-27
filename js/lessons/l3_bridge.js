/**
 * L3 — Story Design to Render Bridge. Transcribed from docs/CONTENT-SPEC.md §4.
 * The spec is the source of truth for every string in this file.
 */

import { l3Scenarios } from './l3_bridge_scenarios.js';

const H = 56;

export const l3 = {
  id: 'l3-design-render-bridge',
  minutes: 7,
  asOf: '2026-08',
  title: { en: 'Story Design → Render Bridge', ko: '스토리 설계→렌더 브리지' },
  intro: {
    en: 'A structure-design tool on one side, a rendering pipeline on the other, and a contract in between. This lesson follows an episode across that bridge: story gate, deterministic import, casting from a reusable library, a push of the agreed values into the renderer, and a review loop that re-renders single beats instead of whole episodes.',
    ko: '한쪽에는 구조 설계 도구, 다른 쪽에는 렌더 파이프라인, 그 사이에 계약이 있습니다. 이 레슨은 한 편이 그 다리를 건너는 과정을 따라갑니다 — 스토리 게이트, 결정적 import, 재사용 도감에서의 캐스팅, 합의된 값의 렌더러 푸시, 그리고 편 전체가 아니라 비트 하나를 다시 렌더하는 재검토 루프.',
  },

  diagram: {
    nodes: [
      { id: 'l3.storyline', role: 'event', x: 0, y: 0, h: H, label: { en: 'Storyline generation', ko: '스토리라인 생성' } },
      { id: 'l3.gate', role: 'gate', x: 280, y: 0, h: H, label: { en: 'Story gate', ko: '스토리 게이트' } },
      { id: 'l3.import', role: 'event', x: 560, y: 0, h: H, label: { en: 'Deterministic import', ko: '결정적 import' } },
      { id: 'l3.library', role: 'artifact', x: 840, y: 0, h: H, label: { en: 'Asset and cast library', ko: '자산·배우 라이브러리' } },
      { id: 'l3.failed', role: 'terminal', x: 0, y: 180, h: H, label: { en: 'Generation failed', ko: '생성 실패' } },
      { id: 'l3.generate', role: 'event', x: 280, y: 180, h: H, label: { en: 'Generate asset', ko: '자산 생성' } },
      { id: 'l3.draft', role: 'decision', x: 560, y: 180, h: H, label: { en: 'Draft → approved', ko: '초안 → 승인' } },
      { id: 'l3.match', role: 'decision', x: 840, y: 180, h: H, label: { en: 'Reuse or create', ko: '재사용 또는 신규' } },
      { id: 'l3.push', role: 'event', x: 560, y: 360, h: H, label: { en: 'Push contract to renderer', ko: '렌더러로 계약 푸시' } },
      { id: 'l3.render', role: 'event', x: 840, y: 360, h: H, label: { en: 'Render episode', ko: '편 렌더' } },
      { id: 'l3.review', role: 'decision', x: 1120, y: 360, h: H, label: { en: 'Beat review flags', ko: '비트 재검토 플래그' } },
      { id: 'l3.rerender', role: 'event', x: 840, y: 540, h: H, label: { en: 'Re-render flagged beats', ko: '플래그 비트 재렌더' } },
      { id: 'l3.publish', role: 'terminal', x: 1120, y: 540, h: H, label: { en: 'Manual publish', ko: '수동 발행' } },
    ],
    edges: [
      { from: 'l3.storyline', to: 'l3.gate' },
      { from: 'l3.gate', to: 'l3.import', label: { en: 'pass', ko: '통과' } },
      { from: 'l3.gate', to: 'l3.storyline', bow: -80, label: { en: 'rework', ko: '재작업' } },
      { from: 'l3.import', to: 'l3.library' },
      { from: 'l3.library', to: 'l3.match' },
      { from: 'l3.match', to: 'l3.draft', label: { en: 'new', ko: '신규' } },
      { from: 'l3.draft', to: 'l3.generate', label: { en: 'approved', ko: '승인' } },
      { from: 'l3.generate', to: 'l3.failed', label: { en: 'fails', ko: '실패' } },
      { from: 'l3.failed', to: 'l3.draft', bow: 80, label: { en: 're-approve and retry', ko: '재승인·재시도' } },
      { from: 'l3.match', to: 'l3.push', label: { en: 'reuse', ko: '재사용' } },
      { from: 'l3.generate', to: 'l3.push', label: { en: 'ready', ko: '준비 완료' } },
      { from: 'l3.push', to: 'l3.render' },
      { from: 'l3.render', to: 'l3.review' },
      { from: 'l3.review', to: 'l3.publish', label: { en: 'clean', ko: '이상 없음' } },
      { from: 'l3.review', to: 'l3.rerender', label: { en: 'flagged', ko: '플래그' } },
      { from: 'l3.rerender', to: 'l3.review', axis: 'v' },
    ],
  },

  inputs: {
    cast: ['reuse', 'new'],
    review: ['approved', 'flagged'],
  },

  widgets: {
    cast: {
      type: 'chips',
      label: { en: 'Casting', ko: '캐스팅' },
      valueLabels: {
        reuse: { en: 'library already matches', ko: '도감에 이미 있음' },
        new: { en: 'performer does not exist yet', ko: '아직 없는 배우' },
      },
    },
    review: {
      type: 'toggle',
      label: { en: 'Review', ko: '재검토' },
      valueLabels: {
        approved: { en: 'passes review', ko: '검수 통과' },
        flagged: { en: 'one beat flagged', ko: '비트 하나 플래그' },
      },
    },
  },

  scenarios: l3Scenarios,

  decisions: [
    {
      id: 'l3.d1',
      title: { en: 'Why a reusable library', ko: '왜 재사용 도감인가' },
      body: {
        en: 'Regenerating a character\'s portrait for every episode is expensive and — worse — inconsistent: the same character drifts between episodes. Promoting performers, backgrounds, props and music beds into a shared library makes the first appearance the expensive one and every later appearance free, and makes visual continuity a property of the data rather than of prompt luck. The acceptance test is blunt: render an episode and count how many new assets the renderer created. Zero is the target.',
        ko: '편마다 인물 초상을 다시 생성하는 것은 비싸고, 더 나쁘게는 일관성이 없습니다 — 같은 인물이 편 사이에서 표류합니다. 배우·배경·소품·음악 베드를 공유 도감으로 승격시키면 첫 등장만 비싸고 이후 등장은 공짜가 되며, 시각적 연속성이 프롬프트 운이 아니라 데이터의 성질이 됩니다. 인수 기준은 단순합니다 — 편을 렌더하고 렌더러가 새로 만든 자산 수를 센다. 목표는 0입니다.',
      },
    },
    {
      id: 'l3.d2',
      title: { en: 'Why the crossing must be deterministic', ko: '왜 다리를 건너는 변환은 결정적이어야 하나' },
      body: {
        en: 'The bridge between the design tool and the renderer is a translation, and a translation done by a model is a place where the story can quietly change. Making import purely mechanical — beats to events, moods to a fixed emotion set, prompts backfilled by rule, zero model calls — means the thing that was reviewed and gated is exactly the thing that gets rendered. It also makes import re-runnable and testable, which a generative step would not be.',
        ko: '설계 도구와 렌더러 사이의 다리는 번역이고, 모델이 하는 번역은 이야기가 조용히 달라질 수 있는 자리입니다. import 를 순수 기계적으로(비트→사건, 무드→고정 감정 집합, 규칙 기반 프롬프트 백필, 모델 호출 0회) 만들면, 검토되고 게이트를 통과한 바로 그것이 렌더됩니다. 덤으로 import 가 재실행 가능하고 테스트 가능해집니다 — 생성 단계였다면 둘 다 불가능했을 것입니다.',
      },
    },
    {
      id: 'l3.d3',
      title: { en: 'Why the audition path must be the render path', ko: '왜 오디션 경로가 곧 렌더 경로여야 하나' },
      body: {
        en: 'Casting values were being chosen by eye, from numbers, and the result only became audible after a full render. Building a preview that synthesizes through a different code path would have been easier and useless — it would tell you about the preview, not about the output. So the preview runs the same synthesis and the same post-processing chain the renderer runs, and a contract test locks the two against drift. Measuring it also exposed the real bug: the renderer was applying a speed factor the preview never showed, so the setting being tuned had never actually reached the output.',
        ko: '캐스팅 값을 숫자로 눈대중해 고르고, 결과는 풀 렌더 후에야 들렸습니다. 다른 코드 경로로 합성하는 미리듣기를 만드는 편이 쉬웠겠지만 쓸모없었을 것입니다 — 그건 출력이 아니라 미리듣기에 대해 알려 줄 뿐이니까요. 그래서 미리듣기는 렌더러와 동일한 합성·동일한 후처리 사슬을 탑니다. 그리고 계약 테스트가 둘의 drift 를 잠급니다. 이렇게 실측하자 진짜 버그가 드러났습니다 — 렌더러가 미리듣기에 없던 속도 계수를 곱하고 있어서, 조정하던 설정이 애초에 출력에 닿은 적이 없었습니다.',
      },
    },
    {
      id: 'l3.d4',
      title: { en: 'Why review flags target beats, not episodes', ko: '왜 재검토 플래그는 편이 아니라 비트를 겨냥하나' },
      body: {
        en: '"This episode needs work" is not actionable at the cost structure of a render. Attaching a flag and a note to an individual beat turns review into a work queue with a unit small enough to act on: back up the one image, regenerate the one image, write the corrected prompt back to the source, clear the flag on success. Because the flag clears itself, the list of outstanding rework is derived from state and cannot drift from reality the way a hand-kept list does.',
        ko: '렌더의 비용 구조에서 "이 편 손봐야 함"은 실행 가능한 지시가 아닙니다. 개별 비트에 플래그와 메모를 붙이면 재검토가 손댈 수 있을 만큼 작은 단위의 작업 큐가 됩니다 — 그 이미지 하나 백업, 그 이미지 하나 재생성, 수정된 프롬프트를 원본에 역반영, 성공 시 플래그 해제. 플래그가 스스로 해제되므로 남은 재작업 목록이 상태에서 파생되고, 손으로 관리하는 목록처럼 현실과 어긋날 수 없습니다.',
      },
    },
    {
      id: 'l3.d5',
      title: { en: 'Why the judge cannot be the only judge', ko: '왜 심판 하나만 두면 안 되나' },
      body: {
        en: 'The story gate is a model scoring a model\'s output. Measured over repeated runs it wrote real defects into its own summary and then handed out a score that landed exactly on the passing threshold. An independent reviewer, given the same episode, called the same defects disqualifying. The lesson is structural, not about any one model: when the judge is also the player, the score drifts toward passing. The response was to keep the gate as the cheap filter and add an external comprehension check before final acceptance, and to add a machine-checkable criterion — can the causal chain be reconstructed from the script alone — that a rhetorical score could not fake.',
        ko: '스토리 게이트는 모델의 산출물을 모델이 채점하는 구조입니다. 반복 실측에서 게이트는 실제 결함을 자기 총평에 써 놓고는 통과 하한에 정확히 걸치는 점수를 줬습니다. 같은 편을 받은 독립 검토자는 그 결함들을 탈락 사유로 판정했습니다. 교훈은 특정 모델이 아니라 구조에 관한 것입니다 — 심판이 선수를 겸하면 점수는 통과 쪽으로 표류합니다. 대응은 게이트를 값싼 필터로 유지하되 최종 채택 전에 외부 이해도 확인을 추가하고, 수사로 속일 수 없는 기계 판정 기준(대본만으로 인과 사슬을 복원할 수 있는가)을 도입하는 것이었습니다.',
      },
    },
  ],

  quiz: [
    {
      q: {
        en: 'Why does the design-to-render import make zero model calls?',
        ko: '설계→렌더 import 는 왜 모델 호출을 0회로 합니까?',
      },
      choices: [
        { en: 'Because model calls are unavailable at that stage', ko: '그 단계에서는 모델 호출이 불가능해서' },
        { en: 'So the thing that was reviewed and gated is exactly the thing that gets rendered', ko: '검토·게이트를 통과한 바로 그것이 렌더되도록' },
        { en: 'Because the renderer generates the text itself', ko: '렌더러가 텍스트를 직접 생성해서' },
        { en: 'To keep the import under a time limit', ko: 'import 를 시간 제한 안에 두려고' },
      ],
      answer: 1,
    },
    {
      q: {
        en: 'What is the acceptance test for the reusable asset library?',
        ko: '재사용 자산 도감의 인수 기준은 무엇입니까?',
      },
      choices: [
        { en: 'That every character has a portrait', ko: '모든 인물이 초상을 가진다' },
        { en: 'That the library has more than N entries', ko: '도감 항목이 N개를 넘는다' },
        { en: 'That rendering an episode creates zero new character assets', ko: '편을 렌더할 때 새 인물 자산이 0건 생성된다' },
        { en: 'That the render finishes faster than before', ko: '렌더가 전보다 빨라진다' },
      ],
      answer: 2,
    },
    {
      q: {
        en: 'A gate implemented as a model scoring another model\'s output was observed to do what?',
        ko: '모델이 모델의 산출물을 채점하는 게이트는 무엇을 하는 것으로 관측됐습니까?',
      },
      choices: [
        { en: 'Reject nearly everything', ko: '거의 전부를 거부한다' },
        { en: 'Describe the real defects and still score exactly at the passing threshold', ko: '실제 결함을 서술하면서도 점수는 통과 하한에 정확히 맞춘다' },
        { en: 'Score identically on every run', ko: '매 실행 동일한 점수를 준다' },
        { en: 'Refuse to score its own output', ko: '자기 산출물 채점을 거부한다' },
      ],
      answer: 1,
    },
  ],
};

export default l3;
