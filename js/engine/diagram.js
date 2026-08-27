/**
 * Diagram renderer: lesson.diagram -> SVG.
 *
 * Nodes are rounded rects placed by the coordinates in the data, styled by
 * `role` — the P&ID reading is that `gate` nodes are valves, `artifact` nodes
 * are vessels, and edges are pipe runs. Nodes that carry `group: [ids]` are
 * drawn as a cluster box around their members, which is how a lesson
 * expresses "these belong together with no order among them" — highlighting
 * the cluster highlights every member at once.
 *
 * Accessibility today: the SVG is one labelled image, and the explanation
 * panel is the live region that announces each step — a screen reader follows
 * the lesson through the panel, not the picture. v1.1 roadmap: give every node
 * its own accessible name and describe the active step's incoming edge in the
 * live region, so the flow itself is navigable rather than only narrated.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author). Fixes made there should be reconciled with this copy.
 */

import { pickText } from './locale.js';
import { t } from '../ui-text.js';
import { edgeKey, normalizeEdgeRef } from './schema-refs.js';
import { layoutNodes, viewBoxOf, edgePoints, roundedPath } from './diagram-layout.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null) node.setAttribute(key, String(value));
  }
  if (parent) parent.appendChild(node);
  return node;
}

function defs(root) {
  const box = svgEl('defs', {}, root);
  for (const [id, cls] of [['arrow', 'arrowhead'], ['arrow-hot', 'arrowhead arrowhead--hot']]) {
    const marker = svgEl('marker', {
      id, class: cls, viewBox: '0 0 10 10', refX: 9, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse',
    }, box);
    svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z' }, marker);
  }
}

function drawLabel(parent, lines, cx, cy, cls) {
  const text = svgEl('text', { x: cx, y: cy, class: cls, 'text-anchor': 'middle' }, parent);
  const start = cy - ((lines.length - 1) * 17) / 2;
  lines.forEach((line, i) => {
    const span = svgEl('tspan', { x: cx, y: start + i * 17 }, text);
    span.textContent = line;
  });
  return text;
}

function drawCluster(layer, rect) {
  const group = svgEl('g', { class: 'cluster', 'data-node': rect.id }, layer);
  svgEl('rect', {
    class: 'cluster-box', x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: 16,
  }, group);
  const label = svgEl('text', { class: 'cluster-label', x: rect.x + 14, y: rect.y + 20 }, group);
  label.textContent = rect.lines.join(' ');
  return group;
}

function drawNode(layer, rect) {
  const role = rect.node.role || rect.node.kind || 'event';
  const group = svgEl('g', { class: `node node--${role}`, 'data-node': rect.id, 'data-role': role }, layer);
  svgEl('rect', {
    class: 'node-box', x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: 11,
  }, group);
  drawLabel(group, rect.lines, rect.x + rect.w / 2, rect.y + rect.h / 2, 'node-label');
  return group;
}

/** Route every edge up front: the viewBox needs the points before drawing. */
function routeEdges(edges, rects) {
  const routed = [];
  for (const edge of edges || []) {
    const ref = normalizeEdgeRef(edge);
    if (!ref) continue;
    const a = rects.get(ref.from);
    const b = rects.get(ref.to);
    if (!a || !b) continue;
    routed.push({ edge, key: edgeKey(ref.from, ref.to), geo: edgePoints(a, b, edge) });
  }
  return routed;
}

function drawEdge(layer, { edge, key, geo }, locale) {
  const group = svgEl('g', { class: 'edge', 'data-edge': key }, layer);
  svgEl('path', {
    class: 'edge-line', d: roundedPath(geo.points), 'marker-end': 'url(#arrow)',
  }, group);
  const labelText = pickText(edge.label, locale);
  if (labelText) {
    const label = svgEl('text', {
      class: 'edge-label', x: geo.mid.x, y: geo.mid.y - 10, 'text-anchor': 'middle',
    }, group);
    label.textContent = labelText;
  }
  return group;
}

/**
 * Mount a diagram into `container`.
 * @returns controller with setLocale / setActive / pulse / clear
 */
export function createDiagram(container, diagram, locale = 'en') {
  let current = locale;
  let activeIds = [];
  let pulseRef = null;
  let nodeEls = new Map();
  let edgeEls = new Map();
  let clusterOf = new Map();

  function render() {
    container.textContent = '';
    const rects = layoutNodes(diagram.nodes, current, pickText);
    const routed = routeEdges(diagram.edges, rects);
    const box = viewBoxOf(rects, routed.flatMap((r) => [...r.geo.points, r.geo.mid]));
    const root = svgEl('svg', {
      class: 'diagram',
      viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': t('diagramLabel', current),
    }, container);
    defs(root);
    const clusterLayer = svgEl('g', { class: 'layer-clusters' }, root);
    const edgeLayer = svgEl('g', { class: 'layer-edges' }, root);
    const nodeLayer = svgEl('g', { class: 'layer-nodes' }, root);

    nodeEls = new Map();
    edgeEls = new Map();
    clusterOf = new Map();
    for (const rect of rects.values()) {
      if (!rect.isCluster) continue;
      nodeEls.set(rect.id, drawCluster(clusterLayer, rect));
      for (const member of rect.node.group) clusterOf.set(member, rect.id);
    }
    for (const item of routed) {
      edgeEls.set(item.key, drawEdge(edgeLayer, item, current));
    }
    for (const rect of rects.values()) {
      if (rect.isCluster) continue;
      nodeEls.set(rect.id, drawNode(nodeLayer, rect));
    }
    applyActive();
    applyPulse();
  }

  function expand(ids) {
    const out = new Set();
    for (const id of ids) {
      out.add(id);
      const node = diagram.nodes.find((n) => n.id === id);
      if (node && Array.isArray(node.group)) for (const member of node.group) out.add(member);
      const parent = clusterOf.get(id);
      if (parent) out.add(parent);
    }
    return out;
  }

  function applyActive() {
    const wanted = expand(activeIds);
    for (const [id, group] of nodeEls) {
      group.classList.toggle('is-active', wanted.has(id));
      group.classList.toggle('is-idle', wanted.size > 0 && !wanted.has(id));
    }
  }

  function applyPulse() {
    for (const group of edgeEls.values()) {
      const on = pulseRef != null && group.dataset.edge === pulseRef;
      group.classList.toggle('is-pulse', on);
      const line = group.querySelector('.edge-line');
      if (line) line.setAttribute('marker-end', on ? 'url(#arrow-hot)' : 'url(#arrow)');
    }
  }

  render();

  return {
    get container() { return container; },
    setLocale(next) {
      if (next === current) return;
      current = next;
      render();
    },
    setActive(ids) {
      activeIds = Array.isArray(ids) ? ids : [ids].filter(Boolean);
      applyActive();
    },
    pulse(edge) {
      const ref = normalizeEdgeRef(edge);
      pulseRef = ref ? edgeKey(ref.from, ref.to) : null;
      applyPulse();
    },
    clear() {
      activeIds = [];
      pulseRef = null;
      applyActive();
      applyPulse();
    },
  };
}
