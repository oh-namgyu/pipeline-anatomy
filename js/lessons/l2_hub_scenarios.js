/**
 * L2 scenarios, transcribed from docs/CONTENT-SPEC.md §3.4.
 * Split out of the lesson module so both files stay small.
 */

export const l2Scenarios = [
  {
    id: 'l2.s1',
    trigger: { source: 'archive-feed', gate: 'pass' },
    steps: [
      { node: 'l2.registry', edge: 'l2.trigger->l2.registry', badge: 'one row', explain: {
        en: 'The run reads the channel registry. Adding a channel means one registry row plus one domain-colour entry — not a new pipeline.',
        ko: '실행이 채널 레지스트리를 읽습니다. 채널 추가는 레지스트리 한 줄 + 도메인 색 한 항목이지 새 파이프라인이 아닙니다.',
      } },
      { node: 'l2.adapter', edge: 'l2.registry->l2.adapter', badge: 'harvest', explain: {
        en: 'This channel\'s adapter harvests a public archive and normalizes it into the same candidate schema every other channel uses. The adapter is the only channel-specific code on the input side.',
        ko: '이 채널의 어댑터는 공개 아카이브를 수확해 다른 모든 채널과 동일한 후보 스키마로 정규화합니다. 입력 쪽에서 채널 고유 코드는 어댑터뿐입니다.',
      } },
      { node: 'l2.score', edge: 'l2.candidates->l2.score', badge: 'prefilter', explain: {
        en: 'Scoring runs in two stages: a cheap deterministic prefilter over the whole corpus, then model scoring on the shortlist only. The prefilter also hard-excludes whole categories of material at the entrance.',
        ko: '채점은 2단계입니다 — 전체 코퍼스에 값싼 결정적 프리필터를 돌린 뒤, 숏리스트에만 모델 채점을 합니다. 프리필터는 특정 부류의 소재를 입구에서 통째로 하드 제외하기도 합니다.',
      } },
      { node: 'l2.overproduce', edge: 'l2.score->l2.overproduce', badge: 'overproduce', explain: {
        en: 'One candidate becomes several script variants with deliberately different angles. Generating text is cheap, so the pipeline is generous here and strict later.',
        ko: '후보 하나가 각도를 일부러 달리한 여러 개의 대본 변주가 됩니다. 텍스트 생성은 싸므로 여기서는 헤프고 뒤에서 짜게 굽니다.',
      } },
      { node: 'l2.gate', edge: 'l2.overproduce->l2.gate', badge: 'pass', explain: {
        en: 'The gate scores each variant on hook strength and factual accuracy, and applies the risk rule. Passing needs both thresholds AND a clean risk verdict. One variant is selected; other passing variants are kept as backups.',
        ko: '게이트가 각 변주를 후킹력과 사실 정확성으로 채점하고 리스크 규칙을 적용합니다. 통과하려면 두 임계값 모두와 리스크 클린 판정이 필요합니다. 하나가 채택되고, 통과했지만 미채택된 변주는 백업으로 남습니다.',
      } },
      { node: 'l2.visual', edge: 'l2.gate->l2.visual', explain: {
        en: 'The approved script gets scene-by-scene image prompts plus a consistency seed, so characters and tone stay stable across cuts. Those fields were designed into the approved-script schema from the start.',
        ko: '승인된 대본에 장면별 이미지 프롬프트와 일관성 시드가 붙어, 컷 사이에서 인물과 톤이 유지됩니다. 이 필드들은 처음부터 승인 대본 스키마에 설계돼 있었습니다.',
      } },
      { node: 'l2.render', edge: 'l2.visual->l2.render', explain: {
        en: 'Images, synthesized speech, captions and effects are muxed into one vertical clip.',
        ko: '이미지·합성 음성·자막·효과가 하나의 세로 클립으로 먹싱됩니다.',
      } },
      { node: 'l2.slot', edge: 'l2.route->l2.slot', badge: 'scheduled', explain: {
        en: 'The clip is uploaded immediately but set to become public at a later slot, spaced from its siblings. Releasing at production time meant releasing in the dead of night.',
        ko: '클립은 즉시 업로드되지만 나중 슬롯에 공개되도록 설정되고, 형제 편들과 간격을 둡니다. 제작 시점에 공개한다는 것은 한밤중에 공개한다는 뜻이었습니다.',
      } },
    ],
  },
  {
    id: 'l2.s2',
    trigger: { source: 'archive-feed', gate: 'risk-block' },
    steps: [
      { node: 'l2.adapter', edge: 'l2.registry->l2.adapter', badge: 'harvest', explain: {
        en: 'The archive adapter produces candidates as usual.',
        ko: '아카이브 어댑터가 평소대로 후보를 만듭니다.',
      } },
      { node: 'l2.overproduce', edge: 'l2.score->l2.overproduce', badge: 'overproduce', explain: {
        en: 'Several variants are generated for the chosen candidate.',
        ko: '선택된 후보에 대해 여러 변주가 생성됩니다.',
      } },
      { node: 'l2.gate', edge: 'l2.overproduce->l2.gate', explain: {
        en: 'One variant scores well on hook strength — and asserts something the source does not support.',
        ko: '한 변주가 후킹력 점수는 잘 받았는데, 원문이 뒷받침하지 않는 내용을 단정합니다.',
      } },
      { node: 'l2.blocked', edge: 'l2.gate->l2.blocked', badge: 'blocked', explain: {
        en: 'The risk axis is a rule, not a score: a variant that trips it is discarded no matter how well it scored elsewhere. Defamation, misidentification and distorted outcomes are the failure that ends a channel, not the one that lowers an average.',
        ko: '리스크 축은 점수가 아니라 규칙입니다 — 여기 걸린 변주는 다른 점수가 아무리 높아도 폐기됩니다. 명예훼손·신원 특정·결말 왜곡은 평균을 낮추는 실패가 아니라 채널을 끝내는 실패입니다.',
      } },
      { node: 'l2.rejectlog', badge: 'logged', explain: {
        en: 'The rejection is logged with its reason, so the failure feeds back into what gets sourced next. Variants that passed but were not chosen are deliberately kept out of this log — mixing them in would poison the signal about what does not work.',
        ko: '거부는 사유와 함께 기록돼, 다음에 무엇을 소싱할지에 되먹여집니다. 통과했지만 미채택된 변주는 일부러 이 로그에서 제외합니다 — 섞이면 "안 먹히는 것"에 대한 신호가 오염되기 때문입니다.',
      } },
      { node: 'l2.report', edge: 'l2.blocked->l2.report', badge: 'end', explain: {
        en: 'If every variant fails, the run publishes nothing for that channel and reports it. Zero output is an expected outcome.',
        ko: '모든 변주가 탈락하면 그 채널은 아무것도 발행하지 않고 그 사실을 보고합니다. 산출 0은 예상된 결과입니다.',
      } },
    ],
  },
  {
    id: 'l2.s3',
    trigger: { source: 'curated-seed', gate: 'pass' },
    steps: [
      { node: 'l2.registry', edge: 'l2.trigger->l2.registry', badge: 'one row', explain: {
        en: 'A different channel row, a different colour: its own persona, factual standard, risk emphasis and hashtag set.',
        ko: '다른 채널 행, 다른 색 — 고유의 페르소나·사실 기준·리스크 강조점·해시태그 세트.',
      } },
      { node: 'l2.adapter', edge: 'l2.registry->l2.adapter', badge: 'seed', explain: {
        en: 'This channel has no archive to harvest. Its adapter reads a curated seed file committed next to the code — small, hand-verified, and stable.',
        ko: '이 채널에는 수확할 아카이브가 없습니다. 어댑터는 코드 옆에 커밋된 큐레이션 시드 파일을 읽습니다 — 작고, 손으로 검증됐고, 안정적입니다.',
      } },
      { node: 'l2.candidates', edge: 'l2.adapter->l2.candidates', badge: 'same schema', explain: {
        en: 'Both adapters emit the same candidate schema, which is why every downstream stage is untouched by the difference.',
        ko: '두 어댑터 모두 같은 후보 스키마를 내보냅니다. 그래서 하류의 모든 단계가 이 차이에 손대지 않아도 됩니다.',
      } },
      { node: 'l2.score', edge: 'l2.candidates->l2.score', badge: 'dedup', explain: {
        en: 'With a small vetted seed pool, the expensive scoring stage matters less; deduplication against what has already been made matters more.',
        ko: '검증된 작은 시드 풀에서는 비싼 채점 단계의 비중이 줄고, 이미 만든 것과의 중복 제거가 더 중요해집니다.',
      } },
      { node: 'l2.gate', edge: 'l2.overproduce->l2.gate', badge: 'pass', explain: {
        en: 'The same gate runs, but with this channel\'s thresholds. A channel handling legal material demands a stricter factual score than a general-interest one; the risk axis changes meaning too — misattribution rather than defamation.',
        ko: '같은 게이트가 이 채널의 임계값으로 돌아갑니다. 법률 소재 채널은 교양 채널보다 엄격한 사실 점수를 요구하고, 리스크 축의 의미도 달라집니다 — 명예훼손이 아니라 잘못된 귀속입니다.',
      } },
      { node: 'l2.render', edge: 'l2.visual->l2.render', explain: {
        en: 'Visual direction and rendering are the shared stages again — the channel\'s colour changes the prompts, not the code path.',
        ko: '비주얼 디렉션과 렌더는 다시 공유 단계입니다 — 채널의 색은 프롬프트를 바꾸지 코드 경로를 바꾸지 않습니다.',
      } },
      { node: 'l2.route', edge: 'l2.render->l2.route', badge: 'per channel', explain: {
        en: 'Routing picks that channel\'s own credentials. Credentials live per channel and are never committed.',
        ko: '라우팅이 그 채널 고유 자격증명을 고릅니다. 자격증명은 채널별로 보관되며 절대 커밋되지 않습니다.',
      } },
      { node: 'l2.slot', edge: 'l2.route->l2.slot', badge: 'scheduled', explain: {
        en: 'Same scheduled-release treatment as every other channel.',
        ko: '다른 모든 채널과 동일한 예약 공개 처리를 받습니다.',
      } },
    ],
  },
  {
    id: 'l2.s4',
    trigger: { source: 'curated-seed', gate: 'risk-block' },
    steps: [
      { node: 'l2.adapter', edge: 'l2.registry->l2.adapter', badge: 'seed', explain: {
        en: 'The seed adapter supplies a vetted item.',
        ko: '시드 어댑터가 검증된 항목을 공급합니다.',
      } },
      { node: 'l2.overproduce', edge: 'l2.score->l2.overproduce', badge: 'overproduce', explain: {
        en: 'Variants are generated with this channel\'s persona.',
        ko: '이 채널의 페르소나로 변주가 생성됩니다.',
      } },
      { node: 'l2.gate', edge: 'l2.overproduce->l2.gate', explain: {
        en: 'A variant attributes the material to the wrong person. For this channel that is exactly the domain risk the colour defines — the same axis that means defamation elsewhere.',
        ko: '한 변주가 소재를 엉뚱한 인물에게 귀속시킵니다. 이 채널에서 그것이 바로 색이 정의한 도메인 리스크입니다 — 다른 채널에서는 명예훼손을 뜻하는 그 축입니다.',
      } },
      { node: 'l2.blocked', edge: 'l2.gate->l2.blocked', badge: 'blocked', explain: {
        en: 'Blocked. Because the risk rule is defined per domain rather than globally, one shared gate can enforce four different definitions of "unacceptable".',
        ko: '차단됩니다. 리스크 규칙이 전역이 아니라 도메인별로 정의돼 있으므로, 공유 게이트 하나가 네 가지 서로 다른 "허용 불가" 정의를 강제할 수 있습니다.',
      } },
      { node: 'l2.rejectlog', badge: 'logged', explain: {
        en: 'Logged with the reason.',
        ko: '사유와 함께 기록됩니다.',
      } },
      { node: 'l2.report', edge: 'l2.rejectlog->l2.report', badge: 'end', explain: {
        en: 'The run reports zero output for this channel and continues with the others — one channel failing does not stop the factory.',
        ko: '실행은 이 채널의 산출 0을 보고하고 다른 채널을 계속 진행합니다 — 한 채널의 실패가 공장을 멈추지 않습니다.',
      } },
    ],
  },
];

export default l2Scenarios;
