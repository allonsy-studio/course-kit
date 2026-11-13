# Backlog

Work that is decided but not done, with the reason. Move an item out when it ships.

## Semantic markup alternatives

A prop that takes a list or an object should also accept the same content as semantic markup in a slot (see the [component rules](components.md)). Done: `assigned-list`, `link-list`, `card-list` (its `cards` slot) and `nav-links`.

- **`link-section`**: not yet. Its scoped CSS hangs off the root `<ul>`, so a slot form would restyle every course. Do it with a wrapper element that carries the scope, in the same change that restyles it.
- **`course-now`, `schedule-weeks`, `demo-weeks`, `schedule-overview`**: not yet. Their `weeks` are computed from the schedule data, so the slot would replace the computation. Options: (a) none; (b) an `<ol>` of weeks, each a `<details>`, written by the author; (c) authored HTML for the whole component.
- **A Markdown table in the slot of `table-rubric` and `slide-timetable`**: deferred; the data form stays the only form for now. The use case to validate is a standard table that the kit's Markdown converter writes for a GFM pipe table (`<table><thead><tr><th>…`, optional `style="text-align:…"` on cells, no `scope`, caption or ids), rendered with the same look as the data form, with `scope` and a caption added at build, and a build failure naming the page and the expected columns when the columns do not match. It was deferred because a WebC component cannot read its slot's HTML, so it cannot add `scope` or a caption or check the columns. Options: (a) an HTML transform that rewrites the table inside `<table-rubric>` after the page renders (closest to the use case; the preview must run the same transform for stories); (b) a markdown-it container (`::: rubric`) that renders the table and runs the checks inside the Markdown pipeline, where the HTML is available; (c) keep the data form only, the choice for now. Re-evaluate later.

## Accessibility

The known findings that need a design decision are in `website/cypress/support/known.js`, each with its reason; [Accessibility](accessibility.md) says how the audit uses them.
