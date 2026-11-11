# Accessibility

Every component in the kit meets **WCAG 2.2 AAA**, or a stricter standard where AAA is silent. This is a requirement, not a polish pass: the readers are students, many of them on a phone, some using a keyboard or a screen reader, and many reading in a hurry the night before something is due. A page that is merely compliant at AA is still hard to use at 11pm on a cracked screen.

## The bar

| Area | The bar | How it is held |
|---|---|---|
| Contrast | Text 7:1, large text 4.5:1, lines, icons and focus 3:1 | `test/theme.test.js` checks every token pair; axe's `color-contrast-enhanced` checks each rendered page |
| Focus | A solid 2px ring, never removed (2.4.13) | The `focus-ring` token, `:focus-visible` in `base.css`; the keyboard check measures it |
| Targets | 44 x 44 CSS px for anything operable (2.5.5) | `--target-min`; the target-size check measures every control in component UI |
| Motion | `prefers-reduced-motion: reduce` stops every transition and animation (2.3.3) | One rule in `base.css`; the motion check reads the computed durations |
| Forced colors | Every state stays visible with system colors | A `forced-colors` rule per component; axe runs in that mode |
| Color alone | Nothing is told by color only: a status has a word or a shape too | Review; chips and status labels carry text |
| Zoom and reflow | Usable at 400% zoom and a 320px width, no sideways scroll (1.4.10) | The reflow check at 320px |
| Language | Plain words, the same label for the same thing everywhere | The [copy layer](copy.md): every string is a key, so a label is written once |
| Navigation | The same order and names on every page; skip link first | The layouts; `base.webc` |
| Content in collapsed UI | Nothing is reachable only from a closed disclosure, a tooltip or a hover | Review; print opens every `<details>` |
| Names and states | Every control has an accessible name in every state (`aria-pressed`, `aria-selected`, `aria-current`) | axe; the state scans below |
| Keyboard | Every control is reachable with Tab, in reading order, with the focus visible; no trap | The keyboard check |

## What is automated

`yarn docs:test` (Cypress with `cypress-axe`) runs in the Pages workflow on every pull request, not in the unit-test workflow: it needs a browser and takes about 12 minutes. It builds the landing page and the component preview and then:

- runs **axe** with the `wcag2a`, `wcag2aa`, `wcag2aaa`, `wcag21a`, `wcag21aa`, `wcag22aa` and `best-practice` tags on **every built page**, in **light, dark and forced colors**, at the **desktop (1280 x 800) and mobile (390 x 844)** widths. Contrast is skipped in forced colors, where axe measures the emulation and not what a reader sees.
- checks **reflow**: no page scrolls sideways at 320px.
- scans the components that **change after load**, in the state a reader leaves them in: a worksheet after See results and after an answer is restored, the glossary with a filter applied, each Group by option and the Flashcards tab, the schedule with Hide past weeks pressed, a code block with its copy button, and the preview canvas's segmented controls.
- runs a **keyboard check** on those components: Tab reaches every control, and each focused control shows an indicator of 2px or more.
- runs a **reduced-motion pass**: with `prefers-reduced-motion: reduce`, no element transitions or animates for longer than 0.01ms.
- runs a **target-size check** on every component story: every button, link, input and summary is at least 44 x 44px. A link inside running text is exempt (WCAG's inline exception). The preview canvas's segmented controls are measured too: each option is a 44px square with its icon centered.
- runs a **print check**: with the print media type emulated, every control that needs a pointer or a script (the copy buttons, the worksheet's Check, Clear and Try buttons, Hide past weeks, the Today link, the home band) is hidden.

`yarn test` covers the contrast of every token pair and the copy layer's keys.

### Known violations

Findings that need a design decision, or that come from a story showing a component alone, are listed in `website/cypress/support/known.js`: the rule, a pattern for the element, and the reason. The audit skips exactly those, so a new violation fails the build and an old one cannot be forgotten. Removing an entry is how a fix is confirmed. Today they are:

- **Not the kit's** (the preview shell and the landing page use the Norn design system): Norn's table header text, current-page link and card text sit at 6.3 to 6.5:1.
- **Stories**: a story renders a component alone, so `glossary-entry` and `demo-weeks` show `<dt>` and `<dd>` with no `<dl>`, `meeting-card` an `<li>` with no list, and several components a heading with no heading above it.
- **Standalone links and summaries under 44px** (`KNOWN_TARGETS`): links in lists (assigned items, link lists, the footer, readings, glossary slide links, the instructor's email) and disclosure summaries (policies, Show the answer) are text-height. Making each a 44px row changes the density of every list, which is a design call.
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
