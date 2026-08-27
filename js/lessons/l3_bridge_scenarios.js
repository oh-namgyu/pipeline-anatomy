/**
 * L3 scenarios, transcribed from docs/CONTENT-SPEC.md §4.4.
 * Split out of the lesson module so both files stay small.
 */

export const l3Scenarios = [
  {
    id: 'l3.s1',
    trigger: { cast: 'reuse', review: 'approved' },
    steps: [
      { node: 'l3.gate', edge: 'l3.storyline->l3.gate', badge: 'pass', explain: {
        en: 'The adaptation is drafted as beats and scored by a gate before it enters the console. The gate has typed criteria: a twist-shaped story and a quiet, chronological one are judged on different axes, so a gentle episode is not rejected merely for lacking a reversal.',
        ko: '각색이 비트로 초안화되고, 콘솔에 들어가기 전에 게이트가 채점합니다. 게이트에는 유형별 기준이 있습니다 — 반전형과 잔잔한 시간순형은 서로 다른 축으로 판정되므로, 잔잔한 편이 반전이 없다는 이유만으로 탈락하지 않습니다.',
      } },
      { node: 'l3.import', edge: 'l3.gate->l3.import', badge: '0 model calls', explain: {
        en: 'Import is deterministic: beats become events, moods map to a fixed emotion set, hierarchy is filled in, and image prompts are backfilled — with zero model calls. Nothing about the story changes as it crosses the bridge.',
        ko: 'import 는 결정적입니다 — 비트가 사건이 되고, 무드가 고정된 감정 집합으로 매핑되고, 계층이 채워지고, 이미지 프롬프트가 백필됩니다. 모델 호출은 0회입니다. 다리를 건너는 동안 이야기가 달라지는 일은 없습니다.',
      } },
      { node: 'l3.match', edge: 'l3.library->l3.match', badge: 'scoped', explain: {
        en: 'Casting queries the library with the episode\'s scope. Matching is deterministic and scoped: performers registered for one setting are not offered for another, which is what keeps two unrelated works from sharing a face.',
        ko: '캐스팅이 편의 스코프로 도감을 조회합니다. 매칭은 결정적이며 스코프가 걸려 있어, 한 배경에 등록된 배우가 다른 배경에 제안되지 않습니다 — 무관한 두 작품이 얼굴을 공유하지 않게 하는 장치입니다.',
      } },
      { node: 'l3.library', badge: 'reuse', explain: {
        en: 'Every performer this episode needs already exists with an approved portrait, so it creates nothing new. Reuse is the point of the library: the same character looks the same in every episode they appear in.',
        ko: '이 편에 필요한 배우가 승인된 초상과 함께 이미 전부 존재하므로 새로 만드는 것이 없습니다. 재사용이 도감의 목적입니다 — 같은 인물은 등장하는 모든 편에서 같은 모습입니다.',
      } },
      { node: 'l3.push', edge: 'l3.match->l3.push', badge: 'merge', explain: {
        en: 'The agreed voice settings and portraits are pushed into the renderer\'s registry as a merge: other works\' entries are preserved, and a dry-run mode exists so the merge can be inspected first.',
        ko: '합의된 보이스 설정과 초상이 병합 방식으로 렌더러 레지스트리에 푸시됩니다 — 타 작품 항목은 보존되고, 병합을 미리 확인할 수 있는 dry-run 모드가 있습니다.',
      } },
      { node: 'l3.render', edge: 'l3.push->l3.render', badge: '0 generated', explain: {
        en: 'The renderer finds every character already supplied, so it generates no new character art at all. That "zero generated" number is the acceptance test for the whole library feature.',
        ko: '렌더러는 모든 인물이 이미 공급된 것을 확인하고 새 인물 아트를 한 장도 만들지 않습니다. 그 "생성 0" 수치가 도감 기능 전체의 인수 기준입니다.',
      } },
      { node: 'l3.review', edge: 'l3.render->l3.review', explain: {
        en: 'Review finds nothing to flag. The episode\'s queue state moves to rendered.',
        ko: '재검토에서 플래그할 것이 없습니다. 편의 큐 상태가 렌더 완료로 이동합니다.',
      } },
      { node: 'l3.publish', edge: 'l3.review->l3.publish', badge: 'end', explain: {
        en: 'Release is a deliberate human step in this pipeline, not an automated one.',
        ko: '이 파이프라인에서 공개는 자동이 아니라 의도된 사람의 단계입니다.',
      } },
    ],
  },
  {
    id: 'l3.s2',
    trigger: { cast: 'new', review: 'approved' },
    steps: [
      { node: 'l3.import', edge: 'l3.gate->l3.import', badge: '0 model calls', explain: {
        en: 'The episode is imported deterministically, as always.',
        ko: '편이 늘 그렇듯 결정적으로 import 됩니다.',
      } },
      { node: 'l3.match', edge: 'l3.library->l3.match', badge: 'no match', explain: {
        en: 'This episode is set in a period the library has never covered, so the scoped matcher correctly refuses to reuse anyone. The filter working against reuse is evidence that it works.',
        ko: '이 편의 시대를 도감이 다뤄 본 적이 없어, 스코프 매처가 정확히 재사용을 거부합니다. 필터가 재사용을 막는 쪽으로 작동한 것이 필터가 제대로 동작한다는 증거입니다.',
      } },
      { node: 'l3.draft', edge: 'l3.match->l3.draft', badge: 'draft', explain: {
        en: 'New entries do not appear ready-made. A proposal engine creates them as drafts, and a person approves, replaces, edits, or asks for a revision. Manual creation forms were removed entirely — everything enters through the draft flow.',
        ko: '새 항목은 완성된 채로 나타나지 않습니다. 제안 엔진이 이를 초안으로 만들고, 사람이 승인·교체·수정·보완요청을 합니다. 수동 등록 폼은 전부 폐기됐고, 모든 것이 초안 플로우로 들어옵니다.',
      } },
      { node: 'l3.generate', edge: 'l3.draft->l3.generate', badge: 'leased', explain: {
        en: 'Approval moves the row into generation. Every transition is a compare-and-set, the row is leased while a worker holds it, and a uniqueness constraint on the entry\'s identity makes re-running the backfill idempotent.',
        ko: '승인이 행을 생성 상태로 옮깁니다. 모든 전이는 compare-and-set 이고, 워커가 잡고 있는 동안 행은 리스로 묶이며, 항목 정체성에 걸린 유일성 제약이 백필 재실행을 멱등하게 만듭니다.',
      } },
      { node: 'l3.library', badge: 'ready filter', explain: {
        en: 'The finished asset becomes ready and takes its slot. Only ready entries are visible to the renderer, so a half-generated asset can never be picked up as a render candidate.',
        ko: '완성된 자산이 ready 가 되어 슬롯을 차지합니다. 렌더러에는 ready 항목만 보이므로, 반쯤 생성된 자산이 렌더 후보로 집히는 일은 없습니다.',
      } },
      { node: 'l3.push', edge: 'l3.generate->l3.push', badge: 'merge', explain: {
        en: 'The new performers are pushed to the renderer alongside the reused ones.',
        ko: '신규 배우가 재사용분과 함께 렌더러로 푸시됩니다.',
      } },
      { node: 'l3.render', edge: 'l3.push->l3.render', explain: {
        en: 'The episode renders, and the new entries are now in the pool for every later episode in that setting. The cost of creating them is paid once.',
        ko: '편이 렌더되고, 신규 항목은 이제 그 배경의 이후 모든 편을 위한 풀에 들어갑니다. 생성 비용은 한 번만 지불됩니다.',
      } },
      { node: 'l3.publish', edge: 'l3.review->l3.publish', badge: 'end', explain: {
        en: 'Published by hand after review.',
        ko: '검수 후 사람이 발행합니다.',
      } },
    ],
  },
  {
    id: 'l3.s3',
    trigger: { cast: 'reuse', review: 'flagged' },
    steps: [
      { node: 'l3.push', edge: 'l3.match->l3.push', badge: 'reuse', explain: {
        en: 'Cast is reused from the library and pushed to the renderer.',
        ko: '도감에서 캐스팅을 재사용해 렌더러로 푸시합니다.',
      } },
      { node: 'l3.render', edge: 'l3.push->l3.render', explain: {
        en: 'The episode renders end to end.',
        ko: '편이 끝까지 렌더됩니다.',
      } },
      { node: 'l3.review', edge: 'l3.render->l3.review', badge: 'flagged', explain: {
        en: 'Reviewing the storyboard, one beat is wrong: the illustration frames a detail when the scene needs a wide shot. The reviewer ticks that beat and writes a one-line note.',
        ko: '스토리보드를 검토하다 비트 하나가 잘못됐음을 발견합니다 — 장면은 와이드샷이 필요한데 삽화가 디테일을 잡았습니다. 검토자가 그 비트에 체크하고 한 줄 메모를 남깁니다.',
      } },
      { node: 'l3.rerender', edge: 'l3.review->l3.rerender', badge: 'one beat', explain: {
        en: 'The re-render tool maps the flagged storyboard index to the source beat, guards the mapping by checking beat counts and speaker agreement, backs up the existing image, regenerates only that one, and writes the revised prompt back to the source.',
        ko: '재렌더 도구가 플래그된 스토리보드 인덱스를 원본 비트로 매핑하고, 비트 수·화자 정합으로 매핑을 가드하고, 기존 이미지를 백업하고, 그 한 장만 다시 생성한 뒤 수정된 프롬프트를 원본에 역반영합니다.',
      } },
      { node: 'l3.review', edge: 'l3.rerender->l3.review', badge: 'cleared', explain: {
        en: 'On success the flag clears itself, so the work list is derived from state rather than maintained by hand.',
        ko: '성공하면 플래그가 스스로 해제되므로, 작업 목록이 손으로 관리되지 않고 상태에서 파생됩니다.',
      } },
      { node: 'l3.render', explain: {
        en: 'Only the affected part of the episode is re-assembled. Re-rendering the whole episode for one bad frame would cost the entire illustration and music budget again.',
        ko: '편에서 영향받은 부분만 다시 조립됩니다. 한 장의 잘못된 프레임 때문에 편 전체를 다시 렌더하면 삽화·음악 비용을 통째로 다시 치르게 됩니다.',
      } },
      { node: 'l3.publish', edge: 'l3.review->l3.publish', badge: 'end', explain: {
        en: 'Reviewed again, then published by hand.',
        ko: '다시 검수한 뒤 사람이 발행합니다.',
      } },
    ],
  },
  {
    id: 'l3.s4',
    trigger: { cast: 'new', review: 'flagged' },
    steps: [
      { node: 'l3.draft', edge: 'l3.match->l3.draft', badge: 'draft', explain: {
        en: 'The episode needs new performers, so drafts are proposed and approved.',
        ko: '편에 신규 배우가 필요해 초안이 제안되고 승인됩니다.',
      } },
      { node: 'l3.generate', edge: 'l3.draft->l3.generate', badge: 'fail', explain: {
        en: 'Generation starts, but the external image service is out of capacity for the period. Several rows end in failed.',
        ko: '생성이 시작되지만 외부 이미지 서비스의 해당 기간 용량이 소진돼 있습니다. 여러 행이 실패로 끝납니다.',
      } },
      { node: 'l3.failed', edge: 'l3.generate->l3.failed', badge: 'quarantined', explain: {
        en: 'Failed rows are not deleted and not silently retried. They stay visible with their state, and the console can query capacity through a status endpoint that costs nothing — probing by attempting a real generation is forbidden, because the probe itself consumes the quota.',
        ko: '실패한 행은 삭제되지도, 조용히 재시도되지도 않습니다. 상태를 단 채로 남고, 콘솔은 비용 0인 상태 엔드포인트로 용량을 조회할 수 있습니다 — 실제 생성을 시도해 보는 프로빙은 금지입니다. 프로브 자체가 쿼터를 소모하기 때문입니다.',
      } },
      { node: 'l3.draft', edge: 'l3.failed->l3.draft', badge: 're-approved', explain: {
        en: 'Once capacity returns, each failed row is moved back through the normal approval transition and generated again — the same path, not a special repair path. Every previously failed row ends ready.',
        ko: '용량이 돌아오면 실패한 각 행을 정상 승인 전이로 되돌려 다시 생성합니다 — 특별한 복구 경로가 아니라 같은 경로입니다. 이전에 실패했던 행이 전부 ready 로 끝납니다.',
      } },
      { node: 'l3.render', edge: 'l3.push->l3.render', explain: {
        en: 'With the library complete, the episode renders.',
        ko: '도감이 완성된 상태로 편이 렌더됩니다.',
      } },
      { node: 'l3.review', edge: 'l3.render->l3.review', badge: 'flagged', explain: {
        en: 'A beat is flagged, re-rendered, and cleared, exactly as in the reuse case — the review loop does not care how the assets were obtained.',
        ko: '비트 하나가 플래그되고, 재렌더되고, 해제됩니다 — 재사용 사례와 정확히 동일합니다. 재검토 루프는 자산이 어떻게 조달됐는지 신경 쓰지 않습니다.',
      } },
      { node: 'l3.publish', edge: 'l3.review->l3.publish', badge: 'end', explain: {
        en: 'Published by hand.',
        ko: '사람이 발행합니다.',
      } },
    ],
  },
];

export default l3Scenarios;
