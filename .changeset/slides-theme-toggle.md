---
"@allons-y/course-kit": patch
---

✨ Add the `slides.themeToggle` option (default `true`, so nothing changes): `false` leaves the deck's light, dark and system button out, loads no script that restores the choice, and stores nothing in the browser.

migration: None. A course that removed the button with its own deck layout can set `slides: { themeToggle: false }` and delete that layout.
