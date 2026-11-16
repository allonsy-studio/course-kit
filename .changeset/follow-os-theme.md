---
"@allons-y/course-kit": minor
---

♻️ Every page follows the system's light or dark setting, with nothing to override it. The slide deck loses its theme button, its `T` shortcut and the choice it saved in `localStorage`, and the `theme-restore.js` script that applied it goes too. The site, worksheets and notes already followed the system, so nothing changes there. The `deck.cycleColorTheme` copy key is gone with the button.

migration: A course that overrides `deck.cycleColorTheme` in `strings.json` must delete that entry, or the build stops with "is not a copy key". A course that copied `deck.webc` or `theme-restore.js` to keep them can delete the copy. A browser keeps its old `theme` entry in `localStorage`; nothing reads it any more.
