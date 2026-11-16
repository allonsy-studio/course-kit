# Backlog

Work that is decided but not done, with the reason. Move an item out when it ships.

## Semantic markup alternatives

A prop that takes a list or an object should also accept the same content as semantic markup in a slot (see the [component rules](components.md)). Done: `assigned-list`, `link-list`, `card-list` (its `cards` slot) and `nav-links`.

- **`link-section`**: not yet. Its scoped CSS hangs off the root `<ul>`, so a slot form would restyle every course. Do it with a wrapper element that carries the scope, in the same change that restyles it.
- **`course-now`, `schedule-weeks`, `demo-weeks`, `schedule-overview`**: not yet. Their `weeks` are computed from the schedule data, so the slot would replace the computation. Options: (a) none; (b) an `<ol>` of weeks, each a `<details>`, written by the author; (c) authored HTML for the whole component.
- **A Markdown table in the slot of `table-rubric` and `slide-timetable`**: deferred; the data form stays the only form for now. The use case to validate is a standard table that the kit's Markdown converter writes for a GFM pipe table (`<table><thead><tr><th>…`, optional `style="text-align:…"` on cells, no `scope`, caption or ids), rendered with the same look as the data form, with `scope` and a caption added at build, and a build failure naming the page and the expected columns when the columns do not match. It was deferred because a WebC component cannot read its slot's HTML, so it cannot add `scope` or a caption or check the columns. Options: (a) an HTML transform that rewrites the table inside `<table-rubric>` after the page renders (closest to the use case; the preview must run the same transform for stories); (b) a markdown-it container (`::: rubric`) that renders the table and runs the checks inside the Markdown pipeline, where the HTML is available; (c) keep the data form only, the choice for now. Re-evaluate later.

## Instructor booking button

CS230 adds a one-on-one booking button to the instructor panel with `<book-appointment>` and `instructor.booking` (`{ url, label }`), as an override of `instructor.webc`. It is a good candidate for the kit: it is optional data a course either has or does not, it is one link, and it keeps the course on a plain override that must be re-merged on every kit change. Not done; the proposed shape:

- **Data**: `instructor.booking` in `instructor.schema.json`, an object with a required `url` (`format: uri`) and an optional `label`. Absent, nothing renders and no site changes.
- **Copy**: `instructor.bookAnAppointment` ("Book an appointment"), the default label; the course's `bookAppointment` namespace goes away.
- **Component**: a `site/` `<book-appointment>` that reads `instructor.booking` (the course's contact page also places it, so it stays a tag), rendered by `<instructor>` after the note in both the default and the card variants, so it reaches the home page, the syllabus and any hand-written tag with no switch. It is independent of `contactLinks`: with icons on, the button stays a text button under the note, because a booking link is a call to action and needs its words.
- **Styling**: the kit has no `.cta-button`. Add one primitive to the base stylesheet (the accent pill the course uses: 44px, `--color-accent` under `--color-on-accent`, hover from `--color-accent-fill-hover`, forced-colors border, a transition only under `prefers-reduced-motion: no-preference`), and let print show a plain underlined link.
- **Not an `icon-links` entry**: an icon hides the label and a booking button is the page's one primary action.
- **Bump**: patch while `0.x` (an optional addition); tests as for icon links, a golden for the off output plus a render test for on.

## Accessibility

The known findings that need a design decision are in `website/cypress/support/known.js`, each with its reason; [Accessibility](accessibility.md) says how the audit uses them.
