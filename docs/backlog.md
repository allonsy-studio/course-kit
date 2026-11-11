# Backlog

Work that is decided but not done, with the reason. Move an item out when it ships.

## Semantic markup alternatives

A prop that takes a list or an object should also accept the same content as semantic markup in a slot (see the [component rules](components.md)). Done: `assigned-list`, `link-list`, `card-list` (its `cards` slot) and `nav-links`.

- **`link-section`**: not yet. Its scoped CSS hangs off the root `<ul>`, so a slot form would restyle every course. Do it with a wrapper element that carries the scope, in the same change that restyles it.
- **`course-now`, `schedule-weeks`, `demo-weeks`, `schedule-overview`**: not yet. Their `weeks` are computed from the schedule data, so the slot would replace the computation. Options: (a) none; (b) an `<ol>` of weeks, each a `<details>`, written by the author; (c) authored HTML for the whole component.
- **`table-rubric` and `slide-timetable`**: accept a table written in Markdown (the kit's own markdown-it output for a GFM pipe table) in the slot. Blocked on one thing: a WebC component cannot read its slot's HTML, so it cannot add `scope`, a caption or row headers, or check the columns. Options: (a) an HTML transform that rewrites `<table-rubric>`'s table after the page renders, validating the columns and naming the page in the error; (b) a markdown-it container (`::: rubric`) that renders the table and the checks in the Markdown pipeline, where the HTML is available; (c) keep the data form only. The transform (a) is the closest to what was asked; it needs the preview to run the same transform for stories.

## Accessibility

The known findings that need a design decision are in `website/cypress/support/known.js`, each with its reason; [Accessibility](accessibility.md) says how the audit uses them.
