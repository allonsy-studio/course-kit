# Changelog

## Unreleased

This release aligns the kit with the two course sites that use it: the same markup, class names, data attributes, copy keys and script behavior in all three, so a course can delete its local copy of a component or script and take the kit's with no change to its pages or data. It also brings the kit to WCAG 2.2 AAA.

### Breaking changes

- **Scripts are named for behavior.** `/js/code-copy.js` and `/js/prompt-copy.js` are one `/js/copy.js`, loaded by the base layout (the document layout no longer loads a script of its own). `glossary.js` is no longer a file in `assets/scripts/`: it is a script inside `glossary-panel.webc`, which the page bundle includes once. A course that mirrors these files deletes its copies and its `/js/` references.
- **Student-facing wording moved to a copy layer.** Components and scripts hold no English. Every string is a key in `COPY_DEFAULTS` (`lib/copy.js`, also exported from the package). Override any of them in `_data/strings.json`; a key that is not a copy key stops the build. A `ui/` component that needs words now takes them as props: `week-block` takes `label`, `today-link` takes `label`, `meeting-decks` takes `slidesLabel` and `addendumLabel`, `table-rubric` and `codepen-embed` take a `copy` table. A page that calls one of these directly passes them from `$data.copy`. The layers that emit wording hold none either: the base, deck, document, lesson-plan and speaker-notes layouts, the lesson-day, lesson-plans and deck-notes pages, the lesson outline and the term's key dates, the "Materials & links" lists, the glossary's fallback labels, the permalink label, the syllabus PDF footer, and the deck and theme-panel scripts. [`docs/copy.md`](docs/copy.md) lists every key. A test checks that every key a source names exists and that no key is unused.
- **The campus time zone is explicit.** `institution.timezone` is the only source; the build computer's zone is never read. It defaults to `UTC`, so set it. The generated date in the syllabus PDF footer uses it too.
- **Worksheet flow rewritten.** A worksheet now has a results summary, a question list that is part of the markup, and answers saved in the browser. Removed: the per-question Check button by default, the "Review in the lesson" line, `.results`, `#results`, `.badge`, `.status`, `data-see-results`, `data-check-one` (unless `checkMode: "question"`), the `retry` and `note` props of `<check-controls>`, and the copy keys `selfMarked`, `notChecked`, `navRight`, `navWrong`, `missedLead`, `review`, `questions`, `seeResults` and `results`. `checkAll` is now "See results". Worksheet front matter that overrides only `noticeBody`, `termsHint` and `termSource` needs no change.
- **Question status is one model.** `unattempted`, `answered`, `right`, `wrong`, `partial` and `self`, on `data-state` of the question and of its entry in the question list. The score counts questions, never parts, and nothing unattempted is shown in red.
- **Schedule markup.** `<schedule-weeks>` renders `section.week`, `.week-head`, `li.meeting[data-today-scope]`, `.for-class .group[data-group]` and `footer.week-resources`. Removed: `[data-week-tools]`, `[data-past-toggle]`, `.past-toggle` and `.due-kind`. The past-weeks button has one label, "Hide past weeks", with `aria-pressed`, and is no longer remembered between visits.
- **Due chips come from data, not titles.** `kindOf()` and `kindLabel()` are gone. An item's chip is its `kind` (`test`, `graded`, `practice`, `reading`), else `graded` for a due item and `reading` for a reading with a `due` date. `<assigned-list>` takes `chips`, `kinds` and `dueOn` in place of the `label === 'Due'` test and `prefix`.
- **`<course-now>` markup.** `data-weeks`, `[data-next]`, `[data-week-number]` and the "Term progress" heading are gone; the band carries a JSON block, a screen-reader heading and the "Today's class" / "Next class" / "First class" card. "Pick up where you left off" is now "Today's class".
- **Glossary switch.** `.seg` is gone; Group by is a `fieldset.switch` of native radios and Review / Flashcards is a tablist. The `.switch` primitive moved to the base stylesheet. Element ids now start with the glossary element's `id` (default `glossary`).
- **Code blocks.** Every fence on a page is wrapped, including ones with no language (labelled "Code"); a shell fence is labelled "Terminal"; an unknown language shows its name in capitals. `data-edge` is always present. A fence outside a page (no `page.inputPath`), under `/slides/`, in a deck layout, in a notes sheet or in a slide stays bare. The copy button is appended to the figure, not the caption.
- **Menu.** Home and Syllabus join the top menu, and the current page is a filled blue pill. Lesson Plans moved to order 9 and out of the top menu (the footer still lists it). Schedule is order 3, Slides 4, Practice 5, Glossary 6, Projects 7, Demos 8 in a course's own front matter.
- **Colors.** The defaults changed to meet AAA: `accent`, `accent-text`, `accent-secondary`, `success`, `error`, `warning`, `surface-overlay`, `surface-accent`, `surface-subtle` and the code colors have new values; `link` now follows `accent-text`. `--color-accent-active` is no longer the focus color. If you override `link` or the code tokens, check them at 7:1.
- **Project deadline.** The syllabus "Due:" line and the course summary read the project's `due` and `dueTime` from `project.json`, not the last class meeting.

### Added

- `docs/accessibility.md`: the WCAG 2.2 AAA goal, the bar per area, what is automated and what is manual, and the definition of done for a component. `docs/components.md` carries the contributor rule.
- The Cypress audit (`yarn docs:test`) now runs axe at the AAA tag set plus best practices on every page of the website and the component preview, in light, dark and forced colors at the desktop and mobile widths, and adds a 320px reflow check, state scans (worksheet after See results and a restored answer, glossary filters, each Group by option and Flashcards, Hide past weeks, the code copy button, the preview canvas), a keyboard check, a reduced-motion check and a 44px target-size check. No new dependency.
- `minifyInline()`: an opt-in Eleventy transform that minifies inline scripts and styles with esbuild (`config.addTransform("minify-inline", minifyInline())`). The kit does not minify by default; see "Minifying inline code" in `docs/configuration.md`. `yarn docs:test` builds the preview minified (`MINIFY=0` turns it off).
- `<link-list>`, `<card-list>` (its `cards` slot) and `<nav-links>` accept the list as a `<ul>` (or a `<dl>` for `link-list`) in a slot, with the same precedence as `<assigned-list>`. [`docs/backlog.md`](docs/backlog.md) lists what is decided but not done.
- `<assigned-list>` accepts a `<dl>` in the default slot as well as `items`; the array wins when it has items, and an empty or missing array renders the slot. A preview frame for a code fence, and stories for every variant of `callout`, `week-block`, `meeting-decks` and `assigned-list`.
- `copy` option on `courseKit(config, { copy })` and `resolveCopy({ dataDir, extra })`: a course's own copy namespaces, for components only that course has, layered on the shared defaults and overridable in `strings.json`. A namespace the kit already uses is refused.
- `lessons.segments` rows name their wording by copy key (`segmentKey`, `openingKey`); a row with `segment` / `opening` text still works.
- `docs/copy.md`, generated by `yarn docs`.
- Tokens: `focus-ring`, `border-strong`, `on-highlight`, `accent-fill-hover`, `surface-accent-secondary`, `code-surface`, `code-text`, `code-keyword`, `code-string`, `code-function`, `code-number`, `code-comment`, `code-edge-*` and `highlight-line`, plus `--target-min`, `--focus-ring-width`, `--focus-ring-offset` and `--radius-pill`.
- Focus: one solid 2px ring, scroll padding under sticky elements, 44px targets, reduced-motion and forced-colors rules.
- `worksheets.checkMode` (`end` by default, or `question` for a Check answer button on every gradable question), also settable per worksheet in front matter.
- `kind` on `days[].due[]`, `days[].readings[]` and `weeks[].readings[]` in `schedule.json`.
- `<practice-index>`, the courseDeadlines, expandTokens, fill, plural and copyJson filters, and `{classStart}`, `{lastClass}` and `{finalDue}` tokens in grading and policy prose.
- Worksheet answers are saved in the browser (`ck-ws:v1:<storage-id>:<question-id>`), restored on the next visit, and cleared with a confirmation.

### Fixed

- `<assigned-list>` never rendered its chips: a bare `@chips` reaches the template as an empty string. Items are now spaced a clear step further apart than their lines (WCAG 1.4.8).
- Icons inside buttons and icon components are no longer stretched by the global `svg` floor (`min-block-size: 2.5em`), which misaligned the preview canvas's segmented controls. Each option is a 44px square with its icon centered.
- Prism code outside a `.code-block` (a worksheet figure, a glossary example) uses the code tokens, so its colors keep 7:1.
- A prop with a camelCase name written as an attribute arrived lowercased and empty: `<meeting-decks>` rendered links with no text on the demos page, and the preview stories lost `dueOn`. Write `@slides-label`, not `@slidesLabel`; the preview now does.
- `<card-list>` gave its card link `aria-labelledby="slugify(...)"` as text, not an expression, so the link had no name. The footer no longer lists the `$schema` key of `policies.json` as an empty link.
- The home band is hidden in print; the instructor monogram and the syllabus weight chip sit on `surface-accent`, so they keep 7:1.
- The starter theme's muted text, dark accent, error and success colors reach 7:1.

### Migration

1. Set `institution.timezone` in `eleventy.config.js`.
2. If you changed wording in a local component, move it to `_data/strings.json`.
3. Delete local copies of `code-block.js` (the kit's is `code-copy.js`) and of the components listed above if they only differ in markup the kit now matches.
4. A page that calls `<week-block>`, `<today-link>`, `<meeting-decks>`, `<table-rubric>` or `<codepen-embed>` directly passes the new props.
5. If your own CSS or tests select `.seg`, `.past-toggle`, `.due-kind`, `.results` or `data-weeks`, use the classes in the breaking changes above.
6. Content to review: a worksheet's `noticeBody` should say answers are "saved in this browser only".
