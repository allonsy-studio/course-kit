---
"@allons-y/course-kit": minor
---

✨ Remove the eyebrow that repeated the masthead's term and course code from the glossary, schedule, practice worksheet and lesson plans pages. The worksheet keeps its own `eyebrow` label when it sets one. The syllabus's print-only line stays, because the masthead does not print. The copy key `glossary.glossary` is gone.

migration: A course that overrides the glossary, `schedule-overview`, `practice-worksheet` or `layouts/lesson.webc` removes its term and course code eyebrow, and one that sets `glossary.glossary` in `strings.json` deletes it. See [docs/migrating/0.2.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.2.0.md).
