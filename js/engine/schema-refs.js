/**
 * Diagram-side schema checks: node/edge shape, cluster membership, and the
 * reference integrity of scenario steps. Split out of schema.js to keep both
 * files small. Pure functions — no DOM.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author). Error codes are kept identical to that source so a fix on
 * either side reads the same. Fixes made there should be reconciled here.
 */

import { isLocalized } from './locale.js';

export const BADGE_TONES = ['neutral', 'blocked', 'allowed', 'warn'];

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';

/** Canonical key for an edge, used for lookup and duplicate detection. */
export function edgeKey(from, to) {
  return `${from}->${to}`;
}

/** Accept an edge reference as `{from, to}` or as the string `"from->to"`. */
export function normalizeEdgeRef(ref) {
  if (typeof ref === 'string') {
    const at = ref.indexOf('->');
    if (at < 0) return null;
    const from = ref.slice(0, at).trim();
    const to = ref.slice(at + 2).trim();
    return from && to ? { from, to } : null;
  }
  if (ref && typeof ref === 'object' && typeof ref.from === 'string' && typeof ref.to === 'string') {
    return { from: ref.from, to: ref.to };
  }
  return null;
}

function checkNodes(nodes, nodeIds, err) {
  for (const node of nodes) {
    if (!isObj(node) || !isText(node.id)) {
      err.push('E_NODE_ID: every diagram node needs a non-empty id');
      continue;
    }
    if (nodeIds.has(node.id)) err.push(`E_NODE_ID: duplicate node id "${node.id}"`);
    nodeIds.add(node.id);
    if (!isLocalized(node.label)) err.push(`E_LOCALE: node "${node.id}" label needs both en and ko`);
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      err.push(`E_SHAPE: node "${node.id}" needs numeric x and y`);
    }
  }
}

function checkClusters(nodes, nodeIds, err) {
  for (const node of nodes) {
    if (!isObj(node) || node.group == null) continue;
    if (!Array.isArray(node.group) || node.group.length === 0) {
      err.push(`E_CLUSTER: node "${node.id}" group must be a non-empty array of node ids`);
      continue;
    }
    for (const member of node.group) {
      if (!nodeIds.has(member)) err.push(`E_CLUSTER: node "${node.id}" groups unknown node "${member}"`);
      if (member === node.id) err.push(`E_CLUSTER: node "${node.id}" cannot group itself`);
    }
  }
}

function checkEdges(edges, nodeIds, edgeKeys, err) {
  for (const edge of edges) {
    const ref = normalizeEdgeRef(edge);
    if (!ref) {
      err.push('E_EDGE_REF: every edge needs from and to');
      continue;
    }
    if (!nodeIds.has(ref.from)) err.push(`E_EDGE_REF: edge from unknown node "${ref.from}"`);
    if (!nodeIds.has(ref.to)) err.push(`E_EDGE_REF: edge to unknown node "${ref.to}"`);
    if (ref.from === ref.to) err.push(`E_EDGE_REF: edge "${ref.from}" points at itself`);
    const key = edgeKey(ref.from, ref.to);
    if (edgeKeys.has(key)) err.push(`E_EDGE_REF: duplicate edge "${key}"`);
    edgeKeys.add(key);
    if (edge.label != null && !isText(edge.label) && !isLocalized(edge.label)) {
      err.push(`E_LOCALE: edge "${key}" label must be a string or carry both en and ko`);
    }
  }
}

/**
 * Validate `lesson.diagram` and collect the id sets that step checks need.
 * @returns {{nodeIds: Set<string>, edgeKeys: Set<string>}}
 */
export function checkDiagram(lesson, err) {
  const nodeIds = new Set();
  const edgeKeys = new Set();
  const diagram = lesson.diagram;
  if (!isObj(diagram) || !Array.isArray(diagram.nodes) || diagram.nodes.length === 0) {
    err.push('E_SHAPE: lesson.diagram.nodes must be a non-empty array');
    return { nodeIds, edgeKeys };
  }
  checkNodes(diagram.nodes, nodeIds, err);
  checkClusters(diagram.nodes, nodeIds, err);
  if (!Array.isArray(diagram.edges)) {
    err.push('E_SHAPE: lesson.diagram.edges must be an array');
    return { nodeIds, edgeKeys };
  }
  checkEdges(diagram.edges, nodeIds, edgeKeys, err);
  return { nodeIds, edgeKeys };
}

function checkBadge(badge, where, err) {
  if (isObj(badge)) {
    if (!isLocalized(badge)) err.push(`E_LOCALE: ${where} badge needs both en and ko`);
    if (badge.tone != null && !BADGE_TONES.includes(badge.tone)) {
      err.push(`E_SCENARIO: ${where} badge tone must be one of ${BADGE_TONES.join(', ')}`);
    }
  } else if (!isText(badge)) {
    err.push(`E_SCENARIO: ${where} badge must be a string or a localized object`);
  }
}

/** Validate one scenario step against the diagram's node and edge ids. */
export function checkStep(scenarioId, index, step, refs, err) {
  const where = `scenario "${scenarioId}" step ${index + 1}`;
  if (!isObj(step)) {
    err.push(`E_SCENARIO: ${where} must be an object`);
    return;
  }
  if (!isText(step.node)) err.push(`E_NODE_REF: ${where} needs a node id`);
  else if (!refs.nodeIds.has(step.node)) {
    err.push(`E_NODE_REF: ${where} points at unknown node "${step.node}"`);
  }
  if (!isLocalized(step.explain)) err.push(`E_LOCALE: ${where} explain needs both en and ko`);
  if (step.edge != null) {
    const ref = normalizeEdgeRef(step.edge);
    if (!ref) err.push(`E_EDGE_REF: ${where} edge must be {from, to} or "from->to"`);
    else if (!refs.edgeKeys.has(edgeKey(ref.from, ref.to))) {
      err.push(`E_EDGE_REF: ${where} points at unknown edge "${edgeKey(ref.from, ref.to)}"`);
    }
  }
  if (step.badge != null) checkBadge(step.badge, where, err);
}
