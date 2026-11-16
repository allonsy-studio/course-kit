---
"@allons-y/course-kit": minor
---

✨ Show a contents list in the syllabus: a row of links above it, and from 1100px a sticky column beside it that marks the part on screen. It is on by default, which changes the layout of every site's syllabus; leave it out with `"syllabusContents": false` in `course.json` or `<syllabus contents="false">`.

migration: A course that overrides `syllabus.webc` only for the contents list can delete the override and its `syllabusExtra` copy keys. See [docs/migrating/0.2.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.2.0.md).
