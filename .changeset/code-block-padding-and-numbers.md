---
"@allons-y/course-kit": patch
---

🐛 Give a code block its own top and bottom padding and sideways scrolling, and line its text up with the title bar.

- The block's `pre` sets its own padding and `overflow-x: auto`, so a page whose reset clears the base `pre` rule no longer shows lines touching the borders or cut off at the edge.
- The lines are set at a line height of 1.2, up from 1 (`--code-line-height`, still settable per block). Code outside a code block, such as a slide's, keeps 1.
- Numbered and unnumbered blocks start their text at the same edge as the title bar's label. The number column is as wide as the last line's number (`--line-digits`, written by the Markdown renderer), so a seven-line block no longer leaves an empty column before its numbers.
