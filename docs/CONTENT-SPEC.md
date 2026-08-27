# pipeline-anatomy — Content Specification (Stage 1)

**Status:** frozen content spec for lessons L0–L3. Implementation (stage 2+) turns this document into lesson data modules; it does not re-decide the wording here.

**Model boundary (applies to every lesson):** pipeline-anatomy replays a *generalized model of three real, single-operator content automation pipelines*, as built and observed in 2026-08. It is not a replay of any particular repository. Every stage, branch and design decision below was derived from the operating documentation of those systems and then **generalized**: no product, project, service, channel, account, host, port, path or performance figure appears anywhere in this spec or in the app built from it. Clock times are described as cadence ("nightly", "several times daily"), never as wall-clock schedules.

**Baseline:** generalized from real production systems, **as-built 2026-08**.

**Accuracy evidence:** the excerpt-by-excerpt trace from every claim below to the operating documents it came from is kept privately by the author, because the source documents are private. That trace is the accuracy gate for this spec; the public repository carries only the generalized result.

**Family:** pipeline-anatomy shares its lesson engine with `cc-anatomy` (diagram + step player + branch widgets, EN/KO). Same machinery, different domain.

---

## 0. Schema this spec targets

Each lesson is a pure data module:

```
{ id, title:{en,ko}, intro:{en,ko},
  diagram:{ nodes[], edges[] },
  inputs:{ widgetId: [allowed values...] },     // <=2 widgets per lesson, <=8 total combinations
  scenarios:[ { id, trigger:{widgetId:value,...}, steps:[{node, edge?, explain:{en,ko}, badge?}] } ],
  decisions:[ { id, title:{en,ko}, body:{en,ko} } ],   // NEW vs cc-anatomy: 3-5 design-decision cards
  quiz:[ {q:{en,ko}, choices[], answer} ] }
```

**Branch completeness contract:** the Cartesian product of `inputs` must be fully covered by `scenarios[].trigger`. Every combination listed in this spec has exactly one scenario.

**Failure-branch contract:** every pipeline lesson (L1, L2, L3) carries at least one scenario whose path ends in a failure branch — retry, quarantine, block, or hold — and L0 makes the failure branch one of its two widget states.

### Node kinds used in the diagrams

| kind | Meaning |
| :--- | :--- |
| `event` | A stage that runs and produces something |
| `artifact` | Durable state a stage writes or reads (queue, cache, log, report) |
| `decision` | A branch point where the pipeline chooses a path |
| `cluster` | A visual grouping whose members have no fixed order among them |
| `terminal` | An end state for the replay |

### Vocabulary (generic, used consistently across lessons)

| Term | Meaning in this spec |
| :--- | :--- |
| scheduled trigger | An unattended, recurring run started by the machine's scheduler |
| inventory queue | A durable list of *work not yet done*, claimed one item at a time |
| asset queue | A per-artifact state machine for expensive media generation |
| quality gate | A scored + ruled check that decides whether work may proceed |
| render | Turning approved text and assets into a finished media file |
| publish queue | Finished output waiting for its release slot |
| run report | The per-run notification sent whether the run succeeded or failed |
| LLM gateway | The single indirection through which all model calls are made |
| shared service hub | The single local service that fronts speech, image and notification capabilities |
| state store | The database that holds stage-to-stage records |

---

## 1. L0 — Common Foundations

- **title.en:** Common Foundations
- **title.ko:** 공통 기반 구조
- **intro.en:** Three different content pipelines, built for three different purposes, converged on the same skeleton: a scheduled trigger pulls one item from a queue, produces something, gates it, renders it, queues it for publishing, and reports the run. This lesson is that skeleton — and what happens when the gate says no.
- **intro.ko:** 목적이 서로 다른 세 개의 콘텐츠 파이프라인이 결국 같은 뼈대로 수렴했습니다 — 예약 실행이 큐에서 한 건을 꺼내고, 무언가를 생산하고, 게이트를 통과시키고, 렌더하고, 발행 큐에 넣고, 실행 결과를 보고합니다. 이 레슨은 그 뼈대와, 게이트가 거부했을 때 벌어지는 일을 다룹니다.

### 1.1 Nodes

| id | label.en | label.ko | kind | Role (one line) |
| :--- | :--- | :--- | :--- | :--- |
| `l0.schedule` | Scheduled trigger | 예약 실행 | event | An unattended run starts on a fixed cadence, with no operator present. |
| `l0.queue` | Inventory queue | 재고 큐 | artifact | The durable list of work not yet done. |
| `l0.claim` | Claim one item | 한 건 클레임 | decision | Take exactly one item, or find nothing to take. |
| `l0.produce` | Produce | 생산 | event | Turn a source item into a candidate output (usually the model call). |
| `l0.gate` | Quality gate | 품질 게이트 | decision | Score the candidate and apply the blocking rules. |
| `l0.render` | Render | 렌더 | event | The expensive stage: assemble media from approved text and assets. |
| `l0.quarantine` | Quarantine and retry | 격리·재시도 | decision | A rejected or failed item is set aside, counted, and possibly requeued. |
| `l0.cache` | Stage cache | 단계 캐시 | artifact | Per-stage outputs kept on disk so a resumed run skips finished work. |
| `l0.publish` | Publish queue | 발행 큐 | artifact | Finished output waiting for its release slot. |
| `l0.report` | Run report | 실행 리포트 | artifact | One notification per run, sent on success and on failure alike. |
| `l0.done` | Run ends | 실행 종료 | terminal | The run finishes and reports what it did. |

### 1.2 Edges

| from | to | label |
| :--- | :--- | :--- |
| `l0.schedule` | `l0.queue` | wakes up |
| `l0.queue` | `l0.claim` | one item at a time |
| `l0.claim` | `l0.produce` | item claimed |
| `l0.claim` | `l0.report` | queue empty — nothing to do |
| `l0.produce` | `l0.cache` | writes stage output |
| `l0.cache` | `l0.gate` | — |
| `l0.gate` | `l0.render` | pass |
| `l0.gate` | `l0.quarantine` | fail |
| `l0.quarantine` | `l0.queue` | **requeue (retries remaining)** |
| `l0.quarantine` | `l0.report` | retries exhausted |
| `l0.render` | `l0.publish` | — |
| `l0.publish` | `l0.report` | — |
| `l0.report` | `l0.done` | — |

### 1.3 Inputs

```
inputs: {
  gate:  ["pass", "fail"],
  queue: ["stocked", "empty"]
}
```
2 widgets · 2 × 2 = **4 combinations**.

- `gate` toggle: the candidate clears the thresholds / the candidate is rejected
- `queue` toggle: the inventory queue has work / the inventory queue is empty

### 1.4 Scenarios

#### `l0.s1` — `{gate:"pass", queue:"stocked"}` — the happy path

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l0.schedule` | The run starts on its own, on a fixed cadence, with nobody watching. Everything downstream has to be safe to do unattended. | 정해진 주기에 맞춰 아무도 보지 않는 상태로 실행이 시작됩니다. 이후 모든 단계는 무인으로 돌아도 안전해야 합니다. | `unattended` |
| 2 | `l0.claim` | It claims exactly one item from the inventory queue. One item per run keeps a bad run from burning the whole backlog. | 재고 큐에서 정확히 한 건만 클레임합니다. 한 번에 한 건이라 실패한 실행이 백로그 전체를 태우지 않습니다. | |
| 3 | `l0.produce` | The produce stage turns the source item into a candidate — text, structure, or both. This is where the model calls happen. | 생산 단계가 소스 항목을 후보물로 바꿉니다 — 텍스트, 구조, 또는 둘 다. 모델 호출이 일어나는 자리입니다. | |
| 4 | `l0.cache` | Each stage writes its output to disk before the next stage starts, so an interrupted run resumes instead of re-paying for finished work. | 각 단계는 다음 단계 전에 산출물을 디스크에 씁니다. 그래서 중단된 실행은 이미 끝난 작업을 다시 결제하지 않고 이어서 진행합니다. | |
| 5 | `l0.gate` | The gate scores the candidate and applies its blocking rules. It runs **before** the render, because the render is the expensive stage. | 게이트가 후보물을 채점하고 차단 규칙을 적용합니다. 렌더가 비싼 단계이므로 게이트는 렌더 **앞**에 섭니다. | `pass` |
| 6 | `l0.render` | Only approved work reaches the render. Media assembly is measured in minutes per item, not seconds. | 승인된 작업만 렌더에 도달합니다. 미디어 조립은 초가 아니라 건당 분 단위입니다. | |
| 7 | `l0.publish` | The finished file goes into the publish queue rather than straight out the door, so release timing is a separate decision from production timing. | 완성 파일은 곧장 나가지 않고 발행 큐로 들어갑니다. 그래서 공개 시점이 제작 시점과 분리된 결정이 됩니다. | |
| 8 | `l0.done` | The run reports what it did and ends. The report is sent whether the run succeeded or failed. | 실행이 결과를 보고하고 끝납니다. 리포트는 성공·실패와 무관하게 발송됩니다. | `end` |

#### `l0.s2` — `{gate:"fail", queue:"stocked"}` — the failure branch

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l0.schedule` | The scheduled run starts as usual. | 예약 실행이 평소대로 시작됩니다. | `unattended` |
| 2 | `l0.claim` | One item is claimed from the inventory queue. | 재고 큐에서 한 건이 클레임됩니다. | |
| 3 | `l0.produce` | The produce stage generates a candidate. | 생산 단계가 후보물을 만듭니다. | |
| 4 | `l0.gate` | The gate rejects it. Rejection is a normal outcome, not an error — a run that produces nothing publishable is still a correct run. | 게이트가 거부합니다. 거부는 오류가 아니라 정상 결과입니다 — 발행할 것이 하나도 안 나온 실행도 올바른 실행입니다. | `rejected` |
| 5 | `l0.quarantine` | The rejected item is set aside with its reason recorded, and the retry counter is incremented. The render never runs, so the expensive stage costs nothing. | 거부된 항목은 사유가 기록된 채 격리되고 재시도 카운터가 올라갑니다. 렌더는 실행되지 않으므로 비싼 단계에 비용이 들지 않습니다. | `quarantined` |
| 6 | `l0.queue` | With retries remaining, the item goes back to the queue and the next scheduled run picks it up again. Transient failures heal themselves overnight. | 재시도 여유가 있으면 항목은 큐로 돌아가고 다음 예약 실행이 다시 집어갑니다. 일시적 실패는 하룻밤 사이에 스스로 낫습니다. | `requeued` |
| 7 | `l0.report` | The run still reports. A silent failed run is the one failure mode an unattended pipeline cannot tolerate. | 그래도 실행은 보고합니다. 조용히 실패하는 실행이야말로 무인 파이프라인이 견딜 수 없는 유일한 실패 형태입니다. | |
| 8 | `l0.done` | The run ends having produced nothing — by design. | 아무것도 만들지 않은 채 실행이 끝납니다 — 설계대로입니다. | `end` |

#### `l0.s3` — `{gate:"pass", queue:"empty"}` — nothing to do

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l0.schedule` | The scheduled run starts on cadence, as it does every time. | 예약 실행이 늘 그렇듯 주기에 맞춰 시작됩니다. | `unattended` |
| 2 | `l0.queue` | The inventory queue is empty. Nothing has been stocked since the last run drained it. | 재고 큐가 비어 있습니다. 지난 실행이 비운 뒤로 채워진 것이 없습니다. | `empty` |
| 3 | `l0.claim` | The claim finds no item. The run does not invent work, and it does not fail either. | 클레임이 아무 항목도 찾지 못합니다. 실행은 일을 지어내지도, 실패로 처리하지도 않습니다. | `no-op` |
| 4 | `l0.report` | It reports "nothing to do". This is how an empty queue becomes visible — otherwise a drained pipeline looks exactly like a healthy quiet one. | "할 일 없음"을 보고합니다. 빈 큐가 보이게 되는 유일한 경로입니다 — 그러지 않으면 고갈된 파이프라인과 조용히 건강한 파이프라인이 똑같아 보입니다. | |
| 5 | `l0.done` | The run ends. Restocking the queue is a separate, operator-initiated job. | 실행이 끝납니다. 큐를 다시 채우는 것은 운영자가 시작하는 별도의 작업입니다. | `end` |

#### `l0.s4` — `{gate:"fail", queue:"empty"}` — the gate never runs

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l0.schedule` | The scheduled run starts. | 예약 실행이 시작됩니다. | `unattended` |
| 2 | `l0.queue` | The queue is empty, so the gate setting has no effect on this run — there is no candidate to judge. | 큐가 비어 있어 게이트 설정은 이번 실행에 영향이 없습니다 — 판정할 후보물 자체가 없습니다. | `empty` |
| 3 | `l0.claim` | Nothing is claimed, so produce, gate and render are all skipped. | 클레임되는 것이 없으므로 생산·게이트·렌더가 모두 건너뛰어집니다. | `no-op` |
| 4 | `l0.report` | The run reports the empty queue. | 실행이 빈 큐를 보고합니다. | |
| 5 | `l0.done` | The run ends. The order matters: the queue is checked before anything is produced, so an empty queue costs one cheap wake-up rather than a wasted generation. | 실행이 끝납니다. 순서가 중요합니다 — 무엇을 생산하기 전에 큐를 먼저 확인하므로, 빈 큐의 비용은 낭비된 생성이 아니라 값싼 기상 한 번입니다. | `end` |

### 1.5 Decisions

| id | title.en / title.ko | body.en | body.ko |
| :--- | :--- | :--- | :--- |
| `l0.d1` | Why an inventory queue / 왜 재고 큐인가 | Generating on demand ties output to the moment of demand, and the model call is the slowest, least reliable step in the chain. Stocking finished or half-finished work in a durable queue decouples the two: production can run whenever capacity exists, publishing can run on its own rhythm, and a bad production night costs a slot rather than a missed release. The queue is also the only place where "we are running out" is visible early enough to act on. | 즉석 생성은 산출을 수요 시점에 묶어 버리는데, 모델 호출은 사슬에서 가장 느리고 가장 덜 미더운 단계입니다. 완성물·반완성물을 지속성 있는 큐에 재고로 쌓아 두면 둘이 분리됩니다 — 생산은 여유가 있을 때 돌고, 발행은 자기 리듬으로 돌며, 제작이 망한 밤의 대가는 놓친 공개가 아니라 슬롯 하나입니다. 또한 "재고가 떨어져 간다"를 손쓸 수 있을 만큼 일찍 보여 주는 자리도 큐뿐입니다. |
| `l0.d2` | Why the gate sits before the render / 왜 게이트를 렌더 앞에 두나 | Rendering is where the minutes and the money go: image generation, speech synthesis, and muxing all run per item. Judging text is cheap and judging a finished video is not, so the gate is placed at the last point where rejection is still free. The consequence is that rejection has to be a first-class normal outcome — a run may legitimately produce nothing — rather than an exception path bolted on later. | 렌더는 분과 비용이 나가는 자리입니다 — 이미지 생성·음성 합성·먹싱이 전부 건당으로 돌아갑니다. 텍스트를 판정하는 것은 싸고 완성된 영상을 판정하는 것은 싸지 않으므로, 게이트는 거부가 아직 공짜인 마지막 지점에 놓입니다. 그 결과 거부는 나중에 덧붙인 예외 경로가 아니라 **정상 결과**여야 합니다 — 실행이 아무것도 못 만드는 것이 정당한 일이 됩니다. |
| `l0.d3` | Why every run reports / 왜 모든 실행이 보고하나 | An unattended job that only speaks when it fails is indistinguishable from an unattended job that stopped being scheduled at all. Wrapping every scheduled job in one reporter that fires on both exit paths — success and failure, with the tail of the log attached on failure — turns "did it run?" into a question the operator never has to ask. The wrapper also has to be fail-safe: if the notifier is down, the job's own behaviour and exit code must not change. | 실패할 때만 말하는 무인 잡은, 아예 스케줄에서 빠져 버린 무인 잡과 구별되지 않습니다. 모든 예약 잡을 하나의 리포터로 감싸 성공·실패 양쪽 종료 경로에서 발화시키면(실패 시 로그 끝부분 첨부) "돌긴 돌았나?"라는 질문 자체가 사라집니다. 이 래퍼는 fail-safe 여야 합니다 — 알림이 죽어 있어도 잡 자체의 동작과 종료코드는 변하지 않아야 합니다. |
| `l0.d4` | Why partial output is kept, not deleted / 왜 중단 산출물을 지우지 않나 | When a long render dies halfway, the instinct is to clean up. That is exactly wrong: each stage writes its output to a per-item directory, and the renderer treats existing files as cache and continues from where it stopped. Deleting means re-paying for every model call and every synthesized second already produced. The rule is therefore "do not delete, just run it again", with a full wipe reserved for the case where you actually want regeneration. | 긴 렌더가 중간에 죽으면 치우고 싶어집니다. 정확히 반대로 해야 합니다 — 각 단계는 항목별 디렉터리에 산출물을 쓰고, 렌더러는 기존 파일을 캐시로 인정해 멈춘 자리에서 이어 만듭니다. 지운다는 것은 이미 끝난 모든 모델 호출과 합성된 모든 초를 다시 결제한다는 뜻입니다. 그래서 규칙은 "지우지 말고 다시 실행"이며, 통째 삭제는 정말로 재생성을 원할 때만 씁니다. |

### 1.6 Quiz

1. **en:** Why does the quality gate run before the render stage rather than after it? · **ko:** 품질 게이트는 왜 렌더 뒤가 아니라 앞에서 실행됩니까?
   - a) Because the render can only accept approved file formats / 렌더가 승인된 파일 형식만 받기 때문
   - b) **Because the render is the expensive stage, so rejection must stay free / 렌더가 비싼 단계라 거부가 공짜인 채로 남아야 하기 때문** ✅
   - c) Because the gate needs the rendered video to score it / 게이트가 채점하려면 렌더된 영상이 필요하기 때문
   - d) Because the publish queue rejects unrendered items / 발행 큐가 렌더 안 된 항목을 거부하기 때문

2. **en:** A scheduled run finds its inventory queue empty. What does the skeleton do? · **ko:** 예약 실행이 재고 큐가 빈 것을 발견했습니다. 이 뼈대는 어떻게 동작합니까?
   - a) It fails the run so the operator is alerted by the error / 실행을 실패로 처리해 오류로 알린다
   - b) It generates a new source item to fill the gap / 빈자리를 채울 새 소스 항목을 생성한다
   - c) **It does nothing, and still reports that there was nothing to do / 아무것도 하지 않고, 할 일이 없었다는 사실을 그래도 보고한다** ✅
   - d) It re-renders the most recent published item / 가장 최근 발행분을 다시 렌더한다

3. **en:** A long render is interrupted halfway. What is the default recovery? · **ko:** 긴 렌더가 중간에 중단됐습니다. 기본 복구 방법은 무엇입니까?
   - a) Delete the partial output directory and start clean / 부분 산출물 디렉터리를 지우고 처음부터
   - b) **Leave the partial output in place and run it again, so finished stages are reused as cache / 부분 산출물을 그대로 두고 다시 실행해 끝난 단계를 캐시로 재사용한다** ✅
   - c) Publish whatever was finished / 완성된 만큼만 발행한다
   - d) Move the item to the rejection log / 항목을 폐기 로그로 옮긴다

---

## 2. L1 — Audiobook Factory

- **title.en:** Audiobook Factory
- **title.ko:** 오디오북 공장
- **intro.en:** One long-form narration engine, three output formats, and a queue of titles that outlives any single run. This lesson follows a title from the inventory queue through outline, script, speech and assembly — and shows what the pipeline does when the render dies at part twelve of twenty.
- **intro.ko:** 하나의 롱폼 내레이션 엔진, 세 가지 출력 포맷, 그리고 어떤 개별 실행보다도 오래 사는 제목 큐. 이 레슨은 제목 하나가 재고 큐에서 아웃라인·대본·음성·조립을 거치는 과정을 따라가고, 20부 중 12부에서 렌더가 죽었을 때 파이프라인이 무엇을 하는지 보여 줍니다.

### 2.1 Nodes

| id | label.en | label.ko | kind | Role (one line) |
| :--- | :--- | :--- | :--- | :--- |
| `l1.nightly` | Nightly unattended run | 야간 무인 실행 | event | The recurring job that produces and publishes without an operator. |
| `l1.inventory` | Title inventory queue | 제목 재고 큐 | artifact | The registry of titles: planned, in production, produced, published. |
| `l1.outline` | Outline generation | 아웃라인 생성 | event | The model splits a title into N parts before any prose is written. |
| `l1.script` | Per-part script | 부별 대본 | event | Each part is written separately, in the channel's narration voice. |
| `l1.speech` | Speech synthesis | 음성 합성 | event | Each part's script becomes an audio segment. |
| `l1.cache` | Per-part resume cache | 부별 재개 캐시 | artifact | Script and audio per part, so a resumed run skips finished parts. |
| `l1.assemble` | Assemble and chapter | 조립·챕터 | event | Concatenate segments, compute chapter marks, attach the intro. |
| `l1.assets` | Illustration drip queue | 삽화 드립 큐 | artifact | A separate per-image state machine feeding the illustrated formats. |
| `l1.pace` | Pace gate | 페이스 게이트 | decision | Has enough time passed since the last release on this track? |
| `l1.publish` | Scheduled release | 예약 공개 | event | Upload now, release on the track's own slot. |
| `l1.hold` | Held for next window | 다음 창까지 보류 | terminal | Produced but deliberately not released yet. |
| `l1.retry` | Fail fast or retry | 즉시 중단 또는 재시도 | decision | Transient failure retries next run; a quota notice stops immediately. |
| `l1.done` | Episode released | 편 공개 완료 | terminal | The item leaves the pipeline. |

### 2.2 Edges

`l1.nightly` → `l1.inventory` → `l1.outline` → `l1.script` → `l1.cache` → `l1.speech` → `l1.cache` → `l1.assemble` → `l1.pace` → { `l1.publish` → `l1.done` | `l1.hold` }

Failure edges: `l1.script` → `l1.retry`, `l1.speech` → `l1.retry`, `l1.assemble` → `l1.retry`; `l1.retry` → `l1.inventory` (**retry on the next scheduled run**) and `l1.retry` → `l1.done` (**stop immediately, no retry**, when the failure is a quota notice rather than an error).

Asset edge (illustrated formats only): `l1.assets` → `l1.assemble`, drawn as a side feed. The drip queue advances on its own cadence and is not part of the nightly critical path.

### 2.3 Inputs

```
inputs: {
  format: ["long", "short", "mid"],
  render: ["ok", "fail"]
}
```
2 widgets · 3 × 2 = **6 combinations**.

- `format` chips: long-form narration (hours, audio-led) / short vertical teaser (under a minute) / mid-length illustrated dialogue (minutes)
- `render` toggle: the render completes / the render dies partway

### 2.4 Scenarios

#### `l1.s1` — `{format:"long", render:"ok"}` — the flagship path

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l1.inventory` | The nightly run claims the next planned title from the inventory queue. The queue is a registry, not a to-do list in someone's head: a title is planned, then produced, then released, and each transition is recorded. | 야간 실행이 재고 큐에서 다음 예정 제목을 클레임합니다. 이 큐는 누군가의 머릿속 할 일 목록이 아니라 레지스트리입니다 — 제목은 예정→제작→공개로 이동하고 각 전이가 기록됩니다. | |
| 2 | `l1.outline` | Before a single sentence of prose exists, the model produces an outline: N parts, each with a subtitle and a core beat. The outline is cached, so re-running never re-decides the structure. | 산문이 한 문장도 쓰이기 전에 모델이 아웃라인을 만듭니다 — N개의 부, 각각 소제목과 핵심 비트. 아웃라인은 캐시되므로 재실행이 구조를 다시 정하는 일은 없습니다. | `structure first` |
| 3 | `l1.script` | Each part is written as its own model call, in a fixed narration voice, and each part is told how it connects to the one before it. Writing part-by-part keeps any single failure to one part. | 각 부는 고정된 내레이션 톤으로 개별 모델 호출로 집필되고, 각 부는 앞 부와 어떻게 이어지는지를 지시받습니다. 부 단위 집필 덕분에 한 번의 실패가 한 부에만 머뭅니다. | |
| 4 | `l1.cache` | Script and audio are written per part. A run that dies at part twelve resumes at part twelve; parts one to eleven are never re-generated. | 대본과 음성은 부별로 기록됩니다. 12부에서 죽은 실행은 12부에서 재개하고, 1~11부는 다시 생성되지 않습니다. | `resumable` |
| 5 | `l1.assemble` | Segments are concatenated into one track, chapter marks are computed from the part boundaries, and an intro is attached — which shifts every chapter mark by the intro's length. | 세그먼트가 하나의 트랙으로 이어지고, 부 경계에서 챕터 지점이 계산되고, 인트로가 붙습니다 — 그리고 인트로 길이만큼 모든 챕터 지점이 시프트됩니다. | |
| 6 | `l1.pace` | The pace gate asks one question: has enough time passed since this track's last release? Enough has, so the episode is released. | 페이스 게이트는 한 가지만 묻습니다 — 이 트랙의 마지막 공개 이후 충분한 시간이 지났는가? 지났으므로 편이 공개됩니다. | `pace ok` |
| 7 | `l1.done` | The item's queue state moves to released and the run reports. | 항목의 큐 상태가 공개 완료로 이동하고 실행이 결과를 보고합니다. | `end` |

#### `l1.s2` — `{format:"long", render:"fail"}` — self-healing overnight

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l1.inventory` | The nightly run claims the next title. | 야간 실행이 다음 제목을 클레임합니다. | |
| 2 | `l1.script` | Part twelve's model call fails. In an unattended run there is nobody to notice, so the behaviour on failure is the whole design. | 12부의 모델 호출이 실패합니다. 무인 실행에는 알아챌 사람이 없으므로, 실패 시의 동작이 설계 전부입니다. | `fail` |
| 3 | `l1.retry` | The pipeline distinguishes two kinds of failure. A transient one — a lock collision, a timeout — is left to the next run. A capacity notice returned as an apparently successful response is **not** retried, because retrying cannot fix it and the remaining stages would be paid for nothing. | 파이프라인은 두 종류의 실패를 구분합니다. 락 충돌·타임아웃 같은 일시적 실패는 다음 실행에 맡깁니다. 성공 응답처럼 돌아온 한도 안내문은 **재시도하지 않습니다** — 재시도로 풀리지 않을뿐더러 남은 단계 비용만 날리기 때문입니다. | `fail fast` |
| 4 | `l1.cache` | Parts one to eleven stay on disk. Nothing is cleaned up. | 1~11부는 디스크에 그대로 남습니다. 아무것도 정리하지 않습니다. | `kept` |
| 5 | `l1.inventory` | The item stays in the queue in its produced-partially state, and the next scheduled run picks it up and continues from part twelve. Overnight self-recovery is the normal repair path. | 항목은 부분 제작 상태로 큐에 남고, 다음 예약 실행이 이를 집어 12부부터 이어갑니다. 하룻밤 자가복구가 정상 복구 경로입니다. | `requeued` |
| 6 | `l1.done` | Tonight's run publishes nothing and says so in its report. | 오늘 밤 실행은 아무것도 발행하지 않고, 리포트에 그렇게 적습니다. | `end` |

#### `l1.s3` — `{format:"short", render:"ok"}` — the derived format

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l1.inventory` | The short-form track does not claim a title. It claims a *released long-form episode* — shorts exist to funnel viewers to the long form. | 쇼츠 트랙은 제목을 클레임하지 않습니다. **이미 공개된 롱폼 편**을 클레임합니다 — 쇼츠는 롱폼으로 유입시키기 위해 존재하기 때문입니다. | `derived` |
| 2 | `l1.pace` | Because the short's description links back to the long form, the track first checks that the parent episode is actually public. A produced-but-unreleased parent is held, not linked. | 쇼츠 설명이 롱폼을 역링크하므로, 트랙은 부모 편이 실제로 공개 상태인지부터 확인합니다. 제작됐지만 미공개인 부모는 링크하지 않고 보류합니다. | `parent public?` |
| 3 | `l1.script` | A short hook is written from the parent episode's material — a teaser, not a summary. | 부모 편의 소재로 짧은 훅을 씁니다 — 요약이 아니라 티저입니다. | |
| 4 | `l1.assemble` | The vertical clip is assembled under the platform's short-form length limit; exceeding it silently reclassifies the upload. | 세로 클립이 플랫폼의 쇼츠 길이 상한 안에서 조립됩니다. 넘기면 업로드가 조용히 다른 형식으로 분류돼 버립니다. | `vertical` |
| 5 | `l1.done` | Several shorts per day drip out on their own cadence, separately capped from the other tracks. | 쇼츠는 하루 여러 편이 자체 주기로 드립되며, 다른 트랙과 별도로 상한이 걸립니다. | `end` |

#### `l1.s4` — `{format:"short", render:"fail"}` — the dead-link guard

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l1.inventory` | The short-form run looks for a parent long-form episode to promote. | 쇼츠 실행이 홍보할 부모 롱폼 편을 찾습니다. | `derived` |
| 2 | `l1.pace` | The parent was uploaded but is still unlisted, waiting for its release slot. Judging "is it published?" from the local production record alone would say yes. | 부모 편은 업로드됐지만 아직 비공개로 공개 슬롯을 기다리고 있습니다. 로컬 제작 기록만으로 "발행됐나?"를 판정하면 예라고 나옵니다. | `stale record` |
| 3 | `l1.retry` | So the check queries the platform for the actual visibility instead of trusting the local record. Trusting it once produced live shorts pointing at a link nobody could open. | 그래서 로컬 기록을 믿는 대신 플랫폼에 실제 공개 상태를 질의합니다. 그것을 믿었다가, 아무도 열 수 없는 링크를 가리키는 쇼츠가 실제로 나간 적이 있습니다. | `guarded` |
| 4 | `l1.hold` | The short is held with the reason and the count printed, and it goes out on the next run once the parent is genuinely public. | 쇼츠는 사유와 건수가 출력된 채 보류되고, 부모가 진짜 공개된 다음 실행에 나갑니다. | `held` |
| 5 | `l1.done` | Nothing is published tonight for this track, and the report says why. | 이 트랙은 오늘 밤 아무것도 발행하지 않고, 리포트가 그 이유를 적습니다. | `end` |

#### `l1.s5` — `{format:"mid", render:"ok"}` — the illustrated format

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l1.inventory` | The mid-length track claims a highlight from an already-produced work rather than a whole title. | 중폼 트랙은 제목 전체가 아니라 이미 제작된 작품의 하이라이트 하나를 클레임합니다. | `derived` |
| 2 | `l1.assets` | Its illustrations come from a pre-rendered pool. A planner had earlier converted the work's chapter list into a fixed number of illustration slots, and each slot is a row in a per-image state machine. | 삽화는 사전 렌더된 풀에서 옵니다. 앞서 플래너가 작품의 챕터 목록을 정해진 수의 삽화 슬롯으로 환산해 두었고, 각 슬롯은 이미지 단위 상태기계의 한 행입니다. | `pre-rendered` |
| 3 | `l1.script` | The dialogue script is written for the highlight, and the illustration pool is consumed in order. On-demand generation is the fallback for when the pool is empty, not the default. | 하이라이트용 대화 대본이 집필되고, 삽화 풀이 순서대로 소비됩니다. 온디맨드 생성은 풀이 비었을 때의 폴백이지 기본값이 아닙니다. | `pool first` |
| 4 | `l1.assemble` | Images, speech and captions are muxed into the vertical clip, and a timeline file records which illustration appears at which timestamp. | 이미지·음성·자막이 세로 클립으로 먹싱되고, 어떤 삽화가 몇 분 몇 초에 나오는지 타임라인 파일에 기록됩니다. | |
| 5 | `l1.pace` | The mid-length track releases on its own daily slot, deliberately separated in time from the other two tracks. | 중폼 트랙은 자체 일일 슬롯으로 공개되며, 다른 두 트랙과 시간대가 의도적으로 분리돼 있습니다. | `own slot` |
| 6 | `l1.done` | The episode is released and the inventory count for that work drops by one. | 편이 공개되고 그 작품의 재고 수가 하나 줄어듭니다. | `end` |

#### `l1.s6` — `{format:"mid", render:"fail"}` — the asset queue absorbs it

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l1.assets` | An illustration slot is claimed from the drip queue and moves from pending to generating, under a file lock so two workers cannot claim the same slot. | 드립 큐에서 삽화 슬롯 하나가 클레임돼 대기에서 생성중으로 이동합니다 — 파일 락 아래에서 이뤄지므로 두 워커가 같은 슬롯을 잡을 수 없습니다. | `claimed` |
| 2 | `l1.retry` | The image renderer is not running, so the slot fails. Failure moves the row to failed with its attempt count incremented, and a bounded number of attempts is allowed before the row is blocked for good. | 이미지 렌더러가 떠 있지 않아 슬롯이 실패합니다. 실패는 행을 시도 횟수를 올린 채 실패 상태로 옮기고, 정해진 횟수를 넘기면 행은 영구 차단 상태가 됩니다. | `retry k` |
| 3 | `l1.assets` | A reaper sweeps rows that have been stuck in generating past a time limit and returns them to the queue, so a worker that died mid-render does not strand its slot forever. | 리퍼가 제한 시간을 넘겨 생성중에 멈춘 행을 회수해 큐로 되돌립니다. 그래서 렌더 도중 죽은 워커가 슬롯을 영원히 붙잡지 못합니다. | `reaped` |
| 4 | `l1.assets` | The drip worker also refuses to run at all outside its window, or when a stop-switch file exists, or when the renderer's health check fails — it skips loudly rather than failing every slot. | 드립 워커는 자기 시간창 밖이거나, 정지 스위치 파일이 있거나, 렌더러 헬스체크가 실패하면 아예 돌지 않습니다 — 슬롯을 전부 실패시키는 대신 명시적으로 건너뜁니다. | `guarded skip` |
| 5 | `l1.done` | The mid-length assembly waits: it consumes the pool, and the pool refills on its own schedule. The publishing track is never blocked on an image renderer being awake. | 중폼 조립은 기다립니다 — 조립은 풀을 소비하고, 풀은 자기 일정으로 다시 채워집니다. 발행 트랙이 이미지 렌더러의 기상 여부에 묶이는 일은 없습니다. | `end` |

### 2.5 Decisions

| id | title.en / title.ko | body.en | body.ko |
| :--- | :--- | :--- | :--- |
| `l1.d1` | Why outline before prose / 왜 산문보다 아웃라인이 먼저인가 | Asking a model for hours of narration in one call gives you no seam to resume from and no way to check the shape before paying for the words. Splitting a title into N parts first makes the structure a cached artifact that can be reviewed, and turns the expensive part into N independent, individually retryable calls. It also lets each part be told what came before it, which is what keeps a serialized narration from restarting its greeting every episode. | 모델에게 몇 시간짜리 내레이션을 한 번에 요구하면 재개할 이음새도, 단어값을 치르기 전에 형태를 확인할 방법도 없습니다. 제목을 먼저 N개 부로 쪼개면 구조가 검토 가능한 캐시 산출물이 되고, 비싼 부분이 개별 재시도 가능한 N개의 독립 호출로 바뀝니다. 각 부에 "앞에 무엇이 있었는지"를 알려 줄 수 있게 되는 것도 이 덕분이며, 연속 내레이션이 매 편 인사말부터 다시 시작하지 않는 이유가 이것입니다. |
| `l1.d2` | Why a per-part resume cache / 왜 부별 재개 캐시인가 | A multi-hour production that has to start over from zero after any failure is not an unattended pipeline, it is a coin flip. Writing each part's script and audio to its own file before moving on means the resume rule is trivially correct: if the file exists, skip the stage. The same rule at the top level — a finished output file means skip the whole title — is what makes it safe to re-run the nightly job blindly. | 실패할 때마다 처음부터 다시 시작해야 하는 몇 시간짜리 제작은 무인 파이프라인이 아니라 동전 던지기입니다. 각 부의 대본과 음성을 다음으로 넘어가기 전에 파일로 남기면 재개 규칙이 자명하게 옳아집니다 — 파일이 있으면 그 단계는 건너뛴다. 최상위에도 같은 규칙(완성 출력물이 있으면 그 제목 통째 건너뜀)을 두는 것이, 야간 잡을 아무 생각 없이 다시 돌려도 안전한 이유입니다. |
| `l1.d3` | Why a pace gate throttles releases / 왜 페이스 게이트가 공개를 조인다 | Production capacity and healthy release cadence are unrelated numbers. A backlog that took a week to build can be dumped in an afternoon, which is bad for distribution and bad for the channel. The pace gate makes the last release time — not the size of the inventory — the thing that authorizes the next release, and it refuses by default. Overriding it is possible but must be an explicit, recorded human act, because "just this once" is how a burst happens. | 제작 능력과 건강한 공개 주기는 서로 무관한 숫자입니다. 일주일 걸려 쌓은 백로그를 오후 한나절에 쏟아부을 수 있는데, 그건 배포에도 채널에도 나쁩니다. 페이스 게이트는 재고 규모가 아니라 **마지막 공개 시각**이 다음 공개를 승인하게 만들고, 기본값은 거부입니다. 무시할 수는 있지만 반드시 명시적·기록되는 사람의 행위여야 합니다 — "이번만"이 폭주가 시작되는 방식이기 때문입니다. |
| `l1.d4` | Why illustrations live in their own drip queue / 왜 삽화는 별도 드립 큐에 사는가 | Image generation is minutes per image and hundreds of images per work, and it competes for the same machine as speech synthesis. Putting it on the critical path would make every episode hostage to a renderer being awake. Instead the planner fixes the total up front, a per-image state machine tracks each slot, and a low-rate worker drains it inside a permitted window; assembly just consumes whatever pool exists and falls back to on-demand only when it must. | 이미지 생성은 장당 분 단위인데 작품당 수백 장이고, 음성 합성과 같은 기계를 두고 경합합니다. 이것을 임계 경로에 두면 모든 편이 렌더러의 기상 여부에 인질로 잡힙니다. 대신 플래너가 총량을 미리 확정하고, 이미지 단위 상태기계가 슬롯마다 상태를 추적하고, 저속 워커가 허용된 시간창 안에서 이를 소진합니다. 조립은 존재하는 풀을 소비할 뿐이며, 어쩔 수 없을 때만 온디맨드로 폴백합니다. |
| `l1.d5` | Why a quota notice must not be retried / 왜 한도 안내문은 재시도하면 안 되나 | The worst failure the pipeline ever had was not a crash. A capacity limit came back as an ordinary successful response containing an apology sentence, the gateway reported success, and a one-line apology became the script for several parts before anyone noticed. Two rules came out of it: detect that class of response explicitly and abort the whole job immediately rather than retrying, and make the generator *fail* when its output falls under a length floor instead of returning something short. Retrying costs the entire downstream synthesis and assembly for an outcome that cannot improve. | 이 파이프라인 최악의 실패는 크래시가 아니었습니다. 한도 도달이 사과 문장 하나를 담은 **평범한 성공 응답**으로 돌아왔고, 게이트웨이는 성공으로 보고했고, 한 줄짜리 사과문이 여러 부의 대본이 된 뒤에야 발각됐습니다. 여기서 두 규칙이 나왔습니다 — 그 부류의 응답을 명시적으로 탐지해 재시도 없이 잡 전체를 즉시 중단할 것, 그리고 생성기가 길이 하한 미달 시 짧은 결과를 반환하지 말고 **실패**할 것. 재시도는 나아질 수 없는 결과를 위해 이후 합성·조립 비용 전부를 치르는 일입니다. |

### 2.6 Quiz

1. **en:** Why is the long-form script generated part by part instead of in one call? · **ko:** 롱폼 대본은 왜 한 번의 호출이 아니라 부 단위로 생성됩니까?
   - a) Because the model cannot produce long text / 모델이 긴 텍스트를 못 만들어서
   - b) **Because each part is cached and individually retryable, so one failure costs one part / 각 부가 캐시되고 개별 재시도 가능해, 한 번의 실패가 한 부만 잃게 하려고** ✅
   - c) Because chapters must be uploaded separately / 챕터를 따로 업로드해야 해서
   - d) Because each part uses a different voice / 부마다 다른 목소리를 써서

2. **en:** The model returns an apparently successful response that is actually a capacity notice. What is the correct handling? · **ko:** 모델이 사실은 한도 안내문인 성공 응답을 돌려줬습니다. 올바른 처리는 무엇입니까?
   - a) Retry with a backoff until it succeeds / 성공할 때까지 백오프하며 재시도한다
   - b) **Detect it and abort the job immediately, without retrying / 탐지해서 재시도 없이 잡을 즉시 중단한다** ✅
   - c) Use it as the script and fix it later / 일단 대본으로 쓰고 나중에 고친다
   - d) Switch to the fallback voice / 폴백 음성으로 전환한다

3. **en:** What authorizes the next release on a track? · **ko:** 한 트랙의 다음 공개를 승인하는 것은 무엇입니까?
   - a) The size of the finished inventory / 완성 재고의 규모
   - b) The number of items produced tonight / 오늘 밤 제작된 편수
   - c) **The time elapsed since that track's last release / 그 트랙의 마지막 공개 이후 경과 시간** ✅
   - d) Whether the illustration pool is full / 삽화 풀이 가득 찼는지 여부

---

## 3. L2 — Multi-channel Content Hub

- **title.en:** Multi-channel Content Hub
- **title.ko:** 멀티채널 콘텐츠 허브
- **intro.en:** One pipeline, several channels. Each channel plugs in a source adapter and a "colour" — persona, factual standard, risk rules, visual style — and the shared stages do the rest. The gate is the interesting part: it scores some things and refuses others outright.
- **intro.ko:** 하나의 파이프라인, 여러 개의 채널. 각 채널은 소스 어댑터와 '색'(페르소나·사실 기준·리스크 규칙·비주얼 스타일)만 꽂고, 공유 단계가 나머지를 처리합니다. 흥미로운 부분은 게이트입니다 — 어떤 것은 점수를 매기고, 어떤 것은 아예 거부합니다.

### 3.1 Nodes

| id | label.en | label.ko | kind | Role (one line) |
| :--- | :--- | :--- | :--- | :--- |
| `l2.trigger` | Scheduled factory run | 예약 공장 실행 | event | The recurring job that makes several items across several channels. |
| `l2.registry` | Channel registry | 채널 레지스트리 | artifact | One entry per channel: source, corpus, label, and its domain colour. |
| `l2.adapter` | Source adapter | 소스 어댑터 | decision | Harvested archive feed, or a curated static seed file. |
| `l2.candidates` | Candidate pool | 후보 풀 | artifact | Normalized candidate records, one schema regardless of source. |
| `l2.score` | Two-stage scoring | 2단계 채점 | event | Cheap heuristic prefilter, then model scoring on the shortlist only. |
| `l2.overproduce` | Overproduce variants | 변주 과생산 | event | One candidate becomes several competing script variants. |
| `l2.gate` | Gate: score + rule | 게이트: 점수 + 규칙 | decision | Thresholds on hook and factual accuracy, AND a blocking risk rule. |
| `l2.blocked` | Risk-blocked | 리스크 차단 | terminal | Discarded regardless of score. |
| `l2.rejectlog` | Rejection log | 폐기 로그 | artifact | Why things failed — feedback data, kept clean of passing variants. |
| `l2.visual` | Visual direction | 비주얼 디렉션 | event | Scene-by-scene image prompts with a consistency seed. |
| `l2.render` | Render vertical clip | 세로 클립 렌더 | event | Images, speech, captions and effects into one file. |
| `l2.route` | Channel routing | 채널 라우팅 | decision | Per-channel credentials decide where the file goes. |
| `l2.slot` | Scheduled release slot | 예약 공개 슬롯 | event | Uploaded now, made public later at a spread-out slot. |
| `l2.report` | Run report | 실행 리포트 | artifact | Sent on success, on zero output, and on fatal error. |

### 3.2 Edges

`l2.trigger` → `l2.registry` → `l2.adapter` → { harvest | seed } → `l2.candidates` → `l2.score` → `l2.overproduce` → `l2.gate` → { `l2.visual` (pass) | `l2.rejectlog` (score fail) | `l2.blocked` (risk rule) } ; `l2.visual` → `l2.render` → `l2.route` → `l2.slot` → `l2.report`.

`l2.rejectlog` and `l2.blocked` both also flow to `l2.report`, because a run that produced nothing still reports.

### 3.3 Inputs

```
inputs: {
  source: ["archive-feed", "curated-seed"],
  gate:   ["pass", "risk-block"]
}
```
2 widgets · 2 × 2 = **4 combinations**.

- `source` chips: a harvested public archive (bulk, machine-readable, needs normalizing) / a curated static seed file committed alongside the code
- `gate` toggle: the best variant clears the thresholds / a variant trips the blocking risk rule

### 3.4 Scenarios

#### `l2.s1` — `{source:"archive-feed", gate:"pass"}`

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l2.registry` | The run reads the channel registry. Adding a channel means one registry row plus one domain-colour entry — not a new pipeline. | 실행이 채널 레지스트리를 읽습니다. 채널 추가는 레지스트리 한 줄 + 도메인 '색' 한 항목이지 새 파이프라인이 아닙니다. | `one row` |
| 2 | `l2.adapter` | This channel's adapter harvests a public archive and normalizes it into the same candidate schema every other channel uses. The adapter is the only channel-specific code on the input side. | 이 채널의 어댑터는 공개 아카이브를 수확해 다른 모든 채널과 동일한 후보 스키마로 정규화합니다. 입력 쪽에서 채널 고유 코드는 어댑터뿐입니다. | `harvest` |
| 3 | `l2.score` | Scoring runs in two stages: a cheap deterministic prefilter over the whole corpus, then model scoring on the shortlist only. The prefilter also hard-excludes whole categories of material at the entrance. | 채점은 2단계입니다 — 전체 코퍼스에 값싼 결정적 프리필터를 돌린 뒤, 숏리스트에만 모델 채점을 합니다. 프리필터는 특정 부류의 소재를 입구에서 통째로 하드 제외하기도 합니다. | `prefilter` |
| 4 | `l2.overproduce` | One candidate becomes several script variants with deliberately different angles. Generating text is cheap, so the pipeline is generous here and strict later. | 후보 하나가 각도를 일부러 달리한 여러 개의 대본 변주가 됩니다. 텍스트 생성은 싸므로 여기서는 헤프고 뒤에서 짜게 굽니다. | `overproduce` |
| 5 | `l2.gate` | The gate scores each variant on hook strength and factual accuracy, and applies the risk rule. Passing needs both thresholds AND a clean risk verdict. One variant is selected; other passing variants are kept as backups. | 게이트가 각 변주를 후킹력과 사실 정확성으로 채점하고 리스크 규칙을 적용합니다. 통과하려면 두 임계값 **모두**와 리스크 클린 판정이 필요합니다. 하나가 채택되고, 통과했지만 미채택된 변주는 백업으로 남습니다. | `pass` |
| 6 | `l2.visual` | The approved script gets scene-by-scene image prompts plus a consistency seed, so characters and tone stay stable across cuts. Those fields were designed into the approved-script schema from the start. | 승인된 대본에 장면별 이미지 프롬프트와 일관성 시드가 붙어, 컷 사이에서 인물과 톤이 유지됩니다. 이 필드들은 처음부터 승인 대본 스키마에 설계돼 있었습니다. | |
| 7 | `l2.render` | Images, synthesized speech, captions and effects are muxed into one vertical clip. | 이미지·합성 음성·자막·효과가 하나의 세로 클립으로 먹싱됩니다. | |
| 8 | `l2.slot` | The clip is uploaded immediately but set to become public at a later slot, spaced from its siblings. Releasing at production time meant releasing in the dead of night. | 클립은 즉시 업로드되지만 나중 슬롯에 공개되도록 설정되고, 형제 편들과 간격을 둡니다. 제작 시점에 공개한다는 것은 한밤중에 공개한다는 뜻이었습니다. | `scheduled` |

#### `l2.s2` — `{source:"archive-feed", gate:"risk-block"}` — the rule beats the score

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l2.adapter` | The archive adapter produces candidates as usual. | 아카이브 어댑터가 평소대로 후보를 만듭니다. | `harvest` |
| 2 | `l2.overproduce` | Several variants are generated for the chosen candidate. | 선택된 후보에 대해 여러 변주가 생성됩니다. | `overproduce` |
| 3 | `l2.gate` | One variant scores well on hook strength — and asserts something the source does not support. | 한 변주가 후킹력 점수는 잘 받았는데, 원문이 뒷받침하지 않는 내용을 단정합니다. | |
| 4 | `l2.blocked` | The risk axis is a **rule, not a score**: a variant that trips it is discarded no matter how well it scored elsewhere. Defamation, misidentification and distorted outcomes are the failure that ends a channel, not the one that lowers an average. | 리스크 축은 **점수가 아니라 규칙**입니다 — 여기 걸린 변주는 다른 점수가 아무리 높아도 폐기됩니다. 명예훼손·신원 특정·결말 왜곡은 평균을 낮추는 실패가 아니라 채널을 끝내는 실패입니다. | `blocked` |
| 5 | `l2.rejectlog` | The rejection is logged with its reason, so the failure feeds back into what gets sourced next. Variants that *passed* but were not chosen are deliberately kept out of this log — mixing them in would poison the signal about what does not work. | 거부는 사유와 함께 기록돼, 다음에 무엇을 소싱할지에 되먹여집니다. **통과했지만 미채택된** 변주는 일부러 이 로그에서 제외합니다 — 섞이면 "안 먹히는 것"에 대한 신호가 오염되기 때문입니다. | `logged` |
| 6 | `l2.report` | If every variant fails, the run publishes nothing for that channel and reports it. Zero output is an expected outcome. | 모든 변주가 탈락하면 그 채널은 아무것도 발행하지 않고 그 사실을 보고합니다. 산출 0은 예상된 결과입니다. | `end` |

#### `l2.s3` — `{source:"curated-seed", gate:"pass"}`

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l2.registry` | A different channel row, a different colour: its own persona, factual standard, risk emphasis and hashtag set. | 다른 채널 행, 다른 색 — 고유의 페르소나·사실 기준·리스크 강조점·해시태그 세트. | `one row` |
| 2 | `l2.adapter` | This channel has no archive to harvest. Its adapter reads a curated seed file committed next to the code — small, hand-verified, and stable. | 이 채널에는 수확할 아카이브가 없습니다. 어댑터는 코드 옆에 커밋된 큐레이션 시드 파일을 읽습니다 — 작고, 손으로 검증됐고, 안정적입니다. | `seed` |
| 3 | `l2.candidates` | Both adapters emit the same candidate schema, which is why every downstream stage is untouched by the difference. | 두 어댑터 모두 같은 후보 스키마를 내보냅니다. 그래서 하류의 모든 단계가 이 차이에 손대지 않아도 됩니다. | `same schema` |
| 4 | `l2.score` | With a small vetted seed pool, the expensive scoring stage matters less; deduplication against what has already been made matters more. | 검증된 작은 시드 풀에서는 비싼 채점 단계의 비중이 줄고, 이미 만든 것과의 중복 제거가 더 중요해집니다. | `dedup` |
| 5 | `l2.gate` | The same gate runs, but with this channel's thresholds. A channel handling legal material demands a stricter factual score than a general-interest one; the risk axis changes meaning too — misattribution rather than defamation. | 같은 게이트가 이 채널의 임계값으로 돌아갑니다. 법률 소재 채널은 교양 채널보다 엄격한 사실 점수를 요구하고, 리스크 축의 의미도 달라집니다 — 명예훼손이 아니라 잘못된 귀속입니다. | `pass` |
| 6 | `l2.render` | Visual direction and rendering are the shared stages again — the channel's colour changes the prompts, not the code path. | 비주얼 디렉션과 렌더는 다시 공유 단계입니다 — 채널의 색은 프롬프트를 바꾸지 코드 경로를 바꾸지 않습니다. | |
| 7 | `l2.route` | Routing picks that channel's own credentials. Credentials live per channel and are never committed. | 라우팅이 그 채널 고유 자격증명을 고릅니다. 자격증명은 채널별로 보관되며 절대 커밋되지 않습니다. | `per channel` |
| 8 | `l2.slot` | Same scheduled-release treatment as every other channel. | 다른 모든 채널과 동일한 예약 공개 처리를 받습니다. | `scheduled` |

#### `l2.s4` — `{source:"curated-seed", gate:"risk-block"}` — the domain-specific rule

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l2.adapter` | The seed adapter supplies a vetted item. | 시드 어댑터가 검증된 항목을 공급합니다. | `seed` |
| 2 | `l2.overproduce` | Variants are generated with this channel's persona. | 이 채널의 페르소나로 변주가 생성됩니다. | `overproduce` |
| 3 | `l2.gate` | A variant attributes the material to the wrong person. For this channel that is exactly the domain risk the colour defines — the same axis that means defamation elsewhere. | 한 변주가 소재를 엉뚱한 인물에게 귀속시킵니다. 이 채널에서 그것이 바로 '색'이 정의한 도메인 리스크입니다 — 다른 채널에서는 명예훼손을 뜻하는 그 축입니다. | |
| 4 | `l2.blocked` | Blocked. Because the risk rule is defined per domain rather than globally, one shared gate can enforce four different definitions of "unacceptable". | 차단됩니다. 리스크 규칙이 전역이 아니라 도메인별로 정의돼 있으므로, 공유 게이트 하나가 네 가지 서로 다른 "허용 불가" 정의를 강제할 수 있습니다. | `blocked` |
| 5 | `l2.rejectlog` | Logged with the reason. | 사유와 함께 기록됩니다. | `logged` |
| 6 | `l2.report` | The run reports zero output for this channel and continues with the others — one channel failing does not stop the factory. | 실행은 이 채널의 산출 0을 보고하고 다른 채널을 계속 진행합니다 — 한 채널의 실패가 공장을 멈추지 않습니다. | `end` |

### 3.5 Decisions

| id | title.en / title.ko | body.en | body.ko |
| :--- | :--- | :--- | :--- |
| `l2.d1` | Why adapters instead of one pipeline per channel / 왜 채널마다 파이프라인이 아니라 어댑터인가 | Channels differ in exactly two places: where the material comes from, and what tone and standards it is held to. Everything between — scoring, overproduction, gating, visual direction, rendering, uploading — is identical. So the design isolates the difference into a source adapter and a per-domain "colour" entry, and shares one code path for the rest. Adding a channel becomes a registry row plus a colour entry, and a fix to the shared stages benefits every channel at once instead of being ported four times. | 채널은 정확히 두 곳에서만 다릅니다 — 소재가 어디서 오는가, 어떤 톤과 기준으로 다뤄지는가. 그 사이의 모든 것(채점·과생산·게이팅·비주얼 디렉션·렌더·업로드)은 동일합니다. 그래서 설계는 차이를 소스 어댑터와 도메인별 '색' 항목으로 격리하고 나머지는 한 코드 경로를 공유합니다. 채널 추가는 레지스트리 한 줄 + 색 한 항목이 되고, 공유 단계의 수정은 네 번 이식되는 대신 모든 채널에 한 번에 적용됩니다. |
| `l2.d2` | Why overproduce and discard / 왜 과생산하고 버리나 | Text generation is the cheapest stage and rendering is the most expensive, so the yield problem should be solved where it is cheap. Producing several variants with deliberately different angles and keeping at most one turned out to be the difference between "no publishable output today" and "two". The uncomfortable consequence is that the gate must be allowed to reject everything, including on days when that leaves the channel silent. | 텍스트 생성은 가장 싼 단계이고 렌더는 가장 비싼 단계이므로, 수율 문제는 싼 곳에서 풀어야 합니다. 각도를 일부러 달리한 변주 여러 개를 만들어 많아야 하나만 남기는 방식이, 실측상 "오늘 발행할 게 없다"와 "두 편 있다"를 갈랐습니다. 불편한 귀결은 게이트가 **전부 거부할 수 있어야** 한다는 것입니다 — 그날 채널이 침묵하게 되더라도. |
| `l2.d3` | Why risk is a rule, not a score / 왜 리스크는 점수가 아니라 규칙인가 | A weighted score lets a high hook rating buy off a legal problem. It should not be purchasable. So the gate has two kinds of axis: scored axes with thresholds, and one rule axis whose failure discards the item regardless of everything else. The asymmetry reflects the asymmetry of the outcomes — a weak hook loses views, a defamation or a distorted verdict loses the channel. | 가중 점수는 높은 후킹 점수로 법적 문제를 상쇄할 수 있게 만듭니다. 그건 살 수 있는 것이면 안 됩니다. 그래서 게이트는 두 종류의 축을 가집니다 — 임계값이 있는 점수 축들과, 실패하면 다른 모든 것과 무관하게 폐기되는 규칙 축 하나. 이 비대칭은 결과의 비대칭을 반영합니다 — 약한 훅은 조회수를 잃지만, 명예훼손이나 왜곡된 결말은 채널을 잃습니다. |
| `l2.d4` | Why the rejection log excludes passing-but-unused variants / 왜 폐기 로그에서 '통과했으나 미채택'을 빼는가 | The rejection log exists to teach the sourcing stage what does not work. Variants split three ways — selected, passing-but-not-chosen, and rejected — and only the last belongs in that log. Logging the middle group would tell the feedback loop that perfectly good hooks failed, which corrupts exactly the signal the log was built to carry. This was found by walking one item through the whole pipeline by hand before automating it. | 폐기 로그는 소싱 단계에 "무엇이 안 먹히는가"를 가르치기 위해 존재합니다. 변주는 셋으로 갈립니다 — 채택 / 통과했으나 미채택 / 탈락 — 그리고 마지막 것만 그 로그에 들어갑니다. 가운데 그룹을 기록하면 멀쩡한 훅이 실패했다고 피드백 루프에 알려 주게 되고, 로그가 나르려던 바로 그 신호가 오염됩니다. 이 사실은 자동화 전에 한 건을 손으로 전 구간 관통시켜 보다가 발견됐습니다. |
| `l2.d5` | Why release time is decoupled from production time / 왜 공개 시각을 제작 시각에서 떼어내나 | The factory runs when the machine is free, which is not when an audience is awake. Publishing at production time produced items nobody saw. The fix is to upload at production time but set the item to become public at a chosen later slot, with siblings spaced apart, so a batch does not land as a wall. It also means a produced item can sit unreleased indefinitely without any special "hold" mechanism — the slot simply has not arrived. | 공장은 기계가 한가할 때 돌고, 그때는 시청자가 깨어 있는 시간이 아닙니다. 제작 시점에 발행했더니 아무도 보지 않는 편이 나왔습니다. 해법은 제작 시점에 업로드하되 선택한 나중 슬롯에 공개되도록 설정하고, 형제 편들의 간격을 벌리는 것입니다 — 배치가 벽처럼 쏟아지지 않게. 덕분에 제작된 항목이 별도의 '보류' 장치 없이도 얼마든지 미공개로 앉아 있을 수 있습니다. 슬롯이 아직 안 왔을 뿐이니까요. |

### 3.6 Quiz

1. **en:** What does adding a new channel require in this design? · **ko:** 이 설계에서 새 채널 추가에는 무엇이 필요합니까?
   - a) A copy of the pipeline with the new tone applied / 새 톤을 적용한 파이프라인 사본
   - b) **A registry row plus a domain-colour entry; the shared stages are untouched / 레지스트리 한 줄 + 도메인 색 한 항목, 공유 단계는 무수정** ✅
   - c) A separate scheduler and a separate state store / 별도 스케줄러와 별도 상태 저장소
   - d) Nothing — channels are detected automatically / 아무것도 — 채널은 자동 감지된다

2. **en:** A variant scores very highly on hook strength but trips the risk axis. What happens? · **ko:** 한 변주가 후킹력 점수는 매우 높은데 리스크 축에 걸렸습니다. 어떻게 됩니까?
   - a) It is published with a disclaimer / 면책 문구를 붙여 발행된다
   - b) The scores are averaged and it passes / 점수가 평균되어 통과한다
   - c) **It is discarded regardless of its other scores / 다른 점수와 무관하게 폐기된다** ✅
   - d) It is downgraded to a backup variant / 백업 변주로 강등된다

3. **en:** Which variants belong in the rejection log? · **ko:** 폐기 로그에는 어떤 변주가 들어갑니까?
   - a) Every variant that was not published / 발행되지 않은 모든 변주
   - b) **Only variants the gate rejected — not passing variants that simply were not chosen / 게이트가 탈락시킨 변주만 — 통과했지만 미채택된 것은 제외** ✅
   - c) Only the selected variant, for comparison / 비교를 위해 채택된 변주만
   - d) None; the log records published items / 없다; 로그는 발행분을 기록한다

---

## 4. L3 — Story Design→Render Bridge

- **title.en:** Story Design→Render Bridge
- **title.ko:** 스토리 설계→렌더 브리지
- **intro.en:** A structure-design tool on one side, a rendering pipeline on the other, and a contract in between. This lesson follows an episode across that bridge: story gate, deterministic import, casting from a reusable library, a push of the agreed values into the renderer, and a review loop that re-renders single beats instead of whole episodes.
- **intro.ko:** 한쪽에는 구조 설계 도구, 다른 쪽에는 렌더 파이프라인, 그 사이에 계약이 있습니다. 이 레슨은 한 편이 그 다리를 건너는 과정을 따라갑니다 — 스토리 게이트, 결정적 import, 재사용 도감에서의 캐스팅, 합의된 값의 렌더러 푸시, 그리고 편 전체가 아니라 비트 하나를 다시 렌더하는 재검토 루프.

### 4.1 Nodes

| id | label.en | label.ko | kind | Role (one line) |
| :--- | :--- | :--- | :--- | :--- |
| `l3.storyline` | Storyline generation | 스토리라인 생성 | event | The adaptation is drafted as beats before anything is drawn or spoken. |
| `l3.gate` | Story gate | 스토리 게이트 | decision | Scored review of the draft, with typed criteria per story shape. |
| `l3.import` | Deterministic import | 결정적 import | event | Beats become project records with no model call involved. |
| `l3.library` | Asset and cast library | 자산·배우 라이브러리 | artifact | The reusable pool: performers, backgrounds, props, music beds. |
| `l3.match` | Reuse or create | 재사용 또는 신규 | decision | Scoped matching decides whether an existing entry fits. |
| `l3.draft` | Draft → approved | 초안 → 승인 | decision | New entries enter as drafts and need a human approval transition. |
| `l3.generate` | Generate asset | 자산 생성 | event | An approved draft is leased and rendered into a finished asset. |
| `l3.failed` | Generation failed | 생성 실패 | terminal | The row is marked failed and stays visible for retry. |
| `l3.push` | Push contract to renderer | 렌더러로 계약 푸시 | event | Agreed voices and portraits are merged into the renderer's registry. |
| `l3.render` | Render episode | 편 렌더 | event | Illustrations, speech, music and overlays into the finished episode. |
| `l3.review` | Beat review flags | 비트 재검토 플래그 | decision | Per-beat "look at this again" marks with notes. |
| `l3.rerender` | Re-render flagged beats | 플래그 비트 재렌더 | event | Only the flagged beats are regenerated, and the flag clears itself. |
| `l3.publish` | Manual publish | 수동 발행 | terminal | Release stays a human action for this pipeline. |

### 4.2 Edges

`l3.storyline` → `l3.gate` → { `l3.import` (pass) | `l3.storyline` (**rework loop**) } → `l3.library` → `l3.match` → { `l3.push` (reuse) | `l3.draft` (new) } ; `l3.draft` → `l3.generate` → { `l3.push` (ready) | `l3.failed` } ; `l3.failed` → `l3.draft` (**re-approve and retry**) ; `l3.push` → `l3.render` → `l3.review` → { `l3.publish` (clean) | `l3.rerender` (flagged) } ; `l3.rerender` → `l3.review` (**loop back**).

### 4.3 Inputs

```
inputs: {
  cast:   ["reuse", "new"],
  review: ["approved", "flagged"]
}
```
2 widgets · 2 × 2 = **4 combinations**.

- `cast` chips: the library already has a matching performer / this episode needs a performer that does not exist yet
- `review` toggle: the rendered episode passes review / one beat is flagged for rework

### 4.4 Scenarios

#### `l3.s1` — `{cast:"reuse", review:"approved"}` — the cheap path

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l3.gate` | The adaptation is drafted as beats and scored by a gate before it enters the console. The gate has typed criteria: a twist-shaped story and a quiet, chronological one are judged on different axes, so a gentle episode is not rejected merely for lacking a reversal. | 각색이 비트로 초안화되고, 콘솔에 들어가기 전에 게이트가 채점합니다. 게이트에는 유형별 기준이 있습니다 — 반전형과 잔잔한 시간순형은 서로 다른 축으로 판정되므로, 잔잔한 편이 반전이 없다는 이유만으로 탈락하지 않습니다. | `pass` |
| 2 | `l3.import` | Import is deterministic: beats become events, moods map to a fixed emotion set, hierarchy is filled in, and image prompts are backfilled — with zero model calls. Nothing about the story changes as it crosses the bridge. | import 는 결정적입니다 — 비트가 사건이 되고, 무드가 고정된 감정 집합으로 매핑되고, 계층이 채워지고, 이미지 프롬프트가 백필됩니다. 모델 호출은 0회입니다. 다리를 건너는 동안 이야기가 달라지는 일은 없습니다. | `0 model calls` |
| 3 | `l3.match` | Casting queries the library with the episode's scope. Matching is deterministic and scoped: performers registered for one setting are not offered for another, which is what keeps two unrelated works from sharing a face. | 캐스팅이 편의 스코프로 도감을 조회합니다. 매칭은 결정적이며 스코프가 걸려 있어, 한 배경에 등록된 배우가 다른 배경에 제안되지 않습니다 — 무관한 두 작품이 얼굴을 공유하지 않게 하는 장치입니다. | `scoped` |
| 4 | `l3.library` | Every performer this episode needs already exists with an approved portrait, so it creates nothing new. Reuse is the point of the library: the same character looks the same in every episode they appear in. | 이 편에 필요한 배우가 승인된 초상과 함께 이미 전부 존재하므로 새로 만드는 것이 없습니다. 재사용이 도감의 목적입니다 — 같은 인물은 등장하는 모든 편에서 같은 모습입니다. | `reuse` |
| 5 | `l3.push` | The agreed voice settings and portraits are pushed into the renderer's registry as a merge: other works' entries are preserved, and a dry-run mode exists so the merge can be inspected first. | 합의된 보이스 설정과 초상이 병합 방식으로 렌더러 레지스트리에 푸시됩니다 — 타 작품 항목은 보존되고, 병합을 미리 확인할 수 있는 dry-run 모드가 있습니다. | `merge` |
| 6 | `l3.render` | The renderer finds every character already supplied, so it generates no new character art at all. That "zero generated" number is the acceptance test for the whole library feature. | 렌더러는 모든 인물이 이미 공급된 것을 확인하고 새 인물 아트를 한 장도 만들지 않습니다. 그 "생성 0" 수치가 도감 기능 전체의 인수 기준입니다. | `0 generated` |
| 7 | `l3.review` | Review finds nothing to flag. The episode's queue state moves to rendered. | 재검토에서 플래그할 것이 없습니다. 편의 큐 상태가 렌더 완료로 이동합니다. | |
| 8 | `l3.publish` | Release is a deliberate human step in this pipeline, not an automated one. | 이 파이프라인에서 공개는 자동이 아니라 의도된 사람의 단계입니다. | `end` |

#### `l3.s2` — `{cast:"new", review:"approved"}` — the draft state machine

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l3.import` | The episode is imported deterministically, as always. | 편이 늘 그렇듯 결정적으로 import 됩니다. | `0 model calls` |
| 2 | `l3.match` | This episode is set in a period the library has never covered, so the scoped matcher correctly refuses to reuse anyone. The filter working *against* reuse is evidence that it works. | 이 편의 시대를 도감이 다뤄 본 적이 없어, 스코프 매처가 정확히 재사용을 거부합니다. 필터가 재사용을 **막는** 쪽으로 작동한 것이 필터가 제대로 동작한다는 증거입니다. | `no match` |
| 3 | `l3.draft` | New entries do not appear ready-made. A proposal engine creates them as **drafts**, and a person approves, replaces, edits, or asks for a revision. Manual creation forms were removed entirely — everything enters through the draft flow. | 새 항목은 완성된 채로 나타나지 않습니다. 제안 엔진이 이를 **초안**으로 만들고, 사람이 승인·교체·수정·보완요청을 합니다. 수동 등록 폼은 전부 폐기됐고, 모든 것이 초안 플로우로 들어옵니다. | `draft` |
| 4 | `l3.generate` | Approval moves the row into generation. Every transition is a compare-and-set, the row is leased while a worker holds it, and a uniqueness constraint on the entry's identity makes re-running the backfill idempotent. | 승인이 행을 생성 상태로 옮깁니다. 모든 전이는 compare-and-set 이고, 워커가 잡고 있는 동안 행은 리스로 묶이며, 항목 정체성에 걸린 유일성 제약이 백필 재실행을 멱등하게 만듭니다. | `leased` |
| 5 | `l3.library` | The finished asset becomes ready and takes its slot. Only ready entries are visible to the renderer, so a half-generated asset can never be picked up as a render candidate. | 완성된 자산이 ready 가 되어 슬롯을 차지합니다. 렌더러에는 ready 항목만 보이므로, 반쯤 생성된 자산이 렌더 후보로 집히는 일은 없습니다. | `ready filter` |
| 6 | `l3.push` | The new performers are pushed to the renderer alongside the reused ones. | 신규 배우가 재사용분과 함께 렌더러로 푸시됩니다. | `merge` |
| 7 | `l3.render` | The episode renders, and the new entries are now in the pool for every later episode in that setting. The cost of creating them is paid once. | 편이 렌더되고, 신규 항목은 이제 그 배경의 이후 모든 편을 위한 풀에 들어갑니다. 생성 비용은 한 번만 지불됩니다. | |
| 8 | `l3.publish` | Published by hand after review. | 검수 후 사람이 발행합니다. | `end` |

#### `l3.s3` — `{cast:"reuse", review:"flagged"}` — the targeted re-render

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l3.push` | Cast is reused from the library and pushed to the renderer. | 도감에서 캐스팅을 재사용해 렌더러로 푸시합니다. | `reuse` |
| 2 | `l3.render` | The episode renders end to end. | 편이 끝까지 렌더됩니다. | |
| 3 | `l3.review` | Reviewing the storyboard, one beat is wrong: the illustration frames a detail when the scene needs a wide shot. The reviewer ticks that beat and writes a one-line note. | 스토리보드를 검토하다 비트 하나가 잘못됐음을 발견합니다 — 장면은 와이드샷이 필요한데 삽화가 디테일을 잡았습니다. 검토자가 그 비트에 체크하고 한 줄 메모를 남깁니다. | `flagged` |
| 4 | `l3.rerender` | The re-render tool maps the flagged storyboard index to the source beat, guards the mapping by checking beat counts and speaker agreement, backs up the existing image, regenerates only that one, and writes the revised prompt back to the source. | 재렌더 도구가 플래그된 스토리보드 인덱스를 원본 비트로 매핑하고, 비트 수·화자 정합으로 매핑을 가드하고, 기존 이미지를 백업하고, 그 한 장만 다시 생성한 뒤 수정된 프롬프트를 원본에 역반영합니다. | `one beat` |
| 5 | `l3.review` | On success the flag clears itself, so the work list is derived from state rather than maintained by hand. | 성공하면 플래그가 스스로 해제되므로, 작업 목록이 손으로 관리되지 않고 상태에서 파생됩니다. | `cleared` |
| 6 | `l3.render` | Only the affected part of the episode is re-assembled. Re-rendering the whole episode for one bad frame would cost the entire illustration and music budget again. | 편에서 영향받은 부분만 다시 조립됩니다. 한 장의 잘못된 프레임 때문에 편 전체를 다시 렌더하면 삽화·음악 비용을 통째로 다시 치르게 됩니다. | |
| 7 | `l3.publish` | Reviewed again, then published by hand. | 다시 검수한 뒤 사람이 발행합니다. | `end` |

#### `l3.s4` — `{cast:"new", review:"flagged"}` — failure, quarantine, retry

| # | node | explain.en | explain.ko | badge |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `l3.draft` | The episode needs new performers, so drafts are proposed and approved. | 편에 신규 배우가 필요해 초안이 제안되고 승인됩니다. | `draft` |
| 2 | `l3.generate` | Generation starts, but the external image service is out of capacity for the period. Several rows end in failed. | 생성이 시작되지만 외부 이미지 서비스의 해당 기간 용량이 소진돼 있습니다. 여러 행이 실패로 끝납니다. | `fail` |
| 3 | `l3.failed` | Failed rows are not deleted and not silently retried. They stay visible with their state, and the console can query capacity through a status endpoint that costs nothing — probing by attempting a real generation is forbidden, because the probe itself consumes the quota. | 실패한 행은 삭제되지도, 조용히 재시도되지도 않습니다. 상태를 단 채로 남고, 콘솔은 비용 0인 상태 엔드포인트로 용량을 조회할 수 있습니다 — 실제 생성을 시도해 보는 프로빙은 금지입니다. 프로브 자체가 쿼터를 소모하기 때문입니다. | `quarantined` |
| 4 | `l3.draft` | Once capacity returns, each failed row is moved back through the normal approval transition and generated again — the same path, not a special repair path. Every previously failed row ends ready. | 용량이 돌아오면 실패한 각 행을 정상 승인 전이로 되돌려 다시 생성합니다 — 특별한 복구 경로가 아니라 같은 경로입니다. 이전에 실패했던 행이 전부 ready 로 끝납니다. | `re-approved` |
| 5 | `l3.render` | With the library complete, the episode renders. | 도감이 완성된 상태로 편이 렌더됩니다. | |
| 6 | `l3.review` | A beat is flagged, re-rendered, and cleared, exactly as in the reuse case — the review loop does not care how the assets were obtained. | 비트 하나가 플래그되고, 재렌더되고, 해제됩니다 — 재사용 사례와 정확히 동일합니다. 재검토 루프는 자산이 어떻게 조달됐는지 신경 쓰지 않습니다. | `flagged` |
| 7 | `l3.publish` | Published by hand. | 사람이 발행합니다. | `end` |

### 4.5 Decisions

| id | title.en / title.ko | body.en | body.ko |
| :--- | :--- | :--- | :--- |
| `l3.d1` | Why a reusable library / 왜 재사용 도감인가 | Regenerating a character's portrait for every episode is expensive and — worse — inconsistent: the same character drifts between episodes. Promoting performers, backgrounds, props and music beds into a shared library makes the first appearance the expensive one and every later appearance free, and makes visual continuity a property of the data rather than of prompt luck. The acceptance test is blunt: render an episode and count how many new assets the renderer created. Zero is the target. | 편마다 인물 초상을 다시 생성하는 것은 비싸고, 더 나쁘게는 일관성이 없습니다 — 같은 인물이 편 사이에서 표류합니다. 배우·배경·소품·음악 베드를 공유 도감으로 승격시키면 첫 등장만 비싸고 이후 등장은 공짜가 되며, 시각적 연속성이 프롬프트 운이 아니라 **데이터의 성질**이 됩니다. 인수 기준은 단순합니다 — 편을 렌더하고 렌더러가 새로 만든 자산 수를 센다. 목표는 0입니다. |
| `l3.d2` | Why the crossing must be deterministic / 왜 다리를 건너는 변환은 결정적이어야 하나 | The bridge between the design tool and the renderer is a translation, and a translation done by a model is a place where the story can quietly change. Making import purely mechanical — beats to events, moods to a fixed emotion set, prompts backfilled by rule, zero model calls — means the thing that was reviewed and gated is exactly the thing that gets rendered. It also makes import re-runnable and testable, which a generative step would not be. | 설계 도구와 렌더러 사이의 다리는 번역이고, 모델이 하는 번역은 이야기가 조용히 달라질 수 있는 자리입니다. import 를 순수 기계적으로(비트→사건, 무드→고정 감정 집합, 규칙 기반 프롬프트 백필, 모델 호출 0회) 만들면, 검토되고 게이트를 통과한 바로 그것이 렌더됩니다. 덤으로 import 가 재실행 가능하고 테스트 가능해집니다 — 생성 단계였다면 둘 다 불가능했을 것입니다. |
| `l3.d3` | Why the audition path must be the render path / 왜 오디션 경로가 곧 렌더 경로여야 하나 | Casting values were being chosen by eye, from numbers, and the result only became audible after a full render. Building a preview that synthesizes through a *different* code path would have been easier and useless — it would tell you about the preview, not about the output. So the preview runs the same synthesis and the same post-processing chain the renderer runs, and a contract test locks the two against drift. Measuring it also exposed the real bug: the renderer was applying a speed factor the preview never showed, so the setting being tuned had never actually reached the output. | 캐스팅 값을 숫자로 눈대중해 고르고, 결과는 풀 렌더 후에야 들렸습니다. **다른** 코드 경로로 합성하는 미리듣기를 만드는 편이 쉬웠겠지만 쓸모없었을 것입니다 — 그건 출력이 아니라 미리듣기에 대해 알려 줄 뿐이니까요. 그래서 미리듣기는 렌더러와 동일한 합성·동일한 후처리 사슬을 탑니다. 그리고 계약 테스트가 둘의 drift 를 잠급니다. 이렇게 실측하자 진짜 버그가 드러났습니다 — 렌더러가 미리듣기에 없던 속도 계수를 곱하고 있어서, 조정하던 설정이 애초에 출력에 닿은 적이 없었습니다. |
| `l3.d4` | Why review flags target beats, not episodes / 왜 재검토 플래그는 편이 아니라 비트를 겨냥하나 | "This episode needs work" is not actionable at the cost structure of a render. Attaching a flag and a note to an individual beat turns review into a work queue with a unit small enough to act on: back up the one image, regenerate the one image, write the corrected prompt back to the source, clear the flag on success. Because the flag clears itself, the list of outstanding rework is derived from state and cannot drift from reality the way a hand-kept list does. | 렌더의 비용 구조에서 "이 편 손봐야 함"은 실행 가능한 지시가 아닙니다. 개별 비트에 플래그와 메모를 붙이면 재검토가 손댈 수 있을 만큼 작은 단위의 작업 큐가 됩니다 — 그 이미지 하나 백업, 그 이미지 하나 재생성, 수정된 프롬프트를 원본에 역반영, 성공 시 플래그 해제. 플래그가 스스로 해제되므로 남은 재작업 목록이 상태에서 파생되고, 손으로 관리하는 목록처럼 현실과 어긋날 수 없습니다. |
| `l3.d5` | Why the judge cannot be the only judge / 왜 심판 하나만 두면 안 되나 | The story gate is a model scoring a model's output. Measured over repeated runs it wrote real defects into its own summary and then handed out a score that landed exactly on the passing threshold. An independent reviewer, given the same episode, called the same defects disqualifying. The lesson is structural, not about any one model: when the judge is also the player, the score drifts toward passing. The response was to keep the gate as the cheap filter and add an external comprehension check before final acceptance, and to add a machine-checkable criterion — can the causal chain be reconstructed from the script alone — that a rhetorical score could not fake. | 스토리 게이트는 모델의 산출물을 모델이 채점하는 구조입니다. 반복 실측에서 게이트는 실제 결함을 자기 총평에 써 놓고는 통과 하한에 정확히 걸치는 점수를 줬습니다. 같은 편을 받은 독립 검토자는 그 결함들을 탈락 사유로 판정했습니다. 교훈은 특정 모델이 아니라 구조에 관한 것입니다 — **심판이 선수를 겸하면 점수는 통과 쪽으로 표류합니다**. 대응은 게이트를 값싼 필터로 유지하되 최종 채택 전에 외부 이해도 확인을 추가하고, 수사로 속일 수 없는 기계 판정 기준(대본만으로 인과 사슬을 복원할 수 있는가)을 도입하는 것이었습니다. |

### 4.6 Quiz

1. **en:** Why does the design-to-render import make zero model calls? · **ko:** 설계→렌더 import 는 왜 모델 호출을 0회로 합니까?
   - a) Because model calls are unavailable at that stage / 그 단계에서는 모델 호출이 불가능해서
   - b) **So the thing that was reviewed and gated is exactly the thing that gets rendered / 검토·게이트를 통과한 바로 그것이 렌더되도록** ✅
   - c) Because the renderer generates the text itself / 렌더러가 텍스트를 직접 생성해서
   - d) To keep the import under a time limit / import 를 시간 제한 안에 두려고

2. **en:** What is the acceptance test for the reusable asset library? · **ko:** 재사용 자산 도감의 인수 기준은 무엇입니까?
   - a) That every character has a portrait / 모든 인물이 초상을 가진다
   - b) That the library has more than N entries / 도감 항목이 N개를 넘는다
   - c) **That rendering an episode creates zero new character assets / 편을 렌더할 때 새 인물 자산이 0건 생성된다** ✅
   - d) That the render finishes faster than before / 렌더가 전보다 빨라진다

3. **en:** A gate implemented as a model scoring another model's output was observed to do what? · **ko:** 모델이 모델의 산출물을 채점하는 게이트는 무엇을 하는 것으로 관측됐습니까?
   - a) Reject nearly everything / 거의 전부를 거부한다
   - b) **Describe the real defects and still score exactly at the passing threshold / 실제 결함을 서술하면서도 점수는 통과 하한에 정확히 맞춘다** ✅
   - c) Score identically on every run / 매 실행 동일한 점수를 준다
   - d) Refuse to score its own output / 자기 산출물 채점을 거부한다

---

## 5. Totals

| Lesson | Nodes | Widgets | Combinations | Scenarios | Steps | Decisions | Quiz |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| L0 Common Foundations | 11 | 2 | 4 | 4 | 26 | 4 | 3 |
| L1 Audiobook Factory | 13 | 2 | 6 | 6 | 34 | 5 | 3 |
| L2 Multi-channel Content Hub | 14 | 2 | 4 | 4 | 28 | 5 | 3 |
| L3 Story Design→Render Bridge | 13 | 2 | 4 | 4 | 30 | 5 | 3 |
| **Total** | **51** | — | **18** | **18** | **118** | **19** | **12** |

Every combination has exactly one scenario. No lesson exceeds 2 widgets or 8 combinations. Every pipeline lesson (L1, L2, L3) contains at least one scenario ending in a failure branch, and L0 devotes one of its two widgets to the failure branch.
