# Slide kinds and copy rules

The deck dialect (`lib/markdown.js`) accepts five slide kinds on
`>>> slide <kind>`: `title`, `section`, `checkpoint`, `vocab`, `api`. An unknown
kind fails the build. The kind lands on `data-kind`; `deck.css` styles it.

**Vocabulary slides** are for concepts: a word a student needs to understand, such
as node, event, or bubbling. A named property, method, or function you write in
code is an **API slide** instead (below). A new term is introduced on its own `vocab` slide,
styled as a dictionary entry on its own teal-blue background: the word as an `#`
heading, one or two plain sentences as the
definition, and an optional `::: example`. One term per slide, so a "vs" pair is
two slides.

```markdown
>>> slide vocab
::: eyebrow
Vocabulary
:::

# node

A single object in the DOM tree: an element, a piece of text, or a comment.

::: example
`document.querySelector("li")` returns one.
:::

::: notes Vocab: node (20 s, inside the next block)
- Say the word, read the definition, move on. No questions yet.
:::

>>>
```

The slide goes **immediately before the first slide that uses the term**, never
after. A title slide's heading and the session's plan slide do not count as use.
It costs no minutes of its own: its note borrows about 20 seconds from the block
it precedes, so the time labels on the other notes stay true. The closing
"Today, by definition" glossary slide stays as the review. Take the definition
from how the deck itself teaches the term, so the two never disagree.

**API slides.** A property, method, or function gets its own `api` slide on a
dark slate ground, in monospace: the class it belongs to in the eyebrow
(`API · Node`), the name as the `#` heading, `::: meta` for the kind and what it
returns, `::: sig` for how it is written, one or two sentences of definition, and
an optional `::: example`, and a `::: ref` link to the reference page (MDN for browser APIs, the language's manual otherwise). The same rules as vocabulary: one name per slide,
immediately before the first slide that uses it, and its note borrows about 20
seconds from the block that follows.

```markdown
>>> slide api
::: eyebrow
API · Node
:::

# childNodes

::: meta
property · read-only · returns a `NodeList`
:::

::: sig
`node.childNodes`
:::

Every child node of a node: elements, text, and the whitespace between tags.

::: example
`ul.childNodes.length` is `5` for a `ul` with two `li` elements.
:::

::: ref
[MDN: childNodes](https://developer.mozilla.org/en-US/docs/Web/API/Node/childNodes)
:::

::: notes API: childNodes (20 s, inside the next block)
- Say what it belongs to and what it returns, then move on.
:::

>>>
```

**Authoring rules** (copy conventions; the same in every course repo):

1. **No stage directions on slides.** The instructor speaks them. Delete
   "write down…", "hands up", "show of hands", "press Space", "stand up",
   "pencils down", and the like. Lab, exercise, and homework **task steps**
   stay: they are the assignment. A break slide is titled "Break: 5 minutes".
2. **Neutral slide copy.** No presumptive or absolute claims about the
   audience or about difficulty ("easy", "simply", "can't"). The blunt
   register goes in the speaker notes. Technical facts stay as written.
3. **Notes are two to four bullets**: cues to act on, never a script.
4. **Prefer a colon to an em dash** in visible slide text.
5. **Fit.** Cut or split; never shrink type. The `deck_slide_budget` warning
   is an estimate at 17.5 lines; `CHECK_FIT` is the measurement. A split slide
   gets its own short heading (never "(continued)") and its own note with a
   shared time window.
6. **Template literals:** on slides write `"$" + n` rather than `` `$${n}` ``;
   the doubled dollar reads as a typo.

**SVG reveals.** A figure that explains a process builds one step at a time.
Three classes do it, all inside an inline `<svg>`:

| Class | Goes on | What it does |
| --- | --- | --- |
| `step` | a `<g>` | Hidden until the next-slide key (or Enter). Steps reveal one at a time, in source order, in the same sequence as the slide's `::: answer` blocks. Print shows every step. |
| `pop` | anything inside a step | Lands with a short scale when its step is revealed, so the eye goes to it. |
| `draw` | a `<path>` or `<line>` inside a step, with `pathLength="1"` | The stroke draws on from its start when its step is revealed. A `marker-end` arrowhead appears when the line arrives. |

```html
<svg viewBox="0 0 480 120" role="img" aria-label="A request goes from the browser to the server.">
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="accent" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="tint" x="20" y="20" width="160" height="80" rx="12"/>
  <text x="100" y="68" text-anchor="middle" font-size="22">Browser</text>
  <g class="step">
    <path class="stroke-accent draw" pathLength="1" d="M188 60 H292" stroke-width="3" marker-end="url(#arrow)"/>
    <g class="pop">
      <rect class="tint" x="300" y="20" width="160" height="80" rx="12"/>
      <text x="380" y="68" text-anchor="middle" font-size="22">Server</text>
    </g>
  </g>
</svg>
```

- `step` is SVG-only. A `::: step` block in a slide's Markdown is an ordinary
  block and is never hidden; a slide's text reveals with `::: answer`.
- `<g class="answer">` still works and behaves like `step`. Use `step` for a
  part of a build, and keep `answer` for the answer to a question.
- Draw the line in the direction it travels: the stroke starts at the path's
  first point.
- `pathLength="1"` is what lets one dash cover a line of any length, so the
  draw needs no script. Without it the line appears with its step and is not
  drawn on. A `draw` stroke is a solid line: it cannot also carry a dash
  pattern of its own.
- A marker `id` is shared by the whole deck: every slide is in one page.

The motion is held to WCAG 2.2 AAA, like the rest of the kit:

| Criterion | How a figure meets it |
| --- | --- |
| 2.3.3 Animation from Interactions (AAA) | The fade, the pop and the draw run only under `prefers-reduced-motion: no-preference`. Otherwise a step appears at once, fully drawn. |
| 2.2.2 Pause, Stop, Hide (A) | Nothing starts by itself or loops. Each animation starts on a key press, runs once, and ends in under a second. |
| 2.3.1 and 2.3.2 Three Flashes (A, AAA) | Nothing blinks: each animation moves one way, once, and changes no color. |
| 2.2.3 No Timing (AAA) | A step waits for the key, and stays once it is shown. |

Two rules for the figure keep it that way:

- **The finished figure says everything.** Print, a reader who asked for less
  motion, and a screen reader all get the figure with every step shown, so
  the order has to read from the drawing (arrowheads, numbers, left to right)
  and the `aria-label` describes the whole process.
- **Put `pop` on a shape or a short label, not on a line of text.** Scaling a
  sentence makes its letters shimmer as they move.

The starter's deck (`examples/starter/content/slides/week-1-day-1.md`) ends
with a figure built this way. The rules are `svg .step`, `.pop` and `.draw` in
`deck.css`. The only script is the key handling, `reveal()` in `deck.js`: the
fade, the pop and the draw are CSS. `test/deck-reveal.test.js`
holds every transition and animation in `deck.css` to the table above.

**Reading size.** A slide is a 16:9 box whose type scales with it, with two
guards for readability. No text renders under 12px: every size that shrinks is
`max(0.75rem, …)`, and at projection sizes the floor never engages. Below an
840px-wide slide (`width < 840px` or `height < 473px`), the `reflow` layer in
`deck.css` drops the box for a scrolling page at reading size: three-column
grids stack and the HUD becomes a bottom bar. That is how a deck reads in an
LMS frame or on a phone. HUD buttons are at least 44px for every pointer, and
an empty table header cell renders as a plain `<td>`.
