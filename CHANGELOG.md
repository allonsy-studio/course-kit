# Changelog

## Unreleased

This release aligns the kit with the two course sites that use it: the same markup, class names, data attributes, copy keys and script behavior in all three, so a course can delete its local copy of a component or script and take the kit's with no change to its pages or data. It also brings the kit to WCAG 2.2 AAA.

### Breaking changes

- **Student-facing wording moved to a copy layer.** Components and scripts hold no English. Every string is a key in `COPY_DEFAULTS` (`lib/copy.js`, also exported from the package). Override any of them in `_data/strings.json`; a key that is not a copy key stops the build. A `ui/` component that needs words now takes them as props: `week-block` takes `label`, `today-link` takes `label`, `meeting-decks` takes `slidesLabel` and `addendumLabel`, `table-rubric` and `codepen-embed` take a `copy` table. A page that calls one of these directly passes them from `$data.copy`.
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

- Tokens: `focus-ring`, `border-strong`, `on-highlight`, `accent-fill-hover`, `surface-accent-secondary`, `code-surface`, `code-text`, `code-keyword`, `code-string`, `code-function`, `code-number`, `code-comment`, `code-edge-*` and `highlight-line`, plus `--target-min`, `--focus-ring-width`, `--focus-ring-offset` and `--radius-pill`.
- Focus: one solid 2px ring, scroll padding under sticky elements, 44px targets, reduced-motion and forced-colors rules.
- `worksheets.checkMode` (`end` by default, or `question` for a Check answer button on every gradable question), also settable per worksheet in front matter.
- `kind` on `days[].due[]`, `days[].readings[]` and `weeks[].readings[]` in `schedule.json`.
- `<practice-index>`, the courseDeadlines, expandTokens, fill, plural and copyJson filters, and `{classStart}`, `{lastClass}` and `{finalDue}` tokens in grading and policy prose.
- Worksheet answers are saved in the browser (`ck-ws:v1:<storage-id>:<question-id>`), restored on the next visit, and cleared with a confirmation.

### Migration

1. Set `institution.timezone` in `eleventy.config.js`.
2. If you changed wording in a local component, move it to `_data/strings.json`.
3. Delete local copies of `code-block.js` (the kit's is `code-copy.js`) and of the components listed above if they only differ in markup the kit now matches.
4. A page that calls `<week-block>`, `<today-link>`, `<meeting-decks>`, `<table-rubric>` or `<codepen-embed>` directly passes the new props.
5. If your own CSS or tests select `.seg`, `.past-toggle`, `.due-kind`, `.results` or `data-weeks`, use the classes in the breaking changes above.
6. Content to review: a worksheet's `noticeBody` should say answers are "saved in this browser only".
