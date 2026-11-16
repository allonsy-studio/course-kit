---
"@allons-y/course-kit": minor
---

✨ Rework the schedule page's "Jump to" row. It drops the Today link, underlines the month on screen as the page scrolls (`aria-current="location"`), carries the Hide past weeks toggle and its status at its end, and is pinned to the top from 640px wide (static below, where it would fill a phone). The key above the weeks no longer prints "graded" after the Test, Graded and Reading check chips; Practice still says "not graded". The copy key `schedule.graded` is gone.

migration: A course that overrides `schedule-overview` or `schedule-weeks` removes its Today link, moves the toggle (`data-schedule-tools`, `data-hide-past`, `data-schedule-status`) into the row and drops the toolbar over the weeks, and adds the month mark; a course that sets `schedule.graded` in `strings.json` deletes it. See [docs/migrating/0.3.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.3.0.md).
