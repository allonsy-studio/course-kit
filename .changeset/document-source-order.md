---
"@allons-y/course-kit": patch
---

🐛 Put the page first and the contents list after it in the document layout's source, so a screen reader reaches the page's h1 before the navigation. The grid still shows the contents beside the page, or above it on a narrow screen.

migration: A course that overrides `layouts/document.webc` takes the new order from the kit's copy, and a course stylesheet that selected `.doc-contents + .content-column` selects `.content-column + .doc-contents` now. See [docs/migrating/0.3.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.3.0.md).
