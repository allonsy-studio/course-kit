# Question types

Every helper is in `lib/items.mjs` and takes `key` as its last argument (except where noted). `key` false builds the student copy; true builds the answer key. A helper returns HTML; join them in a section's `body`.

| Helper | Use for | Call |
|---|---|---|
| `mc` | Multiple choice with a box for the letter | `mc(n, stem, choices, answerIndex, key, { aside })` |
| `fill` | Short answer on writing lines | `fill(n, stem, answer, key, { lines, aside })` |
| `labeledLines` | `Term: ____` rows | `labeledLines([[label, answer], …], key)` |
| `matching` | Rows matched to a shared lettered bank | `matching({ bank, rows: [[label, bankIndex], …], key })` |
| `termMatch` | Terms on the left, lettered definitions on the right | `termMatch({ terms: [[term, defIndex], …], defs, key })` |
| `circleTable` | Circle one option per statement | `circleTable([[statement, optionIndex], …], ["Works", "Doesn't work"], key)` |
| `judgeTable` | Pick a letter per code snippet; the key marks the bad line | `judgeTable({ legend, rows: [{ pre: (key) => html, answer }], key })` |
| `blankTable` | A table with cells to complete | `blankTable({ head, rows: [["x", { answer: "3" }]], key })` |
| `highlighter` | Code blocks: `const { pre } = highlighter(Prism, "python")` | `pre(src, { numbered, bad: [lineIndexes], key })` |
| `svgBox`, `callout` | Write-in boxes and numbered dots inside an SVG figure | `svgBox(x, y, w, h, answer, key)` |
| `mark` | Partial-credit note, key only | `mark("2 for …", key)` |
| `how`, `rubric` | The how-to-answer line, and a sub-question prompt | `how("2 points each")` |

`n` is the item number, printed bold. `aside` puts a code block beside the choices (`mc`) or above the lines (`fill`). Choices, stems and answers are HTML, so use `code("<li>")` for inline code; `esc` escapes text.

## A section

```js
(key) => ({
	n: 3,
	title: "Loops",
	points: 20,
	blurb: "What a loop repeats.",
	body: `
		${how("Multiple choice · 2 points each")}
		${mc(1, "How many times does " + code("range(3)") + " run the loop body?", ["2", "3", "4"], 1, key)}
	`,
});
```

Points across sections must total `meta.total` (default 100); the build stops otherwise.

## Checked Python

For a Python course, give every snippet an id, its source and the exact output, and check them before building:

```js
import { checkSnippets } from "../lib/python-check.mjs";

const snippets = [{ id: "3.1", src: "for i in range(3):\n    print(i)", expect: "0\n1\n2" }];
checkSnippets(snippets);
```

Modes: `run` (exact output), `syntax` (must fail to compile), `hang` (must still be running, for infinite loops). `stdin` feeds `input()`.

## Layout

The stylesheet is `lib/styles.css`. A test adds its own CSS with `css` in `buildTest`. Letter paper, 0.75-inch margins, a page-numbered footer.
