---
title: __TEST__ practice
description: Practice for __TEST__. Different questions, same topics and kinds of questions.
eyebrow: Practice
heading: __TEST__ practice
lede: Questions in the same shape as the test, on the same topics. Check yourself as you go.
---

<!-- Every question here is new. Reuse no test wording: `node skills/test-generator/lib/guard.js overlap <stems.json> <this file>`. -->

::: terms
- **landmark** — A page region with a role and a name, such as `header` or `nav`. [Week 1 slide 2](1/1#s2)
:::

## 1. Multiple choice

::: choice 1.1
Which element is the landmark for a page's unique content?

source: [Week 1 slide 2](1/1#s2)
why: `main` marks the content that belongs to this page alone.

- [ ] `header`
- [x] `main`
- [ ] `aside`
:::

## 2. Match and fill

::: match 2.1
Match each term to its definition.

why: Each definition names one term.

::: bank
- A. The browser's tree of the page
- B. Attributes that change what a screen reader says
:::

1. DOM — A
2. ARIA — B
:::

::: fill 2.2
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
