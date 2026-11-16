---
"@allons-y/course-kit": minor
---

✨ Add a short date format and the `dateFormats` option, an instructor booking button (`instructor.booking`), and the document contents list after the page on a phone. The rubric's Due column now writes "Fri, Oct 23, 12:00PM" instead of "Friday, October 23, 2026, 12:00PM", so a due date stays on two lines in a narrow column; `<table-rubric date-style="full">` keeps the long form. `<instructor>` renders a button from `instructor.booking` (`{ url, label }`) as the last line of the panel, in both variants, with the new `.cta-button` style. Below 900px the document layout's Contents list follows the page instead of coming first, so the h1 is the first thing on a phone. A `.separators.print-only` row is hidden on screen, and every link directly inside a `.table-light` cell is a 44px target, not only a lone one.

migration: A course that overrides `instructor.webc` only to add `<book-appointment>` sets `instructor.booking` and deletes the override; one that overrides `table-rubric.webc` takes the short Due column from the kit's copy. See [docs/migrating/0.4.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.4.0.md).
