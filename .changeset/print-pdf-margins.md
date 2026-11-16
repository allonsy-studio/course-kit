---
"@allons-y/course-kit": patch
---

🐛 Fix the printed syllabus and the syllabus PDF: the `@page` margins now match the PDF's, so the page footer no longer prints over the last line; paragraphs, list items and definitions use the full width of the page (the on-screen 68ch reading cap is lifted in print); and headings and run-in labels print in the hosted text face instead of whichever serif the build machine has. `yarn check:pdf` checks a built PDF.

migration: None. A course whose own print stylesheet sets `@page` margins keeps them.
