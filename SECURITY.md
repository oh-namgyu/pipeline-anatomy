# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.x (latest on `main`) | :white_check_mark: |
| older commits          | :x:                |

pipeline-anatomy is pre-1.0. Only the latest state of the default branch
receives fixes; a fix is a commit plus a redeploy of the static files.

## Reporting a vulnerability

Please report security issues **privately** through
[GitHub Security Advisories](https://github.com/oh-namgyu/pipeline-anatomy/security/advisories/new)
on this repository. Do not open a public issue for a sensitive report. You can
expect an initial response within a few days.

**If you believe you have found a real identifier that the redaction gates
missed** — a service name, a channel, an account, a host, a path — please use
the same private channel rather than an issue. That is the one report where
opening a public issue makes the problem worse. See
[Redaction threat model](#redaction-threat-model) below for what happens next.

## Threat model

pipeline-anatomy is a **static site**. There is no server of ours, no backend,
no database, no account and no API key. Everything ships as HTML, CSS and ES
modules that run entirely in the visitor's browser.

That removes most of the usual surface. Two things remain: the surface any
static page has (what it loads, what it stores, what a hostile contributor could
get into the bundle), and one surface specific to this project — the fact that
its content is generalized from systems that are not public.

## What the app does not do

- **No data collection.** No analytics, no telemetry, no cookies, no beacons,
  no error reporting service. Nothing about a visitor is transmitted anywhere.
- **No external requests.** The page loads zero resources from another origin —
  no CDN script, no external stylesheet, no web font, no remote image. Every
  asset is served from the same origin as the page.
- **No server.** There is no endpoint to attack, no session, no authentication,
  no file upload, no user-supplied URL fetching.
- **No user accounts and no user content.** Lessons are compiled-in data
  modules, not something a visitor can author or submit.

## Local storage

The only thing persisted is lesson progress and the EN/KO language choice, in
the browser's `localStorage`, under two app-scoped keys
(`pipeline-anatomy.progress`, `pipeline-anatomy.locale`). Between them they hold
lesson ids and quiz completion flags — no personal data. Clearing site data
removes it completely. It is never read by anything but the page itself, and
never leaves the browser.

## Redaction threat model

The lessons describe pipelines that exist and run but are not public. The asset
being protected is therefore **the mapping from a lesson to a real system**: the
service names, channels, accounts, hosts, paths, ports, schedules and metrics
that would turn a generalized case study into a directory of live targets.

### What the gates catch

**First line — private plaintext scan.** A deterministic script compares a
checkout against the substitution table that maps each real name to its public
role. Substring matching, case-insensitive, after Unicode NFC normalization and
zero-width character removal; file contents and file names both. The table is
not published, because a published list of the names you are hiding is the leak
itself. The script carries a self-test that plants violations and asserts they
are detected.

**Second line — public CI gate** (`tests/redact.test.mjs`, run as its own
`redact` job):

- *Shape rules*, needing no secret and running on every fork: filesystem paths,
  port numbers, account handles, wall-clock times, absolute URLs outside a
  short, explicit, commented allowlist.
- *A salted-HMAC denylist* for the specific names. The committed file holds
  `HMAC-SHA256(salt, term)` only. Plain hashes of low-entropy names fall to a
  dictionary attack, so the salt (`REDACT_SALT`, a repository secret) is the
  reason the file is safe to publish: without it the file proves nothing about
  any particular name; with it, CI can still refuse a commit that reintroduces
  one. Without the salt this half skips with an explicit message rather than
  reporting success.

### Honest limits

- **Both lines match text.** A name written in a form nobody registered —
  a homoglyph substitution, an unusual transliteration, a three-word variant, a
  fragment inside a longer token — is not caught by the public HMAC half, whose
  token model is deliberately narrow (single tokens and adjacent pairs). Those
  cases fall to the private first line, which is substring-based, and to human
  review before publishing.
- **Text inside an image is undetectable** by either line. This is handled
  structurally, not by detection: every committed screenshot must be produced by
  `scripts/shots.mjs`, which renders only committed lesson data. A manually
  captured image is not accepted, because it can carry anything that was on
  screen at capture time.
- **The gates are regression control, not proof.** They prevent a name coming
  back. They cannot certify that the original generalization pass was complete;
  that came from a per-item source comparison done before any lesson was
  written, and from review.

### If something does get through

Recovery is partial and it is worth saying so. Once a commit is public, forks,
search-engine caches and archives may already hold copies that cannot be
recalled. The procedure therefore aims at stopping continued exposure, not at
undoing it: remove the content, purge it from history, force-push (the single
permitted exception to this repository's no-force-push rule, with the reason
recorded), redeploy, request cache invalidation where a provider offers it, and
add the missed variant to the private table so the gates catch it from then on.

Because recovery is partial, the real defence is always the pre-publish gates —
and the rule that high-severity material (credentials, keys, tokens) never
enters the content pipeline in the first place, so there is nothing of that
class to leak.

## Content-Security-Policy

`index.html` carries a meta CSP of `default-src 'self'`, and `vercel.json` sends
the same policy as a real response header along with `X-Content-Type-Options`
and `Referrer-Policy`. This blocks scripts, styles, images, fonts, frames,
`fetch`/XHR and WebSockets to any other origin. Combined with the project rule
of **no inline styles and no inline scripts**, an injected third-party resource
fails to load rather than executing.

## DOM handling

The app never assigns untrusted strings to `innerHTML`. Lesson text goes through
a small, allowlisting rich-text renderer (`js/engine/richtext.js`) that produces
elements programmatically; every other string is set with `textContent`. Widget
input is not free text — it is selection among values enumerated by the lesson
data, used only to look up a scenario, never injected into the DOM.

## Supply chain

- **Runtime dependencies: none.** Nothing is bundled, vendored or fetched at
  runtime. What you read in `js/` is what the browser runs.
- **Development dependency: one** — `@playwright/test`, used by the e2e suite,
  the screenshot script and CI. It never reaches a visitor's browser.
- Dependabot watches npm and GitHub Actions weekly. Auto-merge is limited to
  patch and minor updates of that dev dependency and of workflow actions; major
  updates stay manual. Auto-merge is additionally gated on the required checks,
  which include the `redact` job — a redaction failure blocks the merge and
  therefore the deploy.

## Known limitations

- **Deployment headers beyond the ones in `vercel.json` are the deployer's
  responsibility.** HSTS and anything else your host adds come from your hosting
  configuration.
- **Accuracy is not a security property.** A lesson step that describes a
  pipeline shape imprecisely is a content bug — report it as an issue, not as a
  security advisory. A lesson step that names something real is the opposite:
  report it privately.
