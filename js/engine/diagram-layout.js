/**
 * Geometry and text helpers for the diagram renderer.
 * Pure math on plain objects — no DOM, so it stays testable and cheap.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author). Fixes made there should be reconciled with this copy.
 */

export const NODE_W = 190;
export const LINE_H = 17;
export const PAD_Y = 15;
export const MIN_H = 48;
export const CLUSTER_PAD = 18;
export const CLUSTER_HEAD = 22;

/** Rough advance width: CJK and full-width glyphs take about twice a latin one. */
export function estimateWidth(text, size) {
  let units = 0;
  for (const ch of text) units += /[ᄀ-ᇿ⺀-꓏가-힣豈-﫿＀-｠]/.test(ch) ? 1 : 0.54;
  return units * size;
}

/** Greedy word wrap into at most `maxLines` lines that fit `width`. */
export function wrapLabel(text, width, size = 13, maxLines = 3) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && estimateWidth(candidate, size) > width) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && line && lines[maxLines - 1] !== line) {
    lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
  }
  return lines.length ? lines : [''];
}

function plainRect(node, lines) {
  const w = Number.isFinite(node.w) ? node.w : NODE_W;
  const h = Number.isFinite(node.h) ? node.h : Math.max(MIN_H, lines.length * LINE_H + PAD_Y * 2);
  return { id: node.id, x: node.x, y: node.y, w, h, node, lines };
}

/**
 * Compute a rect for every node. Cluster nodes (those carrying `group`) are
 * sized to contain their members rather than to their own width.
 * @returns {Map<string, object>}
 */
export function layoutNodes(nodes, locale, labelOf) {
  const rects = new Map();
  for (const node of nodes) {
    const w = Number.isFinite(node.w) ? node.w : NODE_W;
    const lines = wrapLabel(labelOf(node.label, locale), w - 26);
    rects.set(node.id, plainRect(node, lines));
  }
  for (const node of nodes) {
    if (!Array.isArray(node.group) || node.group.length === 0) continue;
    const members = node.group.map((id) => rects.get(id)).filter(Boolean);
    if (!members.length) continue;
    const x = Math.min(...members.map((m) => m.x)) - CLUSTER_PAD;
    const y = Math.min(...members.map((m) => m.y)) - CLUSTER_PAD - CLUSTER_HEAD;
    const right = Math.max(...members.map((m) => m.x + m.w)) + CLUSTER_PAD;
    const bottom = Math.max(...members.map((m) => m.y + m.h)) + CLUSTER_PAD;
    const rect = rects.get(node.id);
    Object.assign(rect, { x, y, w: right - x, h: bottom - y, isCluster: true });
    rect.lines = wrapLabel(labelOf(node.label, locale), rect.w - 26, 12, 1);
  }
  return rects;
}

/**
 * Bounding box covering every rect and every extra point (edge routing runs
 * outside the node bounds, so those points must be included or the loop-back
 * traces get clipped), padded by `margin`.
 */
export function viewBoxOf(rects, points = [], margin = 26) {
  const list = [...rects.values()];
  if (!list.length) return { x: 0, y: 0, w: 100, h: 100 };
  const xs = list.flatMap((r) => [r.x, r.x + r.w]).concat(points.map((p) => p.x));
  const ys = list.flatMap((r) => [r.y, r.y + r.h]).concat(points.map((p) => p.y));
  const x = Math.min(...xs) - margin;
  const y = Math.min(...ys) - margin;
  return { x, y, w: Math.max(...xs) + margin - x, h: Math.max(...ys) + margin - y };
}

/**
 * Where to hang an edge label: the midpoint of the longest horizontal run,
 * preferring the run nearest the target. Labels are horizontal text, so a
 * horizontal run always beats a longer vertical one.
 */
export function labelPoint(points) {
  let best = null;
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const score = (dx > dy ? 10000 : 0) + Math.hypot(dx, dy);
    if (!best || score >= best.score) {
      best = { score, x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    }
  }
  return best ? { x: best.x, y: best.y } : points[0];
}

const withLabel = (points) => ({ points, mid: labelPoint(points) });

/**
 * Port points and corner points for one edge, plus its label anchor.
 * `edge.bow` routes the edge out of the bottom (positive) or top (negative)
 * of both nodes and around them — used for loop-back arrows.
 */
export function edgePoints(a, b, edge = {}) {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  if (Number.isFinite(edge.bow) && edge.bow !== 0) {
    const down = edge.bow > 0;
    const p1 = { x: acx, y: down ? a.y + a.h : a.y };
    const p2 = { x: bcx, y: down ? b.y + b.h : b.y };
    const lane = (down ? Math.max(p1.y, p2.y) : Math.min(p1.y, p2.y)) + edge.bow;
    return withLabel([p1, { x: p1.x, y: lane }, { x: p2.x, y: lane }, p2]);
  }
  const dx = bcx - acx;
  const dy = bcy - acy;
  const horizontal = edge.axis ? edge.axis === 'h' : Math.abs(dx) >= Math.abs(dy);
  if (horizontal) {
    const p1 = { x: dx >= 0 ? a.x + a.w : a.x, y: acy };
    const p2 = { x: dx >= 0 ? b.x : b.x + b.w, y: bcy };
    if (Math.abs(dy) < 5) return withLabel([p1, { x: p2.x, y: p1.y }]);
    const mx = (p1.x + p2.x) / 2;
    return withLabel([p1, { x: mx, y: p1.y }, { x: mx, y: p2.y }, p2]);
  }
  const p1 = { x: acx, y: dy >= 0 ? a.y + a.h : a.y };
  const p2 = { x: bcx, y: dy >= 0 ? b.y : b.y + b.h };
  if (Math.abs(dx) < 5) return withLabel([p1, { x: p1.x, y: p2.y }]);
  const my = (p1.y + p2.y) / 2;
  return withLabel([p1, { x: p1.x, y: my }, { x: p2.x, y: my }, p2]);
}

const len = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

/** An SVG path string through `points` with rounded corners. */
export function roundedPath(points, radius = 12) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];
    const r = Math.min(radius, len(prev, corner) / 2, len(corner, next) / 2);
    const inX = corner.x - Math.sign(corner.x - prev.x) * r;
    const inY = corner.y - Math.sign(corner.y - prev.y) * r;
    const outX = corner.x + Math.sign(next.x - corner.x) * r;
    const outY = corner.y + Math.sign(next.y - corner.y) * r;
    d += ` L ${inX} ${inY} Q ${corner.x} ${corner.y} ${outX} ${outY}`;
  }
  const end = points[points.length - 1];
  return `${d} L ${end.x} ${end.y}`;
}
