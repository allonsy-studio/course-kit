---
"@allons-y/course-kit": patch
---

🐛 Make the kit's own navigation links 44px targets (WCAG 2.5.5): the home band's Coming up links, the This week card's week and reading links, the document layout's Contents rail, the lesson plan's outline, rail and previous/next/all-lessons links, and the lesson index's links, which are now a list per row.

migration: None. A course that overrides `layouts/lesson.webc` takes the list markup from the kit's copy. See [docs/migrating/0.3.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.3.0.md).
