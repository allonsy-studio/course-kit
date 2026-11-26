---
"@allons-y/course-kit": minor
---

✂️ The home band drops its This week panel. The Next class card links to its week instead of to its slides.

- `<course-now>` shows the next class and Coming up. The week panel repeated the next class's topic whenever the next class opened the week, as it does over every weekend and break.
- The card's one link is "See the week", to that class's week on the schedule. "Open the slides" is gone: the slides are a click away from the schedule and the menu.
- "See the week" is rendered with the schedule's URL, so it keeps a site's path prefix; the week panel's link, set by the script, did not.
- Removed copy keys: `home.openSlides`, `home.weekThis`, `home.weekNext`, `home.weekFirst`, `home.weekWhen`, `home.weekWhenDay`.

migration: See [Migrating to 0.6.0](docs/migrating/0.6.0.md). A course that overrides one of the removed keys in `strings.json` deletes it, or the build fails with "not a copy key".
