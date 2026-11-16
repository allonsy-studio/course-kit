---
"@allons-y/course-kit": minor
---

✨ Set the header menu in two columns when it has more than 3 links, so a long menu keeps the header short instead of making it tall. It is on by default, which changes the header of every site with a menu that long; fix it either way with `"navColumns": 1` or `2` in `course.json`, or `nav-columns` on `<masthead>`. The instructor's Contact link counts toward the 3.

migration: A site with more than 3 menu links gains two columns; set `"navColumns": 1` to keep a single stack. A course that overrode `nav-links.webc` or `masthead.webc` only to set the menu in two columns can delete the override.
