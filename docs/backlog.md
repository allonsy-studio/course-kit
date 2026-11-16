# Backlog

Work that is decided but not done, with the reason. Move an item out when it ships.

## Semantic markup alternatives

A prop that takes a list or an object should also accept the same content as semantic markup in a slot (see the [component rules](components.md)). Done: `assigned-list`, `link-list`, `card-list` (its `cards` slot) and `nav-links`.

- **`link-section`**: not yet. Its scoped CSS hangs off the root `<ul>`, so a slot form would restyle every course. Do it with a wrapper element that carries the scope, in the same change that restyles it.
- **`course-now`, `schedule-weeks`, `demo-weeks`, `schedule-overview`**: not yet. Their `weeks` are computed from the schedule data, so the slot would replace the computation. Options: (a) none; (b) an `<ol>` of weeks, each a `<details>`, written by the author; (c) authored HTML for the whole component.
- **A Markdown table in the slot of `table-rubric` and `slide-timetable`**: deferred; the data form stays the only form for now. The use case to validate is a standard table that the kit's Markdown converter writes for a GFM pipe table (`<table><thead><tr><th>…`, optional `style="text-align:…"` on cells, no `scope`, caption or ids), rendered with the same look as the data form, with `scope` and a caption added at build, and a build failure naming the page and the expected columns when the columns do not match. It was deferred because a WebC component cannot read its slot's HTML, so it cannot add `scope` or a caption or check the columns. Options: (a) an HTML transform that rewrites the table inside `<table-rubric>` after the page renders (closest to the use case; the preview must run the same transform for stories); (b) a markdown-it container (`::: rubric`) that renders the table and runs the checks inside the Markdown pipeline, where the HTML is available; (c) keep the data form only, the choice for now. Re-evaluate later.

## Navigation and header

Found migrating CS230. Not done.

- **A nav layout for eight or more items.** The header's menu is one column of links, so a course with eight pages makes the masthead about 150px taller than its own did. Options: (a) a two-row or wrapping menu above a width; (b) a "More" disclosure that holds the last items (it must stay reachable with no script: a `<details>`); (c) a `nav.layout` option (`column`, `wrap`) in `courseKit`. Re-measure at 320px, 400% zoom and print before choosing.
- **A header treatment option.** The kit's one-column nav also drops the tinted header wash the courses had behind the masthead. Offer the wash as a theme token (`surface-header`) and a `header: "tinted" | "plain"` option, at 7:1 for the nav links in light, dark and forced colors.

## Course content colors

Categorical color tokens for course content. CS230's labs hard-code two category colors (for the two kinds of lab) in their own CSS, because the theme has only the semantic colors (accent, success, warning, error) and the three tag hues. Proposed: `category-1` to `category-4` tokens with a light and a dark value, each at 7:1 as text on `page` and `surface`, each with a tinted wash for fills (as `tag-*` have), documented in `docs/tokens.md` and settable in `theme.json`. A category must also carry a word or a shape, never color alone (see [accessibility](accessibility.md)).

## Accessibility

The known findings that need a design decision are in `website/cypress/support/known.js`, each with its reason; [Accessibility](accessibility.md) says how the audit uses them.
