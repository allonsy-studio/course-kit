# Changelog

## 0.4.0

📅 _Released 16 November 2026_

### Minor Changes

- ✨ Add a short date format and the `dateFormats` option, an instructor booking button (`instructor.booking`), and the document contents list after the page on a phone. The rubric's Due column now writes "Fri, Oct 23, 12:00PM" instead of "Friday, October 23, 2026, 12:00PM", so a due date stays on two lines in a narrow column; `<table-rubric date-style="full">` keeps the long form. `<instructor>` renders a button from `instructor.booking` (`{ url, label }`) as the last line of the panel, in both variants, with the new `.cta-button` style. Below 900px the document layout's Contents list follows the page instead of coming first, so the h1 is the first thing on a phone. A `.separators.print-only` row is hidden on screen, and every link directly inside a `.table-light` cell is a 44px target, not only a lone one. (📝 [#38](https://github.com/allonsy-studio/course-kit/pull/38))

  **To upgrade:** A course that overrides `instructor.webc` only to add `<book-appointment>` sets `instructor.booking` and deletes the override; one that overrides `table-rubric.webc` takes the short Due column from the kit's copy. See [docs/migrating/0.4.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.4.0.md).

## 0.3.0

📅 _Released 16 November 2026_

### Minor Changes

- ✨ Remove the eyebrow that repeated the masthead's term and course code from the glossary, schedule, practice worksheet and lesson plans pages. The worksheet keeps its own `eyebrow` label when it sets one. The syllabus's print-only line stays, because the masthead does not print. The copy key `glossary.glossary` is gone. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** A course that overrides the glossary, `schedule-overview`, `practice-worksheet` or `layouts/lesson.webc` removes its term and course code eyebrow, and one that sets `glossary.glossary` in `strings.json` deletes it. See [docs/migrating/0.3.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.3.0.md).

- ♻️ Every page follows the system's light or dark setting, with nothing to override it. The slide deck loses its theme button, its `T` shortcut and the choice it saved in `localStorage`, and the `theme-restore.js` script that applied it goes too. The site, worksheets and notes already followed the system, so nothing changes there. The `deck.cycleColorTheme` copy key is gone with the button. (📝 [#35](https://github.com/allonsy-studio/course-kit/pull/35))

  **To upgrade:** A course that overrides `deck.cycleColorTheme` in `strings.json` must delete that entry, or the build stops with "is not a copy key". A course that copied `deck.webc` or `theme-restore.js` to keep them can delete the copy. A browser keeps its old `theme` entry in `localStorage`; nothing reads it any more.

- ✨ Set the header menu in two columns when it has more than 3 links, so a long menu keeps the header short instead of making it tall. It is on by default, which changes the header of every site with a menu that long; fix it either way with `"navColumns": 1` or `2` in `course.json`, or `nav-columns` on `<masthead>`. The instructor's Contact link counts toward the 3. (📝 [#34](https://github.com/allonsy-studio/course-kit/pull/34))

  **To upgrade:** A site with more than 3 menu links gains two columns; set `"navColumns": 1` to keep a single stack. A course that overrode `nav-links.webc` or `masthead.webc` only to set the menu in two columns can delete the override.

- ✨ Rework the schedule page's "Jump to" row. It drops the Today link, underlines the month on screen as the page scrolls (`aria-current="location"`), carries the Hide past weeks toggle and its status at its end, and is pinned to the top from 640px wide (static below, where it would fill a phone). The key above the weeks no longer prints "graded" after the Test, Graded and Reading check chips; Practice still says "not graded". The copy key `schedule.graded` is gone. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** A course that overrides `schedule-overview` or `schedule-weeks` removes its Today link, moves the toggle (`data-schedule-tools`, `data-hide-past`, `data-schedule-status`) into the row and drops the toolbar over the weeks, and adds the month mark; a course that sets `schedule.graded` in `strings.json` deletes it. See [docs/migrating/0.3.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.3.0.md).

### Patch Changes

- 🐛 Stop printing the `CSSNANO_INSTALLED_PRESET` warning on every build: the minifier now gets the advanced preset as an imported function, not by name. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** None.

- 🐛 Put the page first and the contents list after it in the document layout's source, so a screen reader reaches the page's h1 before the navigation. The grid still shows the contents beside the page, or above it on a narrow screen. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** A course that overrides `layouts/document.webc` takes the new order from the kit's copy, and a course stylesheet that selected `.doc-contents + .content-column` selects `.content-column + .doc-contents` now. See [docs/migrating/0.3.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.3.0.md).

- 🐛 Make `<download-button>` read only a string as its `url`, so a page that does not give one can no longer print Eleventy's `url` filter as the link, and show no link at all when there is no file. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** None. Call it as `<download-button :@url="$data.demo.download">`; see docs/components-reference.md.

- 🐛 Treat a `lessonDemos` that is not a list as no demos. Eleventy passes a computed key as the string "" while it scans a page's dependencies, which made the lesson pages fail unless a course defined `lessonDemos: []`. `lessonDemos` is now documented. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** None. A course can delete its `lessonDemos: []` workaround.

- 🐛 Fix the printed syllabus and the syllabus PDF: the `@page` margins now match the PDF's, so the page footer no longer prints over the last line; paragraphs, list items and definitions use the full width of the page (the on-screen 68ch reading cap is lifted in print); and headings and run-in labels print in the hosted text face instead of whichever serif the build machine has. `yarn check:pdf` checks a built PDF. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** None. A course whose own print stylesheet sets `@page` margins keeps them.

- ✨ Add the `institution.sourceUrl` option: a web address that, when set, adds an "Open source" link to every page's footer (the `nav.openSource` copy key). It is off by default, so nothing changes until a course sets it. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** None. A course that added its own footer link to a repository sets `institution: { sourceUrl }` and deletes it. See [docs/migrating/0.3.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.3.0.md).

- 🐛 Make three more kinds of link 44px targets (WCAG 2.5.5): a link that is a whole cell of a `.table-light` table (the practice index, a course's demo listing), a link that is a whole paragraph of a disclosure (a policy's full-text link), and the footer's course name, which also reads as one run of text again ("CS101: Introduction…") instead of breaking at each span. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** None.

- 🐛 Make the kit's own navigation links 44px targets (WCAG 2.5.5): the home band's Coming up links, the This week card's week and reading links, the document layout's Contents rail, the lesson plan's outline, rail and previous/next/all-lessons links, and the lesson index's links, which are now a list per row. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** None. A course that overrides `layouts/lesson.webc` takes the list markup from the kit's copy. See [docs/migrating/0.3.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.3.0.md).

- 📝 Add `order` to the worksheet schema: the number `<practice-index>` sorts the Practice page by, which the schema was missing. (📝 [#37](https://github.com/allonsy-studio/course-kit/pull/37))

  **To upgrade:** None.

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
