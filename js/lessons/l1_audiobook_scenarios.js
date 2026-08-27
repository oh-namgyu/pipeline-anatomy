/**
 * L1 scenarios, transcribed from docs/CONTENT-SPEC.md §2.4.
 * Split out of the lesson module so both files stay small.
 */

export const l1Scenarios = [
  {
    id: 'l1.s1',
    trigger: { format: 'long', render: 'ok' },
    steps: [
      { node: 'l1.inventory', edge: 'l1.nightly->l1.inventory', explain: {
        en: 'The nightly run claims the next planned title from the inventory queue. The queue is a registry, not a to-do list in someone\'s head: a title is planned, then produced, then released, and each transition is recorded.',
        ko: '야간 실행이 재고 큐에서 다음 예정 제목을 클레임합니다. 이 큐는 누군가의 머릿속 할 일 목록이 아니라 레지스트리입니다 — 제목은 예정→제작→공개로 이동하고 각 전이가 기록됩니다.',
      } },
      { node: 'l1.outline', edge: 'l1.inventory->l1.outline', badge: 'structure first', explain: {
        en: 'Before a single sentence of prose exists, the model produces an outline: N parts, each with a subtitle and a core beat. The outline is cached, so re-running never re-decides the structure.',
        ko: '산문이 한 문장도 쓰이기 전에 모델이 아웃라인을 만듭니다 — N개의 부, 각각 소제목과 핵심 비트. 아웃라인은 캐시되므로 재실행이 구조를 다시 정하는 일은 없습니다.',
      } },
      { node: 'l1.script', edge: 'l1.outline->l1.script', explain: {
        en: 'Each part is written as its own model call, in a fixed narration voice, and each part is told how it connects to the one before it. Writing part-by-part keeps any single failure to one part.',
        ko: '각 부는 고정된 내레이션 톤으로 개별 모델 호출로 집필되고, 각 부는 앞 부와 어떻게 이어지는지를 지시받습니다. 부 단위 집필 덕분에 한 번의 실패가 한 부에만 머뭅니다.',
      } },
      { node: 'l1.cache', edge: 'l1.script->l1.cache', badge: 'resumable', explain: {
        en: 'Script and audio are written per part. A run that dies at part twelve resumes at part twelve; parts one to eleven are never re-generated.',
        ko: '대본과 음성은 부별로 기록됩니다. 12부에서 죽은 실행은 12부에서 재개하고, 1~11부는 다시 생성되지 않습니다.',
      } },
      { node: 'l1.assemble', edge: 'l1.cache->l1.assemble', explain: {
        en: 'Segments are concatenated into one track, chapter marks are computed from the part boundaries, and an intro is attached — which shifts every chapter mark by the intro\'s length.',
        ko: '세그먼트가 하나의 트랙으로 이어지고, 부 경계에서 챕터 지점이 계산되고, 인트로가 붙습니다 — 그리고 인트로 길이만큼 모든 챕터 지점이 시프트됩니다.',
      } },
      { node: 'l1.pace', edge: 'l1.assemble->l1.pace', badge: 'pace ok', explain: {
        en: 'The pace gate asks one question: has enough time passed since this track\'s last release? Enough has, so the episode is released.',
        ko: '페이스 게이트는 한 가지만 묻습니다 — 이 트랙의 마지막 공개 이후 충분한 시간이 지났는가? 지났으므로 편이 공개됩니다.',
      } },
      { node: 'l1.done', edge: 'l1.publish->l1.done', badge: 'end', explain: {
        en: 'The item\'s queue state moves to released and the run reports.',
        ko: '항목의 큐 상태가 공개 완료로 이동하고 실행이 결과를 보고합니다.',
      } },
    ],
  },
  {
    id: 'l1.s2',
    trigger: { format: 'long', render: 'fail' },
    steps: [
      { node: 'l1.inventory', edge: 'l1.nightly->l1.inventory', explain: {
        en: 'The nightly run claims the next title.',
        ko: '야간 실행이 다음 제목을 클레임합니다.',
      } },
      { node: 'l1.script', edge: 'l1.outline->l1.script', badge: 'fail', explain: {
        en: 'Part twelve\'s model call fails. In an unattended run there is nobody to notice, so the behaviour on failure is the whole design.',
        ko: '12부의 모델 호출이 실패합니다. 무인 실행에는 알아챌 사람이 없으므로, 실패 시의 동작이 설계 전부입니다.',
      } },
      { node: 'l1.retry', edge: 'l1.script->l1.retry', badge: 'fail fast', explain: {
        en: 'The pipeline distinguishes two kinds of failure. A transient one — a lock collision, a timeout — is left to the next run. A capacity notice returned as an apparently successful response is not retried, because retrying cannot fix it and the remaining stages would be paid for nothing.',
        ko: '파이프라인은 두 종류의 실패를 구분합니다. 락 충돌·타임아웃 같은 일시적 실패는 다음 실행에 맡깁니다. 성공 응답처럼 돌아온 한도 안내문은 재시도하지 않습니다 — 재시도로 풀리지 않을뿐더러 남은 단계 비용만 날리기 때문입니다.',
      } },
      { node: 'l1.cache', badge: 'kept', explain: {
        en: 'Parts one to eleven stay on disk. Nothing is cleaned up.',
        ko: '1~11부는 디스크에 그대로 남습니다. 아무것도 정리하지 않습니다.',
      } },
      { node: 'l1.inventory', edge: 'l1.retry->l1.inventory', badge: 'requeued', explain: {
        en: 'The item stays in the queue in its produced-partially state, and the next scheduled run picks it up and continues from part twelve. Overnight self-recovery is the normal repair path.',
        ko: '항목은 부분 제작 상태로 큐에 남고, 다음 예약 실행이 이를 집어 12부부터 이어갑니다. 하룻밤 자가복구가 정상 복구 경로입니다.',
      } },
      { node: 'l1.done', badge: 'end', explain: {
        en: 'Tonight\'s run publishes nothing and says so in its report.',
        ko: '오늘 밤 실행은 아무것도 발행하지 않고, 리포트에 그렇게 적습니다.',
      } },
    ],
  },
  {
    id: 'l1.s3',
    trigger: { format: 'short', render: 'ok' },
    steps: [
      { node: 'l1.inventory', edge: 'l1.nightly->l1.inventory', badge: 'derived', explain: {
        en: 'The short-form track does not claim a title. It claims a released long-form episode — shorts exist to funnel viewers to the long form.',
        ko: '쇼츠 트랙은 제목을 클레임하지 않습니다. 이미 공개된 롱폼 편을 클레임합니다 — 쇼츠는 롱폼으로 유입시키기 위해 존재하기 때문입니다.',
      } },
      { node: 'l1.pace', badge: 'parent public?', explain: {
        en: 'Because the short\'s description links back to the long form, the track first checks that the parent episode is actually public. A produced-but-unreleased parent is held, not linked.',
        ko: '쇼츠 설명이 롱폼을 역링크하므로, 트랙은 부모 편이 실제로 공개 상태인지부터 확인합니다. 제작됐지만 미공개인 부모는 링크하지 않고 보류합니다.',
      } },
      { node: 'l1.script', explain: {
        en: 'A short hook is written from the parent episode\'s material — a teaser, not a summary.',
        ko: '부모 편의 소재로 짧은 훅을 씁니다 — 요약이 아니라 티저입니다.',
      } },
      { node: 'l1.assemble', badge: 'vertical', explain: {
        en: 'The vertical clip is assembled under the platform\'s short-form length limit; exceeding it silently reclassifies the upload.',
        ko: '세로 클립이 플랫폼의 쇼츠 길이 상한 안에서 조립됩니다. 넘기면 업로드가 조용히 다른 형식으로 분류돼 버립니다.',
      } },
      { node: 'l1.done', badge: 'end', explain: {
        en: 'Several shorts per day drip out on their own cadence, separately capped from the other tracks.',
        ko: '쇼츠는 하루 여러 편이 자체 주기로 드립되며, 다른 트랙과 별도로 상한이 걸립니다.',
      } },
    ],
  },
  {
    id: 'l1.s4',
    trigger: { format: 'short', render: 'fail' },
    steps: [
      { node: 'l1.inventory', edge: 'l1.nightly->l1.inventory', badge: 'derived', explain: {
        en: 'The short-form run looks for a parent long-form episode to promote.',
        ko: '쇼츠 실행이 홍보할 부모 롱폼 편을 찾습니다.',
      } },
      { node: 'l1.pace', badge: 'stale record', explain: {
        en: 'The parent was uploaded but is still unlisted, waiting for its release slot. Judging "is it published?" from the local production record alone would say yes.',
        ko: '부모 편은 업로드됐지만 아직 비공개로 공개 슬롯을 기다리고 있습니다. 로컬 제작 기록만으로 "발행됐나?"를 판정하면 예라고 나옵니다.',
      } },
      { node: 'l1.retry', badge: 'guarded', explain: {
        en: 'So the check queries the platform for the actual visibility instead of trusting the local record. Trusting it once produced live shorts pointing at a link nobody could open.',
        ko: '그래서 로컬 기록을 믿는 대신 플랫폼에 실제 공개 상태를 질의합니다. 그것을 믿었다가, 아무도 열 수 없는 링크를 가리키는 쇼츠가 실제로 나간 적이 있습니다.',
      } },
      { node: 'l1.hold', edge: 'l1.pace->l1.hold', badge: 'held', explain: {
        en: 'The short is held with the reason and the count printed, and it goes out on the next run once the parent is genuinely public.',
        ko: '쇼츠는 사유와 건수가 출력된 채 보류되고, 부모가 진짜 공개된 다음 실행에 나갑니다.',
      } },
      { node: 'l1.done', badge: 'end', explain: {
        en: 'Nothing is published tonight for this track, and the report says why.',
        ko: '이 트랙은 오늘 밤 아무것도 발행하지 않고, 리포트가 그 이유를 적습니다.',
      } },
    ],
  },
  {
    id: 'l1.s5',
    trigger: { format: 'mid', render: 'ok' },
    steps: [
      { node: 'l1.inventory', edge: 'l1.nightly->l1.inventory', badge: 'derived', explain: {
        en: 'The mid-length track claims a highlight from an already-produced work rather than a whole title.',
        ko: '중폼 트랙은 제목 전체가 아니라 이미 제작된 작품의 하이라이트 하나를 클레임합니다.',
      } },
      { node: 'l1.assets', badge: 'pre-rendered', explain: {
        en: 'Its illustrations come from a pre-rendered pool. A planner had earlier converted the work\'s chapter list into a fixed number of illustration slots, and each slot is a row in a per-image state machine.',
        ko: '삽화는 사전 렌더된 풀에서 옵니다. 앞서 플래너가 작품의 챕터 목록을 정해진 수의 삽화 슬롯으로 환산해 두었고, 각 슬롯은 이미지 단위 상태기계의 한 행입니다.',
      } },
      { node: 'l1.script', badge: 'pool first', explain: {
        en: 'The dialogue script is written for the highlight, and the illustration pool is consumed in order. On-demand generation is the fallback for when the pool is empty, not the default.',
        ko: '하이라이트용 대화 대본이 집필되고, 삽화 풀이 순서대로 소비됩니다. 온디맨드 생성은 풀이 비었을 때의 폴백이지 기본값이 아닙니다.',
      } },
      { node: 'l1.assemble', edge: 'l1.assets->l1.assemble', explain: {
        en: 'Images, speech and captions are muxed into the vertical clip, and a timeline file records which illustration appears at which timestamp.',
        ko: '이미지·음성·자막이 세로 클립으로 먹싱되고, 어떤 삽화가 언제 나오는지 타임라인 파일에 기록됩니다.',
      } },
      { node: 'l1.pace', edge: 'l1.assemble->l1.pace', badge: 'own slot', explain: {
        en: 'The mid-length track releases on its own daily slot, deliberately separated in time from the other two tracks.',
        ko: '중폼 트랙은 자체 일일 슬롯으로 공개되며, 다른 두 트랙과 시간대가 의도적으로 분리돼 있습니다.',
      } },
      { node: 'l1.done', edge: 'l1.publish->l1.done', badge: 'end', explain: {
        en: 'The episode is released and the inventory count for that work drops by one.',
        ko: '편이 공개되고 그 작품의 재고 수가 하나 줄어듭니다.',
      } },
    ],
  },
  {
    id: 'l1.s6',
    trigger: { format: 'mid', render: 'fail' },
    steps: [
      { node: 'l1.assets', badge: 'claimed', explain: {
        en: 'An illustration slot is claimed from the drip queue and moves from pending to generating, under a file lock so two workers cannot claim the same slot.',
        ko: '드립 큐에서 삽화 슬롯 하나가 클레임돼 대기에서 생성중으로 이동합니다 — 파일 락 아래에서 이뤄지므로 두 워커가 같은 슬롯을 잡을 수 없습니다.',
      } },
      { node: 'l1.retry', badge: 'retry k', explain: {
        en: 'The image renderer is not running, so the slot fails. Failure moves the row to failed with its attempt count incremented, and a bounded number of attempts is allowed before the row is blocked for good.',
        ko: '이미지 렌더러가 떠 있지 않아 슬롯이 실패합니다. 실패는 행을 시도 횟수를 올린 채 실패 상태로 옮기고, 정해진 횟수를 넘기면 행은 영구 차단 상태가 됩니다.',
      } },
      { node: 'l1.assets', badge: 'reaped', explain: {
        en: 'A reaper sweeps rows that have been stuck in generating past a time limit and returns them to the queue, so a worker that died mid-render does not strand its slot forever.',
        ko: '리퍼가 제한 시간을 넘겨 생성중에 멈춘 행을 회수해 큐로 되돌립니다. 그래서 렌더 도중 죽은 워커가 슬롯을 영원히 붙잡지 못합니다.',
      } },
      { node: 'l1.assets', badge: 'guarded skip', explain: {
        en: 'The drip worker also refuses to run at all outside its window, or when a stop-switch file exists, or when the renderer\'s health check fails — it skips loudly rather than failing every slot.',
        ko: '드립 워커는 자기 시간창 밖이거나, 정지 스위치 파일이 있거나, 렌더러 헬스체크가 실패하면 아예 돌지 않습니다 — 슬롯을 전부 실패시키는 대신 명시적으로 건너뜁니다.',
      } },
      { node: 'l1.done', badge: 'end', explain: {
        en: 'The mid-length assembly waits: it consumes the pool, and the pool refills on its own schedule. The publishing track is never blocked on an image renderer being awake.',
        ko: '중폼 조립은 기다립니다 — 조립은 풀을 소비하고, 풀은 자기 일정으로 다시 채워집니다. 발행 트랙이 이미지 렌더러의 기상 여부에 묶이는 일은 없습니다.',
      } },
    ],
  },
];

export default l1Scenarios;
