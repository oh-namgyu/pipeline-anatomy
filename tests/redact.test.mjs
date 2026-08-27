/**
 * Redact gate — the second line of defence, run in CI on every commit.
 *
 * This project is generalized from real production systems. Two checks keep it
 * that way:
 *
 *   1. Shape patterns. Filesystem paths, port numbers, account handles, wall
 *      clock times and absolute URLs are all things the generalized model has
 *      no reason to contain, so any of them is a finding. This half needs no
 *      secret and runs everywhere, including forks.
 *   2. A salted-HMAC denylist. The private substitution table is compared
 *      against every token in the tree without the table being published; see
 *      scripts/redact-hmac.mjs. Without REDACT_SALT the comparison is
 *      impossible, so this half skips loudly rather than passing quietly.
 *
 * Binaries are scanned by filename only — text inside an image is not
 * detectable here, and is covered instead by the rule that every committed
 * screenshot must come from a committed capture script.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, basename } from 'node:path';

import {
  normalizeText, tokenCandidates, hmacOf, parseDenylist, decodeHmac, groupHex, chooseGrouping,
} from '../scripts/redact-hmac.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HMAC_FILE = join(ROOT, 'tests', 'redact-hmac.json');

const TEXT_SUFFIXES = new Set([
  '.md', '.txt', '.html', '.css', '.js', '.mjs', '.cjs', '.json', '.yml', '.yaml',
  '.toml', '.py', '.sh', '.svg', '.xml', '.example', '.lock', '.csv', '.tsv',
]);
const TEXT_NAMES = new Set(['.gitignore', '.vercelignore', 'LICENSE', 'Dockerfile']);

/**
 * Rules are deliberately blunt: they describe shapes, never specific names, so
 * this file can be read by anyone without telling them what was redacted.
 */
const RULES = [
  { id: 'home-path', re: /\/Users\//g },
  { id: 'workspace-path', re: /~\/programs/g },
  { id: 'port', re: /:[0-9]{4}(?![0-9])/g },
  { id: 'clock-time', re: /\b[0-9]{1,2}:[0-9]{2}\b/g },
  { id: 'handle', re: /@[a-z0-9_]{3,}/gi },
  { id: 'external-url', re: /\bhttps?:\/\/[^\s"'`)<>\]]+/gi },
];

/** Package scopes and at-rules that are part of the toolchain, not identities. */
const ALLOWED_HANDLES = new Set([
  '@playwright', '@anthropic',
  '@media', '@keyframes', '@supports', '@import', '@charset', '@page', '@font',
  '@param', '@returns', '@return', '@type', '@typedef', '@property', '@example',
  '@see', '@throws', '@deprecated', '@author', '@license', '@module', '@ignore',
]);

/** The only absolute URLs a static, self-contained app legitimately carries. */
const ALLOWED_URL_PREFIXES = [
  'http://www.w3.org/',
  'http://localhost',
  'https://registry.npmjs.org/',
];

function isAllowed(ruleId, match) {
  const value = match.toLowerCase();
  if (ruleId === 'handle') return ALLOWED_HANDLES.has(value);
  if (ruleId === 'external-url') return ALLOWED_URL_PREFIXES.some((p) => value.startsWith(p));
  return false;
}

/** Every file git tracks, relative to the repo root. */
function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

function isTextFile(rel) {
  if (TEXT_NAMES.has(basename(rel)) || TEXT_SUFFIXES.has(extname(rel).toLowerCase())) return true;
  try {
    return !readFileSync(join(ROOT, rel)).subarray(0, 2048).includes(0);
  } catch {
    return false;
  }
}

/** Pattern findings for one text body, as `line: rule: match` strings. */
export function patternFindings(rel, text) {
  const found = [];
  text.split('\n').forEach((line, index) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      for (const hit of line.matchAll(rule.re)) {
        if (isAllowed(rule.id, hit[0])) continue;
        found.push(`${rel}:${index + 1}: ${rule.id}: ${hit[0]}`);
      }
    }
  });
  return found;
}

/** Token findings for one text body against a set of HMACs. */
export function hmacFindings(rel, text, salt, hmacs) {
  const found = [];
  text.split('\n').forEach((line, index) => {
    for (const candidate of tokenCandidates(line)) {
      if (hmacs.has(hmacOf(salt, candidate))) found.push(`${rel}:${index + 1}: ${candidate}`);
    }
  });
  return found;
}

function readTree() {
  return trackedFiles().map((rel) => ({
    rel,
    text: isTextFile(rel) ? readFileSync(join(ROOT, rel), 'utf8') : null,
  }));
}

test('no tracked path or filename carries a shape the model should not contain', () => {
  const findings = trackedFiles().flatMap((rel) => patternFindings(rel, rel));
  assert.deepEqual(findings, []);
});

test('no tracked text file carries a redacted shape', () => {
  const tree = readTree();
  assert.ok(tree.length > 5, 'expected a populated worktree');
  const findings = tree
    .filter((f) => f.text != null)
    .flatMap(({ rel, text }) => patternFindings(rel, text));
  assert.deepEqual(findings, []);
});

/**
 * Fixture strings are assembled from fragments on purpose: the gate scans its
 * own source too, so writing a violation literally here would make the gate
 * fail on itself. Splitting the shape across string boundaries keeps the file
 * clean while still producing the exact violation at runtime.
 */
const frag = (...parts) => parts.join('');

test('the pattern rules catch what they are for', () => {
  const planted = [
    frag('/', 'Users', '/someone/thing'),
    frag('~', '/', 'programs', '/devs/thing'),
    frag('service on host', ':', '4321 today'),
    frag('the run starts at 22', ':', '00'),
    frag('ping ', '@', 'someaccount for this'),
    frag('see https', '://', 'example.test/watch'),
  ].join('\n');
  const ids = patternFindings('fixture', planted).map((f) => f.split(': ')[1]);
  for (const rule of RULES) assert.ok(ids.includes(rule.id), `rule ${rule.id} did not fire`);
});

test('the allowlist lets the toolchain through and nothing else', () => {
  assert.deepEqual(patternFindings('fixture', 'import x from "@playwright/test";'), []);
  assert.deepEqual(patternFindings('fixture', '@media (max-width: 860px) { }'), []);
  assert.deepEqual(patternFindings('fixture', 'const NS = "http://www.w3.org/2000/svg";'), []);
  assert.equal(patternFindings('fixture', frag('ping ', '@', 'notallowed here')).length, 1);
});

test('the HMAC denylist finds a planted term, its variants and its evasions', () => {
  const salt = 'fixture-salt-not-the-real-one';
  // The private table registers every written form of a name, including the
  // run-together one — a single token cannot be split back apart here, so that
  // variant is caught by being listed rather than by being derived.
  const terms = ['zzcorp-internal', 'zzcorpinternal', '가상프로젝트'];
  const hmacs = new Set(terms.map((t) => hmacOf(salt, normalizeText(t))));

  const hyphenated = hmacFindings('f', 'the zzcorp-internal queue', salt, hmacs);
  const spaced = hmacFindings('f', 'the zzcorp internal queue', salt, hmacs);
  const joined = hmacFindings('f', 'the zzcorpinternal queue', salt, hmacs);
  const zeroWidth = hmacFindings('f', 'the zz​corp-internal queue', salt, hmacs);
  const decomposed = hmacFindings('f', `the ${'가상프로젝트'.normalize('NFD')} run`, salt, hmacs);
  const clean = hmacFindings('f', 'the inventory queue is empty', salt, hmacs);

  for (const [label, hits] of Object.entries({ hyphenated, spaced, joined, zeroWidth, decomposed })) {
    assert.ok(hits.length >= 1, `${label} variant was not detected`);
  }
  assert.deepEqual(clean, [], 'a clean line must not fire');
});

test('the committed HMAC list is hashes only', () => {
  assert.ok(existsSync(HMAC_FILE), 'tests/redact-hmac.json must be committed');
  const payload = JSON.parse(readFileSync(HMAC_FILE, 'utf8'));
  assert.equal(payload.algorithm, 'hmac-sha256');
  assert.ok(Array.isArray(payload.hmacs) && payload.hmacs.length > 50);
  for (const entry of payload.hmacs) assert.match(decodeHmac(entry), /^[0-9a-f]{64}$/);
  assert.equal(new Set(payload.hmacs).size, payload.hmacs.length, 'duplicate hashes');
});

test('hash grouping is chosen so no hash spells a scanned term', () => {
  assert.equal(groupHex('abcdef01', 4), 'abcd-ef01');
  assert.equal(groupHex('abcdef01', 0), 'abcdef01');
  assert.equal(decodeHmac(groupHex('abcdef01', 2)), 'abcdef01');
  // a term the ungrouped hash spells by accident forces a tighter grouping
  assert.equal(chooseGrouping(['aaaabcdefaaa'], ['zzz']), 0);
  assert.ok(chooseGrouping(['aaaabcdefaaa'], ['abcdef']) > 0);
});

test('no tracked text token matches the private denylist', (t) => {
  const salt = process.env.REDACT_SALT;
  if (!salt) {
    t.skip('REDACT_SALT is not set — the salted-HMAC half of the redact gate did not run. '
      + 'The pattern half above ran in full. Maintainers: export REDACT_SALT (CI secret) '
      + 'before publishing; forks can ignore this.');
    return;
  }
  const hmacs = new Set(JSON.parse(readFileSync(HMAC_FILE, 'utf8')).hmacs.map(decodeHmac));
  const findings = readTree().flatMap(({ rel, text }) => [
    ...hmacFindings(rel, rel, salt, hmacs),
    ...(text == null ? [] : hmacFindings(rel, text, salt, hmacs)),
  ]);
  assert.deepEqual(findings, []);
});

test('the denylist parser refuses an empty or unmarked table', () => {
  assert.throws(() => parseDenylist('no markers here'), /markers/);
  assert.throws(
    () => parseDenylist('<!-- DENYLIST:BEGIN -->\n# only a comment\n<!-- DENYLIST:END -->'),
    /empty/,
  );
  const parsed = parseDenylist('<!-- DENYLIST:BEGIN -->\n```text\nAlpha-One\n\n# note\nBeta\n```\n<!-- DENYLIST:END -->');
  assert.deepEqual(parsed, ['alpha-one', 'beta']);
});
