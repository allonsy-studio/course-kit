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

**SVG reveals.** A `<g class="answer">` inside a figure reveals on the
next-slide key like a `::: answer` block, and anything inside it marked `.pop`
lands with a short scale (`svg .answer .pop` in `deck.css`).

**Reading size.** A slide is a 16:9 box whose type scales with it, with two
guards for readability. No text renders under 12px: every size that shrinks is
`max(0.75rem, …)`, and at projection sizes the floor never engages. Below an
840px-wide slide (`width < 840px` or `height < 473px`), the `reflow` layer in
`deck.css` drops the box for a scrolling page at reading size: three-column
grids stack and the HUD becomes a bottom bar. That is how a deck reads in an
LMS frame or on a phone. HUD buttons are at least 44px for every pointer, and
an empty table header cell renders as a plain `<td>`.
