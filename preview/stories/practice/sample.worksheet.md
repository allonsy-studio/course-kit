---
title: Sample practice worksheet
description: One question of every kind, for the component preview.
eyebrow: Practice
heading: Sample worksheet
lede: One question of every kind.
---

Every question here is checked in the browser, and nothing is sent anywhere.

::: terms
- **landmark** — A page region with a role and a name, such as `header` or `nav`. [Week 1 slide 2](1/1#s2)
:::

## 1. Choice and match

::: choice 1.1
Which element holds the page's main content?

source: [Week 1 slide 2](1/1#s2)
why: `main` is the landmark for the content that is unique to the page.

- [ ] `div`
- [x] `main`
- [ ] `section`
:::

::: match 1.2
Match each element to what it is.

why: Each element names one kind of content.

::: bank
- A. A list of links
- B. The page's footer
:::

1. `nav` — A
2. `footer` — B
:::

## 2. Fill, grid and tree

::: fill 2.1
Complete the markup.

```html
<ul>
  <li>One</li>
</ul>
```

why: A list's only valid child is `li`.

1. The list's tag — `ul`
2. The child's tag — `li`
:::

::: grid 2.2
Which column does each element belong in?

why: Block elements start a new line.

| Element | Block | Inline |
|---|---|---|
| `p` | x | |
| `span` | | x |
:::

::: tree 2.3
Fill in the tree for this markup.

```html
<ul><li>One</li></ul>
```

why: A tree shows each element inside its parent.

- ul
  - ?`li` — the list item
:::

## 3. Judge and self-check

::: legend
- A. Valid and correct
- B. Invalid
:::

::: judge 3.1
Is this markup valid and correct?

verdict: B
why: A list may only hold `li` elements.

```html
  <ul>
! <p>One</p>
  </ul>
```
:::

::: selfcheck 3.2
Explain why a heading level should not be chosen for its size.

::: reveal
- Headings are an outline; the level says where the section sits in it.
:::

::: check
- I mentioned the outline.
:::
:::
