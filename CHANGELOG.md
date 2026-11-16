# Changelog

## 0.1.1

📅 _Released 16 November 2026_

### Patch Changes

- 📝 Point the install instructions at the published package: `npm install @allons-y/course-kit`, pinned with `~0.1.0`, and Node 24 or later. (📝 [#30](https://github.com/allonsy-studio/course-kit/pull/30))

## 0.1.0

📅 _Released 13 November 2026_

### Minor Changes

- ✨ Adopt the Course Reader palette, code block and screen patterns, and bring every component to WCAG 2.2 AAA. The markup, class names, data attributes, copy keys and script behavior now match the two course sites, so a course can drop its local copy of a component and take the kit's. (📝 [#26](https://github.com/allonsy-studio/course-kit/pull/26))

  **To upgrade:** Set `institution.timezone`, move wording changes to `_data/strings.json`, and check any color override at 7:1. The full list of breaking changes and steps is in [docs/migrating/0.1.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.1.0.md).
