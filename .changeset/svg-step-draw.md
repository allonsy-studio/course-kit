---
"@allons-y/course-kit": patch
---

✨ Build a slide figure in steps. In a deck's inline SVG, a `<g class="step">` stays hidden until the next-slide key, in the same sequence as `::: answer` blocks, and a `<path>` or `<line>` marked `draw`, with `pathLength="1"`, inside it draws on from its start, with its `marker-end` arrowhead arriving last. `<g class="answer">` and `.pop` work as before, and `.pop` now works inside a step too. Motion runs only under `prefers-reduced-motion: no-preference`; print shows every step. The starter's deck ends with a figure that uses all three. See "SVG reveals" in [docs/slides.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/slides.md).
