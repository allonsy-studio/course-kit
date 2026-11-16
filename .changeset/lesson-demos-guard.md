---
"@allons-y/course-kit": patch
---

🐛 Treat a `lessonDemos` that is not a list as no demos. Eleventy passes a computed key as the string "" while it scans a page's dependencies, which made the lesson pages fail unless a course defined `lessonDemos: []`. `lessonDemos` is now documented.

migration: None. A course can delete its `lessonDemos: []` workaround.
