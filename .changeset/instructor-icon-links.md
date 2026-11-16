---
"@allons-y/course-kit": patch
---

✨ Show the instructor's email, message link and blog as icon links in the corner of the panel, with `"contactLinks": "icons"` in `instructor.json` or `contact-links="icons"` on `<instructor>`. It is off by default, so nothing changes until a course turns it on.

migration: None. A course that overrides `instructor.webc` only for these icons can delete the override; see [docs/migrating/0.2.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.2.0.md).
