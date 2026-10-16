# Changelog

All notable changes to this project are documented here. The format follows
Keep a Changelog 1.1.0, and this project adheres to Semantic Versioning 2.0.0.

## [0.1.0] - 2026-08-27

Initial public release.

### Added

- Four interactive lessons on content-automation pipelines, generalized from
  real production systems: L0 Common Foundations, L1 Audiobook Line, L2
  Multi-channel Content Hub and L3 Story Design to Render Bridge. Each is a
  piping diagram driven by input widgets, replaying a written scenario for
  every input combination, including failure branches, and ends with the
  design decisions behind it and three questions.
- A lesson engine ported from the sibling project cc-anatomy, with each
  ported file recording its source commit, and a schema gate that rejects
  uncovered input combinations.
- A redaction gate in CI (`tests/redact.test.mjs`, also run as its own
  `redact` job): shape rules for paths, ports, handles, clock times and
  absolute URLs, plus a salted-HMAC denylist that skips loudly without
  `REDACT_SALT`.
- Screenshots generated only by `scripts/shots.mjs` from committed lesson
  data.
- English and Korean throughout, switchable in the UI; progress kept in
  `localStorage` only.
- Responsive layout and accessibility parity with cc-anatomy.
- A static site with no build step and no runtime dependencies; a
  `default-src 'self'` Content Security Policy in the page and in
  `vercel.json`.
