/**
 * L0 — Common Foundations. Transcribed from docs/CONTENT-SPEC.md §1.
 * The spec is the source of truth for every string in this file.
 */

import { l0Scenarios } from './l0_foundations_scenarios.js';

const H = 56;

export const l0 = {
  id: 'l0-foundations',
  minutes: 5,
  asOf: '2026-08',
  title: { en: 'Common Foundations', ko: '공통 기반 구조' },
  intro: {
    en: 'Three different content pipelines, built for three different purposes, converged on the same skeleton: a scheduled trigger pulls one item from a queue, produces something, gates it, renders it, queues it for publishing, and reports the run. This lesson is that skeleton — and what happens when the gate says no.',
    ko: '목적이 서로 다른 세 개의 콘텐츠 파이프라인이 결국 같은 뼈대로 수렴했습니다 — 예약 실행이 큐에서 한 건을 꺼내고, 무언가를 생산하고, 게이트를 통과시키고, 렌더하고, 발행 큐에 넣고, 실행 결과를 보고합니다. 이 레슨은 그 뼈대와, 게이트가 거부했을 때 벌어지는 일을 다룹니다.',
  },

  diagram: {
    nodes: [
      { id: 'l0.schedule', role: 'event', x: 0, y: 0, h: H, label: { en: 'Scheduled trigger', ko: '예약 실행' } },
      { id: 'l0.queue', role: 'artifact', x: 280, y: 0, h: H, label: { en: 'Inventory queue', ko: '재고 큐' } },
      { id: 'l0.claim', role: 'decision', x: 560, y: 0, h: H, label: { en: 'Claim one item', ko: '한 건 클레임' } },
      { id: 'l0.produce', role: 'event', x: 840, y: 0, h: H, label: { en: 'Produce', ko: '생산' } },
      { id: 'l0.cache', role: 'artifact', x: 1120, y: 0, h: H, label: { en: 'Stage cache', ko: '단계 캐시' } },
      { id: 'l0.gate', role: 'gate', x: 1120, y: 150, h: H, label: { en: 'Quality gate', ko: '품질 게이트' } },
      { id: 'l0.quarantine', role: 'decision', x: 780, y: 150, h: H, label: { en: 'Quarantine and retry', ko: '격리·재시도' } },
      { id: 'l0.render', role: 'event', x: 1120, y: 300, h: H, label: { en: 'Render', ko: '렌더' } },
      { id: 'l0.publish', role: 'artifact', x: 840, y: 300, h: H, label: { en: 'Publish queue', ko: '발행 큐' } },
      { id: 'l0.report', role: 'artifact', x: 460, y: 300, h: H, label: { en: 'Run report', ko: '실행 리포트' } },
      { id: 'l0.done', role: 'terminal', x: 140, y: 300, h: H, label: { en: 'Run ends', ko: '실행 종료' } },
    ],
    edges: [
      { from: 'l0.schedule', to: 'l0.queue', label: { en: 'wakes up', ko: '기상' } },
      { from: 'l0.queue', to: 'l0.claim', label: { en: 'one item', ko: '한 건씩' } },
      { from: 'l0.claim', to: 'l0.produce', label: { en: 'claimed', ko: '클레임' } },
      { from: 'l0.claim', to: 'l0.report', label: { en: 'queue empty', ko: '큐가 빔' } },
      { from: 'l0.produce', to: 'l0.cache', label: { en: 'writes', ko: '기록' } },
      { from: 'l0.cache', to: 'l0.gate' },
      { from: 'l0.gate', to: 'l0.render', label: { en: 'pass', ko: '통과' } },
      { from: 'l0.gate', to: 'l0.quarantine', label: { en: 'fail', ko: '거부' } },
      { from: 'l0.quarantine', to: 'l0.queue', bow: 80, label: { en: 'requeue', ko: '큐로 반환' } },
      { from: 'l0.quarantine', to: 'l0.report', label: { en: 'exhausted', ko: '소진' } },
      { from: 'l0.render', to: 'l0.publish' },
      { from: 'l0.publish', to: 'l0.report' },
      { from: 'l0.report', to: 'l0.done' },
    ],
  },

  inputs: {
    gate: ['pass', 'fail'],
    queue: ['stocked', 'empty'],
  },

  widgets: {
    gate: {
      type: 'toggle',
      label: { en: 'Quality gate', ko: '품질 게이트' },
      valueLabels: {
        pass: { en: 'clears the thresholds', ko: '임계값 통과' },
        fail: { en: 'rejects the candidate', ko: '후보물 거부' },
      },
    },
    queue: {
      type: 'toggle',
      label: { en: 'Inventory queue', ko: '재고 큐' },
      valueLabels: {
        stocked: { en: 'has work', ko: '작업 있음' },
        empty: { en: 'drained', ko: '고갈됨' },
      },
    },
  },

  scenarios: l0Scenarios,

  decisions: [
    {
      id: 'l0.d1',
      title: { en: 'Why an inventory queue', ko: '왜 재고 큐인가' },
      body: {
        en: 'Generating on demand ties output to the moment of demand, and the model call is the slowest, least reliable step in the chain. Stocking finished or half-finished work in a durable queue decouples the two: production can run whenever capacity exists, publishing can run on its own rhythm, and a bad production night costs a slot rather than a missed release. The queue is also the only place where "we are running out" is visible early enough to act on.',
        ko: '즉석 생성은 산출을 수요 시점에 묶어 버리는데, 모델 호출은 사슬에서 가장 느리고 가장 덜 미더운 단계입니다. 완성물·반완성물을 지속성 있는 큐에 재고로 쌓아 두면 둘이 분리됩니다 — 생산은 여유가 있을 때 돌고, 발행은 자기 리듬으로 돌며, 제작이 망한 밤의 대가는 놓친 공개가 아니라 슬롯 하나입니다. 또한 "재고가 떨어져 간다"를 손쓸 수 있을 만큼 일찍 보여 주는 자리도 큐뿐입니다.',
      },
    },
    {
      id: 'l0.d2',
      title: { en: 'Why the gate sits before the render', ko: '왜 게이트를 렌더 앞에 두나' },
      body: {
        en: 'Rendering is where the minutes and the money go: image generation, speech synthesis, and muxing all run per item. Judging text is cheap and judging a finished video is not, so the gate is placed at the last point where rejection is still free. The consequence is that rejection has to be a first-class normal outcome — a run may legitimately produce nothing — rather than an exception path bolted on later.',
        ko: '렌더는 분과 비용이 나가는 자리입니다 — 이미지 생성·음성 합성·먹싱이 전부 건당으로 돌아갑니다. 텍스트를 판정하는 것은 싸고 완성된 영상을 판정하는 것은 싸지 않으므로, 게이트는 거부가 아직 공짜인 마지막 지점에 놓입니다. 그 결과 거부는 나중에 덧붙인 예외 경로가 아니라 정상 결과여야 합니다 — 실행이 아무것도 못 만드는 것이 정당한 일이 됩니다.',
      },
    },
    {
      id: 'l0.d3',
      title: { en: 'Why every run reports', ko: '왜 모든 실행이 보고하나' },
      body: {
        en: 'An unattended job that only speaks when it fails is indistinguishable from an unattended job that stopped being scheduled at all. Wrapping every scheduled job in one reporter that fires on both exit paths — success and failure, with the tail of the log attached on failure — turns "did it run?" into a question the operator never has to ask. The wrapper also has to be fail-safe: if the notifier is down, the job\'s own behaviour and exit code must not change.',
        ko: '실패할 때만 말하는 무인 잡은, 아예 스케줄에서 빠져 버린 무인 잡과 구별되지 않습니다. 모든 예약 잡을 하나의 리포터로 감싸 성공·실패 양쪽 종료 경로에서 발화시키면(실패 시 로그 끝부분 첨부) "돌긴 돌았나?"라는 질문 자체가 사라집니다. 이 래퍼는 fail-safe 여야 합니다 — 알림이 죽어 있어도 잡 자체의 동작과 종료코드는 변하지 않아야 합니다.',
      },
    },
    {
      id: 'l0.d4',
      title: { en: 'Why partial output is kept, not deleted', ko: '왜 중단 산출물을 지우지 않나' },
      body: {
        en: 'When a long render dies halfway, the instinct is to clean up. That is exactly wrong: each stage writes its output to a per-item directory, and the renderer treats existing files as cache and continues from where it stopped. Deleting means re-paying for every model call and every synthesized second already produced. The rule is therefore "do not delete, just run it again", with a full wipe reserved for the case where you actually want regeneration.',
        ko: '긴 렌더가 중간에 죽으면 치우고 싶어집니다. 정확히 반대로 해야 합니다 — 각 단계는 항목별 디렉터리에 산출물을 쓰고, 렌더러는 기존 파일을 캐시로 인정해 멈춘 자리에서 이어 만듭니다. 지운다는 것은 이미 끝난 모든 모델 호출과 합성된 모든 초를 다시 결제한다는 뜻입니다. 그래서 규칙은 "지우지 말고 다시 실행"이며, 통째 삭제는 정말로 재생성을 원할 때만 씁니다.',
      },
    },
  ],

  quiz: [
    {
      q: {
        en: 'Why does the quality gate run before the render stage rather than after it?',
        ko: '품질 게이트는 왜 렌더 뒤가 아니라 앞에서 실행됩니까?',
      },
      choices: [
        { en: 'Because the render can only accept approved file formats', ko: '렌더가 승인된 파일 형식만 받기 때문' },
        { en: 'Because the render is the expensive stage, so rejection must stay free', ko: '렌더가 비싼 단계라 거부가 공짜인 채로 남아야 하기 때문' },
        { en: 'Because the gate needs the rendered video to score it', ko: '게이트가 채점하려면 렌더된 영상이 필요하기 때문' },
        { en: 'Because the publish queue rejects unrendered items', ko: '발행 큐가 렌더 안 된 항목을 거부하기 때문' },
      ],
      answer: 1,
    },
    {
      q: {
        en: 'A scheduled run finds its inventory queue empty. What does the skeleton do?',
        ko: '예약 실행이 재고 큐가 빈 것을 발견했습니다. 이 뼈대는 어떻게 동작합니까?',
      },
      choices: [
        { en: 'It fails the run so the operator is alerted by the error', ko: '실행을 실패로 처리해 오류로 알린다' },
        { en: 'It generates a new source item to fill the gap', ko: '빈자리를 채울 새 소스 항목을 생성한다' },
        { en: 'It does nothing, and still reports that there was nothing to do', ko: '아무것도 하지 않고, 할 일이 없었다는 사실을 그래도 보고한다' },
        { en: 'It re-renders the most recent published item', ko: '가장 최근 발행분을 다시 렌더한다' },
      ],
      answer: 2,
    },
    {
      q: {
        en: 'A long render is interrupted halfway. What is the default recovery?',
        ko: '긴 렌더가 중간에 중단됐습니다. 기본 복구 방법은 무엇입니까?',
      },
      choices: [
        { en: 'Delete the partial output directory and start clean', ko: '부분 산출물 디렉터리를 지우고 처음부터' },
        { en: 'Leave the partial output in place and run it again, so finished stages are reused as cache', ko: '부분 산출물을 그대로 두고 다시 실행해 끝난 단계를 캐시로 재사용한다' },
        { en: 'Publish whatever was finished', ko: '완성된 만큼만 발행한다' },
        { en: 'Move the item to the rejection log', ko: '항목을 폐기 로그로 옮긴다' },
      ],
      answer: 1,
    },
  ],
};

export default l0;
