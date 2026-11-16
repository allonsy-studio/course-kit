---
"@allons-y/course-kit": patch
---

✨ Offer the header menu in two columns, with `"navColumns": 2` in `course.json` or `nav-columns="2"` on `<masthead>`. A long menu then stays short instead of making the header tall. It is off by default (`1`), so nothing changes until a course turns it on.

migration: None. A course that overrode `nav-links.webc` or `masthead.webc` only to set the menu in two columns can delete the override and set `"navColumns": 2`.
