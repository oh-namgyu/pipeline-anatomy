# Contributing to pipeline-anatomy

Thanks for your interest. The most valuable contributions here are **new
lessons** and **clearer explanations of existing ones** — and both are edits to
data, not to the engine.

Before anything else, read the two rules that are specific to this project:
[the redaction rule](#the-rule-that-matters-most-nothing-real-gets-named) and
[the engine rule](#the-engine-is-ported-do-not-diverge-casually). Everything
else here is ordinary.

## Development setup

No build step, no runtime dependencies.

```bash
npm ci                              # installs @playwright/test, the only dev dep
python3 -m http.server 6185         # then open the address it prints

npm test                            # node --test: schema gate, lesson data, redaction
npx playwright install chromium     # once
npx playwright test                 # e2e (boots its own static server)
```

`npm test` is the fast gate and runs against the lesson data directly; run it
after every data edit.

## The rule that matters most: nothing real gets named

This project is generalized from production systems that are not public. A
lesson describes a **shape** — a scheduled trigger, an inventory queue, a gate
before the render — never an instance of one. Concretely, no contribution may
introduce:

- a service, product, project, channel, feed or account name;
- a host, path, port, URL or credential;
- a wall-clock time, a cron expression, a schedule window;
- a metric that identifies a real system — view counts, revenue, subscriber
  numbers, item counts specific enough to fingerprint a catalogue.

Where the real system has a proper noun, write the role: *the publishing
platform*, *a public archive*, *the scheduler*, *the render machine*.

### Both redaction lines must pass

New content has to clear **both** lines, and the second one runs in CI whether
you remember or not:

1. **The public gate** — `tests/redact.test.mjs`, run in its own `redact` CI
   job. Its shape rules (paths, ports, handles, clock times, absolute URLs) need
   no secret and run on your fork exactly as they run here. Run `npm test`
   before opening a PR and it will tell you.
2. **The private gate** — a plaintext scan against the substitution table,
   which lives outside this repository and is run by a maintainer before every
   publish. You cannot run it, and you do not need to; it exists to catch what
   the public shape rules cannot see, and a maintainer will tell you if it
   fires.

Two consequences worth knowing:

- **The URL allowlist is not a convenience.** `ALLOWED_URL_PREFIXES` in
  `tests/redact.test.mjs` is short, explicit and commented. It holds standards
  and toolchain endpoints plus this project's own public addresses, and nothing
  else. If your change needs an absolute URL that is not in it, that is a
  conversation in the PR, not a one-line addition — and a URL belonging to a
  system these lessons generalize is never acceptable.
- **Screenshots come from the script, always.** Run `node scripts/shots.mjs`.
  Never commit a manually captured image. Both gates read text, and text baked
  into a PNG is invisible to them; a script that renders only committed lesson
  data inherits the coverage of both gates, and a hand-captured screenshot
  carries whatever else was on your screen. A PR adding an image that the script
  does not produce will be asked to change, on this ground alone.

If you believe you have spotted a real identifier that slipped through, **do not
open an issue** — report it privately (see [SECURITY.md](SECURITY.md)). A public
issue about a leak is a louder leak.

## The engine is ported: do not diverge casually

`js/engine/`, `js/app.js`, `js/store.js`, `js/views.js` and `js/ui-text.js` are
ported from [cc-anatomy](https://github.com/oh-namgyu/cc-anatomy) (MIT, same
author), the sibling explainer that runs the same machinery for a different
subject. Each ported file records the source commit in its header.

There is one intentional divergence: the `decisions` field, and the P&ID node
styling that goes with it. Everything else should stay reconcilable, because the
long-term fix is extracting the engine into one shared package, and every
unnecessary difference makes that harder.

So: a bug fix in the engine is welcome and should ideally be reported upstream
too. A refactor that makes the two copies harder to diff is not, unless it
comes with the reason. If a lesson needs a new capability, add it as a
schema-described feature any lesson can use — never a special case keyed on a
lesson id.

## Adding a lesson

A lesson is one file in `js/lessons/`, exporting a plain object, plus one
`register(...)` line in `js/lessons/index.js`. The engine renders anything that
passes the schema; you should not need to touch `js/engine/`.

Order of work — the same order the existing lessons were built in:

1. Write the lesson into [`docs/CONTENT-SPEC.md`](docs/CONTENT-SPEC.md):
   diagram nodes, the branch table, every step in prose, the decision cards.
   Doing the generalization pass here, in prose, is much easier than doing it
   later in a data module.
2. Check it against the redaction rule above, line by line.
3. Only then transcribe the spec into a data module.

Large lessons split their scenarios into a companion `*_scenarios.js` file, the
way the existing four do — it keeps both files under the size limit below.

### Schema shape

```js
export const lX = {
  id: 'lX-topic',                    // unique, kebab-case
  minutes: 5,                        // shown on the home card
  asOf: '2026-08',                   // as-built baseline, shown in the UI
  title: { en: '…', ko: '…' },
  intro: { en: '…', ko: '…' },

  diagram: {
    nodes: [
      { id: 'lX.start', role: 'event', x: 0, y: 0, h: 64,
        label: { en: '…', ko: '…' } },
      // role: event | decision | artifact | gate | terminal | cluster
      //       (default: event).  In the P&ID reading, `gate` nodes are valves
      //       and `artifact` nodes are vessels.
      // x and y are required numbers — layout coordinates live in the data.

      // An unordered group: a `cluster` node that names its members in `group`.
      // Members are highlighted together, with no arrows among them.
      { id: 'lX.stage', role: 'cluster', x: 320, y: 0,
        group: ['lX.a', 'lX.b'],
        label: { en: '…', ko: '…' } },
    ],
    edges: [
      { from: 'lX.start', to: 'lX.next', label: { en: '…', ko: '…' } },
      // edge label may also be a plain string
    ],
  },

  // Declared widgets and their enumerated values.
  // At most 2 widgets, at most 8 total combinations.
  inputs: {
    mode: ['a', 'b'],
    gate: ['pass', 'fail'],
  },

  // Optional presentation for those widgets.
  widgets: {
    mode: { type: 'chips', label: { en: '…', ko: '…' },
            valueLabels: { a: { en: '…', ko: '…' } } },
    gate: { type: 'toggle', label: { en: '…', ko: '…' } },   // toggle needs exactly 2 values
  },

  // One scenario per combination — all of them.
  scenarios: [
    { id: 'lX.s1',
      trigger: { mode: 'a', gate: 'pass' },    // every widget, values from inputs
      steps: [
        { node: 'lX.start',                        // required, must exist
          edge: 'lX.start->lX.next',               // optional; or {from, to}
          explain: { en: '…', ko: '…' },
          badge: 'requeued' },                     // optional: string, or
                                                   // { en, ko, tone } with tone in
                                                   // neutral | blocked | allowed | warn
      ] },
  ],

  // 3 to 5 cards: why the pipeline is shaped this way.
  decisions: [
    { id: 'lX.d1',
      title: { en: '…', ko: '…' },
      body: { en: '…', ko: '…' } },
  ],

  quiz: [
    { q: { en: '…', ko: '…' },
      choices: [{ en: '…', ko: '…' }, { en: '…', ko: '…' }],
      answer: 0 },                              // index into choices
  ],
};
```

Everything reader-facing is `{ en, ko }`. Both languages are required — the
schema rejects a lesson with one missing. If your Korean is not fluent, open the
PR with the English filled in and say so; a translation pass is a welcome
follow-up rather than a blocker.

**Decision cards are the point, not decoration.** A good card names a trade-off
and the cost of the alternative — "generating on demand ties output to the
moment of demand" — rather than restating what the diagram already shows. Three
to five per lesson, enforced.

### Validator error codes

`npm test` runs `validateLesson()` over every registered lesson. Errors come
back as `CODE: message`, so this table is the fastest way to read a failure:

| code | meaning |
| :--- | :--- |
| `E_SHAPE` | a field is missing or the wrong type (`id`, `sources`, node `x`/`y`, `diagram.nodes`, the lesson itself) |
| `E_LOCALE` | a localized field lacks `en` or `ko` |
| `E_NODE_ID` | a diagram node id is missing or duplicated |
| `E_NODE_REF` | a step has no `node`, or points at one absent from `diagram.nodes` |
| `E_EDGE_REF` | an edge is malformed, self-pointing or duplicated, or a step points at an edge absent from `diagram.edges` |
| `E_CLUSTER` | a `group` is not a non-empty array, names an unknown node, or contains its own node |
| `E_INPUTS` | `inputs`/`widgets` malformed — empty value list, duplicate value, unknown widget id, bad widget type, toggle without exactly 2 values |
| `E_WIDGET_LIMIT` | more than 2 widgets declared |
| `E_COMBO_LIMIT` | more than 8 input combinations |
| `E_TRIGGER` | a scenario trigger misses a widget, names an unknown one, or uses a value outside `inputs` |
| `E_TRIGGER_DUP` | two scenarios share the same trigger combination |
| `E_COMBO_UNCOVERED` | some input combination has no scenario — the branch-completeness gate |
| `E_SCENARIO` | a scenario has no id, a duplicate id, no steps, or a step whose `badge` is malformed or carries an unknown `tone` |
| `E_DECISIONS` | `decisions` is not an array, holds fewer than 3 or more than 5 cards, or a card lacks an id, a unique id, or a localized title/body |
| `E_QUIZ` | a quiz item is malformed, has fewer than 2 choices, or `answer` is not a valid index |

`E_COMBO_UNCOVERED` is the one that catches the mistake this project most wants
to prevent: a branch you can select in the UI but did not write. Every
combination in the Cartesian product of `inputs` must have a scenario. Keep the
combination count down by keeping the widgets few and their values enumerated;
the limits are enforced, not advisory.

`js/lessons/broken.js` is deliberately invalid — it is the fixture behind the
fallback-view test. Do not "fix" it. `js/lessons/dummy.js` is the engine-feature
demo fixture; keep it exercising every feature it currently does.

## Code conventions

- **Keep files small.** A source file over ~300 lines, or a function over ~50,
  wants splitting.
- **No inline styles.** Every style is a reusable class in the global
  `css/style.css` — no `style="..."` attributes, no per-component stylesheets.
- **No `innerHTML`.** Text lands via `textContent` or `paintText()` from
  `js/engine/richtext.js`. The tests and the CSP both assume this.
- **Nothing loads from another origin.** No CDN, no web font, no analytics. The
  page must keep working under `default-src 'self'`.
- **Add or update tests** in `tests/` (or `e2e/`) for every behavior change.

## Pull requests

Keep PRs focused on one change. Say what changed and how you verified it. Make
sure `npm test` is green before opening — that includes the redaction shape
rules, which run without any secret. CI runs the unit suite and the redaction
gate on Node 22, and the Playwright suite on chromium; the redaction gate is a
separate job so a failure there is unambiguous.
