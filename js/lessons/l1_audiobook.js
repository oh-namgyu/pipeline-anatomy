/**
 * L1 — Audiobook Line. Transcribed from docs/CONTENT-SPEC.md §2.
 * The spec is the source of truth for every string in this file.
 */

import { l1Scenarios } from './l1_audiobook_scenarios.js';

const H = 56;

export const l1 = {
  id: 'l1-audiobook-line',
  minutes: 7,
  asOf: '2026-08',
  title: { en: 'Audiobook Line', ko: '오디오북 라인' },
  intro: {
    en: 'One long-form narration engine, three output formats, and a queue of titles that outlives any single run. This lesson follows a title from the inventory queue through outline, script, speech and assembly — and shows what the pipeline does when the render dies at part twelve of twenty.',
    ko: '하나의 롱폼 내레이션 엔진, 세 가지 출력 포맷, 그리고 어떤 개별 실행보다도 오래 사는 제목 큐. 이 레슨은 제목 하나가 재고 큐에서 아웃라인·대본·음성·조립을 거치는 과정을 따라가고, 20부 중 12부에서 렌더가 죽었을 때 파이프라인이 무엇을 하는지 보여 줍니다.',
  },

  diagram: {
    nodes: [
      { id: 'l1.nightly', role: 'event', x: 0, y: 0, h: H, label: { en: 'Nightly unattended run', ko: '야간 무인 실행' } },
      { id: 'l1.inventory', role: 'artifact', x: 280, y: 0, h: H, label: { en: 'Title inventory queue', ko: '제목 재고 큐' } },
      { id: 'l1.outline', role: 'event', x: 560, y: 0, h: H, label: { en: 'Outline generation', ko: '아웃라인 생성' } },
      { id: 'l1.script', role: 'event', x: 840, y: 0, h: H, label: { en: 'Per-part script', ko: '부별 대본' } },
      { id: 'l1.retry', role: 'decision', x: 1120, y: 0, h: H, label: { en: 'Fail fast or retry', ko: '즉시 중단 또는 재시도' } },
      { id: 'l1.assemble', role: 'event', x: -140, y: 170, h: H, label: { en: 'Assemble and chapter', ko: '조립·챕터' } },
      { id: 'l1.speech', role: 'event', x: 170, y: 170, h: H, label: { en: 'Speech synthesis', ko: '음성 합성' } },
      { id: 'l1.cache', role: 'artifact', x: 450, y: 170, h: H, label: { en: 'Per-part resume cache', ko: '부별 재개 캐시' } },
      { id: 'l1.pace', role: 'gate', x: 140, y: 340, h: H, label: { en: 'Pace gate', ko: '페이스 게이트' } },
      { id: 'l1.publish', role: 'event', x: 420, y: 340, h: H, label: { en: 'Scheduled release', ko: '예약 공개' } },
      { id: 'l1.done', role: 'terminal', x: 700, y: 340, h: H, label: { en: 'Episode released', ko: '편 공개 완료' } },
      { id: 'l1.hold', role: 'terminal', x: 140, y: 500, h: H, label: { en: 'Held for next window', ko: '다음 창까지 보류' } },
      { id: 'l1.assets', role: 'artifact', x: 740, y: 500, h: H, label: { en: 'Illustration drip queue', ko: '삽화 드립 큐' } },
    ],
    edges: [
      { from: 'l1.nightly', to: 'l1.inventory' },
      { from: 'l1.inventory', to: 'l1.outline' },
      { from: 'l1.outline', to: 'l1.script', label: { en: 'N parts', ko: 'N개 부' } },
      { from: 'l1.script', to: 'l1.cache', axis: 'v', label: { en: 'writes per part', ko: '부별 기록' } },
      { from: 'l1.cache', to: 'l1.speech' },
      { from: 'l1.speech', to: 'l1.cache', bow: 70, label: { en: 'audio per part', ko: '부별 음성' } },
      { from: 'l1.cache', to: 'l1.assemble', bow: -70 },
      { from: 'l1.assemble', to: 'l1.pace' },
      { from: 'l1.pace', to: 'l1.publish', label: { en: 'pace ok', ko: '주기 충족' } },
      { from: 'l1.publish', to: 'l1.done' },
      { from: 'l1.pace', to: 'l1.hold', label: { en: 'too soon', ko: '너무 이름' } },
      { from: 'l1.assets', to: 'l1.assemble' },
      { from: 'l1.script', to: 'l1.retry', label: { en: 'fails', ko: '실패' } },
      { from: 'l1.speech', to: 'l1.retry', bow: -90 },
      { from: 'l1.assemble', to: 'l1.retry', bow: 40 },
      { from: 'l1.retry', to: 'l1.inventory', bow: -190, label: { en: 'retry next run', ko: '다음 실행에 재시도' } },
      { from: 'l1.retry', to: 'l1.done', axis: 'v', label: { en: 'stop immediately', ko: '즉시 중단' } },
    ],
  },

  inputs: {
    format: ['long', 'short', 'mid'],
    render: ['ok', 'fail'],
  },

  widgets: {
    format: {
      type: 'chips',
      label: { en: 'Output format', ko: '출력 포맷' },
      valueLabels: {
        long: { en: 'long-form narration', ko: '롱폼 내레이션' },
        short: { en: 'short vertical teaser', ko: '세로 쇼츠 티저' },
        mid: { en: 'mid-length illustrated', ko: '중폼 삽화 대화' },
      },
    },
    render: {
      type: 'toggle',
      label: { en: 'Render', ko: '렌더' },
      valueLabels: {
        ok: { en: 'completes', ko: '완주' },
        fail: { en: 'dies partway', ko: '중간에 죽음' },
      },
    },
  },

  scenarios: l1Scenarios,

  decisions: [
    {
      id: 'l1.d1',
      title: { en: 'Why outline before prose', ko: '왜 산문보다 아웃라인이 먼저인가' },
      body: {
        en: 'Asking a model for hours of narration in one call gives you no seam to resume from and no way to check the shape before paying for the words. Splitting a title into N parts first makes the structure a cached artifact that can be reviewed, and turns the expensive part into N independent, individually retryable calls. It also lets each part be told what came before it, which is what keeps a serialized narration from restarting its greeting every episode.',
        ko: '모델에게 몇 시간짜리 내레이션을 한 번에 요구하면 재개할 이음새도, 단어값을 치르기 전에 형태를 확인할 방법도 없습니다. 제목을 먼저 N개 부로 쪼개면 구조가 검토 가능한 캐시 산출물이 되고, 비싼 부분이 개별 재시도 가능한 N개의 독립 호출로 바뀝니다. 각 부에 "앞에 무엇이 있었는지"를 알려 줄 수 있게 되는 것도 이 덕분이며, 연속 내레이션이 매 편 인사말부터 다시 시작하지 않는 이유가 이것입니다.',
      },
    },
    {
      id: 'l1.d2',
      title: { en: 'Why a per-part resume cache', ko: '왜 부별 재개 캐시인가' },
      body: {
        en: 'A multi-hour production that has to start over from zero after any failure is not an unattended pipeline, it is a coin flip. Writing each part\'s script and audio to its own file before moving on means the resume rule is trivially correct: if the file exists, skip the stage. The same rule at the top level — a finished output file means skip the whole title — is what makes it safe to re-run the nightly job blindly.',
        ko: '실패할 때마다 처음부터 다시 시작해야 하는 몇 시간짜리 제작은 무인 파이프라인이 아니라 동전 던지기입니다. 각 부의 대본과 음성을 다음으로 넘어가기 전에 파일로 남기면 재개 규칙이 자명하게 옳아집니다 — 파일이 있으면 그 단계는 건너뛴다. 최상위에도 같은 규칙(완성 출력물이 있으면 그 제목 통째 건너뜀)을 두는 것이, 야간 잡을 아무 생각 없이 다시 돌려도 안전한 이유입니다.',
      },
    },
    {
      id: 'l1.d3',
      title: { en: 'Why a pace gate throttles releases', ko: '왜 페이스 게이트가 공개를 조인다' },
      body: {
        en: 'Production capacity and healthy release cadence are unrelated numbers. A backlog that took a week to build can be dumped in an afternoon, which is bad for distribution and bad for the channel. The pace gate makes the last release time — not the size of the inventory — the thing that authorizes the next release, and it refuses by default. Overriding it is possible but must be an explicit, recorded human act, because "just this once" is how a burst happens.',
        ko: '제작 능력과 건강한 공개 주기는 서로 무관한 숫자입니다. 일주일 걸려 쌓은 백로그를 오후 한나절에 쏟아부을 수 있는데, 그건 배포에도 채널에도 나쁩니다. 페이스 게이트는 재고 규모가 아니라 마지막 공개 시각이 다음 공개를 승인하게 만들고, 기본값은 거부입니다. 무시할 수는 있지만 반드시 명시적·기록되는 사람의 행위여야 합니다 — "이번만"이 폭주가 시작되는 방식이기 때문입니다.',
      },
    },
    {
      id: 'l1.d4',
      title: { en: 'Why illustrations live in their own drip queue', ko: '왜 삽화는 별도 드립 큐에 사는가' },
      body: {
        en: 'Image generation is minutes per image and hundreds of images per work, and it competes for the same machine as speech synthesis. Putting it on the critical path would make every episode hostage to a renderer being awake. Instead the planner fixes the total up front, a per-image state machine tracks each slot, and a low-rate worker drains it inside a permitted window; assembly just consumes whatever pool exists and falls back to on-demand only when it must.',
        ko: '이미지 생성은 장당 분 단위인데 작품당 수백 장이고, 음성 합성과 같은 기계를 두고 경합합니다. 이것을 임계 경로에 두면 모든 편이 렌더러의 기상 여부에 인질로 잡힙니다. 대신 플래너가 총량을 미리 확정하고, 이미지 단위 상태기계가 슬롯마다 상태를 추적하고, 저속 워커가 허용된 시간창 안에서 이를 소진합니다. 조립은 존재하는 풀을 소비할 뿐이며, 어쩔 수 없을 때만 온디맨드로 폴백합니다.',
      },
    },
    {
      id: 'l1.d5',
      title: { en: 'Why a quota notice must not be retried', ko: '왜 한도 안내문은 재시도하면 안 되나' },
      body: {
        en: 'The worst failure the pipeline ever had was not a crash. A capacity limit came back as an ordinary successful response containing an apology sentence, the gateway reported success, and a one-line apology became the script for several parts before anyone noticed. Two rules came out of it: detect that class of response explicitly and abort the whole job immediately rather than retrying, and make the generator fail when its output falls under a length floor instead of returning something short. Retrying costs the entire downstream synthesis and assembly for an outcome that cannot improve.',
        ko: '이 파이프라인 최악의 실패는 크래시가 아니었습니다. 한도 도달이 사과 문장 하나를 담은 평범한 성공 응답으로 돌아왔고, 게이트웨이는 성공으로 보고했고, 한 줄짜리 사과문이 여러 부의 대본이 된 뒤에야 발각됐습니다. 여기서 두 규칙이 나왔습니다 — 그 부류의 응답을 명시적으로 탐지해 재시도 없이 잡 전체를 즉시 중단할 것, 그리고 생성기가 길이 하한 미달 시 짧은 결과를 반환하지 말고 실패할 것. 재시도는 나아질 수 없는 결과를 위해 이후 합성·조립 비용 전부를 치르는 일입니다.',
      },
    },
  ],

  quiz: [
    {
      q: {
        en: 'Why is the long-form script generated part by part instead of in one call?',
        ko: '롱폼 대본은 왜 한 번의 호출이 아니라 부 단위로 생성됩니까?',
      },
      choices: [
        { en: 'Because the model cannot produce long text', ko: '모델이 긴 텍스트를 못 만들어서' },
        { en: 'Because each part is cached and individually retryable, so one failure costs one part', ko: '각 부가 캐시되고 개별 재시도 가능해, 한 번의 실패가 한 부만 잃게 하려고' },
        { en: 'Because chapters must be uploaded separately', ko: '챕터를 따로 업로드해야 해서' },
        { en: 'Because each part uses a different voice', ko: '부마다 다른 목소리를 써서' },
      ],
      answer: 1,
    },
    {
      q: {
        en: 'The model returns an apparently successful response that is actually a capacity notice. What is the correct handling?',
        ko: '모델이 사실은 한도 안내문인 성공 응답을 돌려줬습니다. 올바른 처리는 무엇입니까?',
      },
      choices: [
        { en: 'Retry with a backoff until it succeeds', ko: '성공할 때까지 백오프하며 재시도한다' },
        { en: 'Detect it and abort the job immediately, without retrying', ko: '탐지해서 재시도 없이 잡을 즉시 중단한다' },
        { en: 'Use it as the script and fix it later', ko: '일단 대본으로 쓰고 나중에 고친다' },
        { en: 'Switch to the fallback voice', ko: '폴백 음성으로 전환한다' },
      ],
      answer: 1,
    },
    {
      q: {
        en: 'What authorizes the next release on a track?',
        ko: '한 트랙의 다음 공개를 승인하는 것은 무엇입니까?',
      },
      choices: [
        { en: 'The size of the finished inventory', ko: '완성 재고의 규모' },
        { en: 'The number of items produced tonight', ko: '오늘 밤 제작된 편수' },
        { en: 'The time elapsed since that track\'s last release', ko: '그 트랙의 마지막 공개 이후 경과 시간' },
        { en: 'Whether the illustration pool is full', ko: '삽화 풀이 가득 찼는지 여부' },
      ],
      answer: 2,
    },
  ],
};

export default l1;
