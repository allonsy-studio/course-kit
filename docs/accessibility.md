# Accessibility

Every component in the kit meets **WCAG 2.2 AAA**, or a stricter standard where AAA is silent. This is a requirement, not a polish pass: the readers are students, many of them on a phone, some using a keyboard or a screen reader, and many reading in a hurry the night before something is due. A page that is merely compliant at AA is still hard to use at 11pm on a cracked screen.

## The bar

| Area | The bar | How it is held |
|---|---|---|
| Contrast | Text 7:1, large text 4.5:1, lines, icons and focus 3:1 | `test/theme.test.js` checks every token pair; axe's `color-contrast-enhanced` checks each rendered page |
| Focus | A solid 2px ring, never removed (2.4.13) | The `focus-ring` token, `:focus-visible` in `base.css`; the keyboard check measures it |
| Targets | 44 x 44 CSS px for anything operable (2.5.5) | `--target-min`; the target-size check measures every control in component UI |
| Motion | `prefers-reduced-motion: reduce` stops every transition and animation (2.3.3) | One rule in `base.css`; the motion check reads the computed durations. A deck loads `deck.css` alone, which guards each of its own rules; `test/deck-reveal.test.js` checks them (see [SVG reveals](slides.md)) |
| Forced colors | Every state stays visible with system colors | A `forced-colors` rule per component; axe runs in that mode |
| Color alone | Nothing is told by color only: a status has a word or a shape too | Review; chips and status labels carry text |
| Code line height | Code blocks default to 1.2 (`--code-line-height`), below the 1.5 body floor. Set it per block with `--code-line-height` where a sample needs more room. Readers can still override spacing (1.4.12) | `base.css` |
| Zoom and reflow | Usable at 400% zoom and a 320px width, no sideways scroll (1.4.10) | The reflow check at 320px |
| Language | Plain words, the same label for the same thing everywhere | The [copy layer](copy.md): every string is a key, so a label is written once |
| Navigation | The same order and names on every page; skip link first | The layouts; `base.webc` |
| Content in collapsed UI | Nothing is reachable only from a closed disclosure, a tooltip or a hover | Review; print opens every `<details>` |
| Names and states | Every control has an accessible name in every state (`aria-pressed`, `aria-selected`, `aria-current`) | axe; the state scans below |
| Keyboard | Every control is reachable with Tab, in reading order, with the focus visible; no trap | The keyboard check |

## What is automated

`yarn docs:test` (`scripts/browser-run.js`) runs the browser tests: Cypress with `cypress-axe`, in Cypress's bundled Electron. Electron is Chromium, so the media emulation below works, and its version changes only when Cypress does, not when a CI runner's Chrome updates. It runs in three steps, so a build error is Eleventy's own message, printed before Cypress starts:

1. **Build** the audit site with `node scripts/site.js audit`: the landing and the component preview under `/components/`, served from `/`, with no path prefix. It builds into a fresh folder and then replaces `website/_a11y`, so no stale page is tested and a run already serving it never sees a half-written build. The preview is built minified, as a course that opts in would ship it (`MINIFY=0` turns that off). The build fails if the project styles were not copied, since axe then fails without naming the missing stylesheet.
2. **Serve** `website/_a11y` on port 8080 with Eleventy's server (`@11ty/eleventy-dev-server`), with live reload off so the audited pages are exactly what was built. Set `BROWSER_PORT` to use another port. A port in use fails rather than moving to the next one; Eleventy's message reads "Tried 0 different ports but they were all in use".
3. **Run Cypress** (`cypress run --project website`). `website/cypress.config.js` reads the built page list, applies `BROWSER_SHARD` (see below), sets `baseUrl`, and checks that a server answers there. Extra arguments go to `cypress run`, such as `yarn docs:test --spec website/cypress/e2e/print.cy.js`. Cypress started on its own (`cypress open --project website`) needs a server running, such as `yarn docs:test --no-build` in another terminal; without one it stops with "Nothing is serving the audit build at …".

In CI they are the Browser jobs of the Test workflow (`.github/workflows/test.yml`), on every pull request, push to `main` and merge-queue run:

- **Four shards**, Browser (1/4) to (4/4), each with about a quarter of the pages; about 4 minutes in all.
- **A pull request tests only the pages it changes**, when it changes only content; see [Pull requests test only the pages they change](#pull-requests-test-only-the-pages-they-change).
- **One check to require**, "Test / Browser", which passes only when all four shards do. A run cancelled by a newer push fails it rather than skipping it, since a skipped job would count as passing.
- **Apart from Pages**, so a preview publishes in about a minute. A preview can be up before its tests have passed; the check is what to read.
- **A new push to a pull request cancels its older run.** Runs on `main` and in the merge queue are never cancelled.
- **Failure screenshots**: a failing shard uploads Cypress's screenshots as `browser-screenshots-pr-<number>-<shard>` (or `run-<id>` outside a pull request), kept 7 days. A later clean run of the same pull request, or a clean rerun, deletes them (not from a fork, whose token cannot delete artifacts), and so does `.github/workflows/cleanup.yml` when the pull request closes, merged or not.

To run one shard locally, set `BROWSER_SHARD`: `BROWSER_SHARD=2/4 yarn docs:test` tests every fourth page from the second. The specs that read the page list (any spec with `Cypress.env("pages")`: today `a11y`, `icons`, `lists`, `targets` and `visible`) run in every shard; the others run only in the first.

To run two shards at once, build once, then start each in its own terminal on its own port; `--no-build` serves the existing build:

```sh
# once
node scripts/site.js audit
# terminal 1
BROWSER_SHARD=1/4 yarn docs:test --no-build
# terminal 2
BROWSER_SHARD=2/4 BROWSER_PORT=8081 yarn docs:test --no-build
```

### Pull requests test only the pages they change

On a pull request that changes only content, the page list holds just the pages the change affects. Pushes to `main` and merge-queue runs always test every page.

To test every page on a pull request anyway, add the `full-audit` label and rerun the jobs. The Scope job reads the label when it runs, so a rerun sees it. If it cannot read the labels, it counts the label as set. A local run tests every page unless you build a base and compare ([Compare with a base locally](#compare-with-a-base-locally)); `AUDIT_ALL_PAGES=1` forces every page there too.

The pages are picked in this order:

1. **Every page**, unless the pull request changes only content. The Scope job (`.github/workflows/test.yml`) counts the changed files outside the content paths, using [`dorny/paths-filter`](https://github.com/dorny/paths-filter) on the pull request's file list. The content paths are the filter's globs: the site's and the preview's content, data and stories, plus `docs/`, `.changeset/`, `README.md` and `CHANGELOG.md`, which neither build reads. A change to `components/`, `assets/`, `lib/`, `layouts/`, `glue/`, the preview's own code, any config, `package.json`, `yarn.lock`, `website/cypress/` or a workflow tests every page, with no extra build.
2. **Otherwise**, each shard compares two builds:
    - **The base build.** The shard builds the base, the commit the pull request targets (`HEAD^1` of its merge commit), in a second checkout in a temporary folder (a git worktree). It uses the command that builds the head, `node scripts/site.js audit`.
    - **An affected page** is one whose HTML differs. A file of any other kind that is changed, added or removed (a stylesheet, script, image or font) affects every page of its site: the landing site, or the component preview under `/components/`. `website/lib/affected-pages.js` does the comparison. A change to the preview's own stylesheet or script therefore tests every preview page, and a change to the landing page's stylesheet tests only the landing site.
    - **Why not HTML alone:** it would miss a shared stylesheet change, whose pages are byte-identical.
    - **What is ignored:** inline source maps, and the random ids WebC adds to markup (`webc-` and five characters) when a page defines them in an `id`.
3. **Every page** if the filter fails, the base does not build, or the comparison fails.

Only the page list shrinks. The specs that do not read it (states, schedule bar, print and the rest) still run in full in the first shard, and a shard left with no pages still passes, so "Test / Browser" still means everything that should run passed.

Each shard logs which mode ran and why at the top of its Cypress output, and as a notice on the run's summary: `Browser pages: every page (168): 3 changed files are outside the content paths; shard 2/4 tests 42.` or `Browser pages: 2 affected pages of 168; shard 1/4 tests 1.`

The base build costs about 20 seconds a shard, paid only on a content-only pull request. A page costs about 4 seconds to test, so the build pays for itself once it leaves out about 5 pages a shard.

#### Compare with a base locally

The workflow does these steps for you. To do them by hand, when every change is content (the globs in the Scope job list what counts):

1. Build the base, in a second checkout:

    ```sh
    BASE=$(git merge-base origin/main HEAD)
    git worktree add --detach /tmp/audit-base "$BASE"
    ln -s "$PWD/node_modules" /tmp/audit-base/node_modules
    (cd /tmp/audit-base && node scripts/site.js audit)
    ```

2. Run the tests with the base's folder and a count of zero changed files outside the content paths:

    ```sh
    AUDIT_OUTSIDE_COUNT=0 AUDIT_BASE_DIR=/tmp/audit-base/website/_a11y BROWSER_SHARD=1/4 yarn docs:test
    ```

3. Remove the second checkout: `git worktree remove --force /tmp/audit-base`.

Without `AUDIT_BASE_DIR`, or with any count but `0`, the run tests every page.

### What each run checks

With the site built and served, the run:

- runs **axe** with the `wcag2a`, `wcag2aa`, `wcag2aaa`, `wcag21a`, `wcag21aa`, `wcag22aa` and `best-practice` tags on **every built page**, in **light and dark** at the **desktop (1280 x 800) and mobile (390 x 844)** widths, and in **forced colors** at the desktop width. Contrast is skipped in forced colors, where axe measures the emulation and not what a reader sees, so the mobile layout's structure is left to the light and dark runs.
- checks **reflow**: no page scrolls sideways at 320px.
- scans the components that **change after load**, in the state a reader leaves them in: a worksheet after See results and after an answer is restored, the glossary with a filter applied, each Group by option and the Flashcards tab, the schedule with Hide past weeks pressed, a code block with its copy button, and the preview canvas's segmented controls.
- runs a **keyboard check** on those components: Tab reaches every control, and each focused control shows an indicator of 2px or more.
- runs a **reduced-motion pass**: with `prefers-reduced-motion: reduce`, no element transitions or animates for longer than 0.01ms.
- runs a **target-size check** on every component story: every button, link, input and summary is at least 44 x 44px. A link inside running text is exempt (WCAG's inline exception), and so is a target that is not rendered, such as a link in a closed `<details>`. The preview canvas's segmented controls are measured too: each option is a 44px square with its icon centered.
- runs a **print check**: with the print media type emulated, every control that needs a pointer or a script (the copy buttons, the worksheet's Check, Clear and Try buttons, Hide past weeks, the Today link, the home band) is hidden.

`yarn test` covers the contrast of every token pair and the copy layer's keys.

### Known violations

Findings that need a design decision, or that come from a story showing a component alone, are listed in `website/cypress/support/known.js`: the rule, a pattern for the element, and the reason. The audit skips exactly those, so a new violation fails the Browser check and an old one cannot be forgotten. Removing an entry is how a fix is confirmed. Today they are:

- **Not the kit's** (the preview shell and the landing page use the Norn design system): Norn's table header text, current-page link and card text sit at 6.3 to 6.5:1.
- **Stories**: a story renders a component alone, so `glossary-entry` and `demo-weeks` show `<dt>` and `<dd>` with no `<dl>`, `meeting-card` an `<li>` with no list, and several components a heading with no heading above it.
- **Standalone links and summaries under 44px** (`KNOWN_TARGETS`): links in lists (assigned items, link lists, the footer, readings, glossary slide links, and the message and blog rows of the instructor's fact list, whose 44px form is the opt-in icon links) and disclosure summaries (policies, Show the answer) are text-height. Making each a 44px row changes the density of every list, which is a design call.
- **The selected pill** (`.switch-option`) was measured once with a system accent behind white text; it needs a look in a real browser.

## What is manual

axe finds about a third of real problems. Before a component ships, a person checks:

- **Screen reader**: VoiceOver or NVDA reads the component in order, announces each state change (a status line, a pressed button), and names every control.
- **Zoom**: 200% and 400% in the browser, and a phone in landscape.
- **Keyboard only**: the whole task, with the pointer put away.
- **Windows High Contrast**: every state is visible, including a selected tab and a focused radio.
- **Plain language**: the wording is short, in the active voice, and says what happens.
- **Print**: the page is readable in black and white.

## Definition of done for a component

A new or changed component ships with:

1. **Copy keys** for every string it shows, including `aria-label`, `title` and screen-reader text. Add them to `lib/copy.js`; `yarn docs` rewrites [Copy keys](copy.md).
2. **Roles and states**: native elements first; ARIA only where HTML has no element, with the state (`aria-pressed`, `aria-expanded`, `aria-current`) kept in step.
3. **Focus order** that matches reading order, and a visible focus ring from the `focus-ring` token.
4. **A forced-colors rule** where a state depends on a color or background (a selected option, a status).
5. **A reduced-motion rule**: motion only inside `@media (prefers-reduced-motion: no-preference)`, or covered by the global rule.
6. **44 x 44px targets**, and 7:1 text on every ground it can sit on.
7. **A story** for every variant, with the argTypes that make the "Every option" matrix show them, and edge cases (a long title, a missing optional field).
8. **A semantic-markup alternative** when a prop takes a list or an object: the same content written as a `<ul>`, `<dl>`, `<table>` or `<details>` in the default slot, which reads well with no styles. Say in the component's header comment which form wins if both are given.
9. **A test**: a unit test for its logic, and the audit covers the story automatically. If it changes after load, add its state to `website/cypress/e2e/states.cy.js`.
