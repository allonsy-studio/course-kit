---
"@allons-y/course-kit": patch
---

🐛 Make every deck and speaker-notes link in `<slide-timetable>` a 44px target. Each link sits in a paragraph inside its cell, so the table-wide cell-link rule never reached it and the links stayed at text height.
