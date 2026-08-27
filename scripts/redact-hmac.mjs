#!/usr/bin/env node
/**
 * Second-line redact gate: build the salted-HMAC denylist.
 *
 * The private substitution table lists the real names this project was
 * generalized away from. Publishing that list — even hashed — would re-expose
 * it, because low-entropy names fall to a dictionary attack in seconds. So the
 * committed artefact is `HMAC-SHA256(salt, term)` under a salt that lives only
 * in CI secrets and in the author's environment: without the salt the file
 * proves nothing about any particular name, and with it the CI job can still
 * refuse a commit that reintroduces one.
 *
 * The first line of defence stays private and stays substring-based; this one
 * exists to catch regressions in a public repository, and its limits are
 * deliberate (see `tokenCandidates`).
 *
 *   REDACT_PLAINTEXT=<path to the private table>  \
 *   REDACT_SALT=<hex salt>                        \
 *   node scripts/redact-hmac.mjs
 *
 * Writes tests/redact-hmac.json — hashes only, never plaintext.
 */

import { createHmac } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

export const BEGIN_MARK = '<!-- DENYLIST:BEGIN -->';
export const END_MARK = '<!-- DENYLIST:END -->';

/** Characters an evasion attempt can hide inside a word without showing. */
const ZERO_WIDTH = /[​‌‍⁠﻿­]/g;

/** Latin/digit runs and Hangul runs; both appear in the private table. */
const TOKEN = /[a-z0-9]+|[가-힣]+/g;

const HERE = dirname(fileURLToPath(import.meta.url));
export const OUTPUT_PATH = join(HERE, '..', 'tests', 'redact-hmac.json');

/** NFC, then drop zero-width characters, then lowercase. */
export function normalizeText(text) {
  return String(text).normalize('NFC').replace(ZERO_WIDTH, '').toLowerCase();
}

/**
 * Every string from `text` that could be a denylist entry.
 *
 * Single tokens, plus adjacent pairs joined three ways — with a space, with a
 * hyphen, and with nothing — because the private table registers the same name
 * in all of those shapes. Three-word names and substrings of a longer token
 * are out of reach here by design; the private plaintext scan covers those.
 */
export function tokenCandidates(text) {
  const tokens = normalizeText(text).match(TOKEN) || [];
  const out = new Set();
  for (let i = 0; i < tokens.length; i += 1) {
    out.add(tokens[i]);
    if (i + 1 >= tokens.length) continue;
    const pair = [tokens[i], tokens[i + 1]];
    out.add(pair.join(' '));
    out.add(pair.join('-'));
    out.add(pair.join(''));
  }
  return out;
}

/** HMAC-SHA256 of one already-normalized value, as lowercase hex. */
export function hmacOf(salt, value) {
  return createHmac('sha256', salt).update(value, 'utf8').digest('hex');
}

/** Undo the group separators the writer inserts (see `groupHex`). */
export function decodeHmac(entry) {
  return String(entry).replace(/-/g, '');
}

/** Break `hex` into runs of `size` characters; size 0 means leave it whole. */
export function groupHex(hex, size) {
  if (!size) return hex;
  return (hex.match(new RegExp(`.{1,${size}}`, 'g')) || []).join('-');
}

/**
 * Hex is base 16, so a long enough hash eventually spells any short latin
 * string by chance — including a three-letter denylist entry, which makes the
 * private substring scanner report a leak that is not there. Breaking the hex
 * into short runs removes the coincidence without weakening anything: pick the
 * loosest grouping that no denylist term survives.
 */
export function chooseGrouping(hexes, terms) {
  for (const size of [0, 8, 4, 2]) {
    const blob = hexes.map((hex) => groupHex(hex, size)).join('\n');
    if (!terms.some((term) => blob.includes(term))) return size;
  }
  throw new Error('no grouping avoids a denylist collision — inspect the table for a 1-2 char entry');
}

/** Pull the marker-delimited denylist out of the private table's markdown. */
export function parseDenylist(markdown) {
  const start = markdown.indexOf(BEGIN_MARK);
  const end = markdown.indexOf(END_MARK);
  if (start < 0 || end < 0 || end < start) {
    throw new Error(`denylist markers ${BEGIN_MARK} / ${END_MARK} not found`);
  }
  const body = markdown.slice(start + BEGIN_MARK.length, end);
  const terms = new Set();
  for (const line of body.split('\n')) {
    const item = line.trim();
    if (!item || item.startsWith('#') || item.startsWith('```')) continue;
    terms.add(normalizeText(item));
  }
  if (terms.size === 0) throw new Error('denylist is empty — refusing to write a gate that passes everything');
  return [...terms].sort();
}

function main() {
  const plaintextPath = process.env.REDACT_PLAINTEXT;
  const salt = process.env.REDACT_SALT;
  if (!plaintextPath) throw new Error('REDACT_PLAINTEXT must point at the private substitution table');
  if (!salt) throw new Error('REDACT_SALT must carry the secret salt');

  const terms = parseDenylist(readFileSync(plaintextPath, 'utf8'));
  const hexes = terms.map((term) => hmacOf(salt, term)).sort();
  const grouping = chooseGrouping(hexes, terms);
  const payload = {
    note: 'HMAC-SHA256 of the private denylist under a secret salt. Useless without REDACT_SALT. '
      + 'Digits are grouped only so a hash cannot spell a scanned term by coincidence.',
    algorithm: 'hmac-sha256',
    grouping,
    generator: 'scripts/redact-hmac.mjs',
    hmacs: hexes.map((hex) => groupHex(hex, grouping)),
  };
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`wrote ${OUTPUT_PATH} with ${hexes.length} entries (grouping ${grouping})\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
