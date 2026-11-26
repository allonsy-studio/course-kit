---
"@allons-y/course-kit": minor
---

✨ Give the home page band a This week panel, put the booking link in the header, group menu pages under a parent, and drop the rule above section headings.

- `<course-now>` shows This week, the next class and Coming up, side by side as space allows. Coming up leads with each date and has no kind chips. The words under the progress bars are for a screen reader only.
- With `instructor.booking` set, the header carries the booking link on every page and the top menu leaves Contact to the footer.
- A page named as another page's `eleventyNavigation.parent` is a menu group: a label with its children under it.
- An `h2` in the page body opens with space alone: no hairline, no accent bar.
- Selected text is visible: `::selection` is a wash of the accent, not the page color.
- `<schedule-overview>` puts more space between "Jump to" and the month links: 1.5 times the content space beside them, and 0.5rem above them when the row wraps. Hide past weeks is a switch: a small track and a muted label, so it no longer outweighs the month links.
- `<schedule-weeks>` mutes a past week instead of marking it "Done" (the word stays for a screen reader), puts each week's dates and each item's badge at the end of the row, lines the column heads up with their columns, and labels the footer "Resources". The copy key `schedule.weekResources` is renamed `schedule.resources`.
- The "Send me a message" icon is a centered speech bubble.

migration: See [Migrating to 0.5.0](docs/migrating/0.5.0.md). Nothing is required; a course that overrides `course-now.webc`, `masthead.webc` or `nav-links.webc` re-merges its copy.
