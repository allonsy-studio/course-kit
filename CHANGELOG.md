# Changelog

## 0.2.0

📅 _Released 16 November 2026_

### Minor Changes

- ✨ Show a contents list in the syllabus: a row of links above it, and from 1100px a sticky column beside it that marks the part on screen. It is on by default, which changes the layout of every site's syllabus; leave it out with `"syllabusContents": false` in `course.json` or `<syllabus contents="false">`. (📝 [#32](https://github.com/allonsy-studio/course-kit/pull/32))

  **To upgrade:** A course that overrides `syllabus.webc` only for the contents list can delete the override and its `syllabusExtra` copy keys. See [docs/migrating/0.2.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.2.0.md).

### Patch Changes

- ✨ Show the instructor's email, message link and blog as icon links in the corner of the panel, with `"contactLinks": "icons"` in `instructor.json` or `contact-links="icons"` on `<instructor>`. It is off by default, so nothing changes until a course turns it on. (📝 [#32](https://github.com/allonsy-studio/course-kit/pull/32))

  **To upgrade:** None. A course that overrides `instructor.webc` only for these icons can delete the override; see [docs/migrating/0.2.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.2.0.md).

- 🐛 Stop exposing `$schema` from data files to templates. A loop over `scale`, `policies` or any other JSON data object no longer yields a `$schema` entry; editors still read the key to validate the file. (📝 [#32](https://github.com/allonsy-studio/course-kit/pull/32))

  **To upgrade:** None. A page that skips the `$schema` key by hand can drop that check.

## 0.1.1

📅 _Released 16 November 2026_

### Patch Changes

- 📝 Point the install instructions at the published package: `npm install @allons-y/course-kit`, pinned with `~0.1.0`, and Node 24 or later. (📝 [#30](https://github.com/allonsy-studio/course-kit/pull/30))

## 0.1.0

📅 _Released 13 November 2026_

### Minor Changes

- ✨ Adopt the Course Reader palette, code block and screen patterns, and bring every component to WCAG 2.2 AAA. The markup, class names, data attributes, copy keys and script behavior now match the two course sites, so a course can drop its local copy of a component and take the kit's. (📝 [#26](https://github.com/allonsy-studio/course-kit/pull/26))

  **To upgrade:** Set `institution.timezone`, move wording changes to `_data/strings.json`, and check any color override at 7:1. The full list of breaking changes and steps is in [docs/migrating/0.1.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.1.0.md).
