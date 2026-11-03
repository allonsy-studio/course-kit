# Component preview

A page for every component the kit ships, rendered by the kit's own plugin with the starter course's data. What you see is what a course's build produces. It is for people changing the kit; a course does not need it.

```sh
yarn preview          # build, serve at http://localhost:8080, rebuild when a component or story changes
yarn preview:build    # build into preview/_site
```

## What a component page has

| Part | Comes from |
|---|---|
| Summary, props, slots | The component's header comment, the same one [`components-reference.md`](components-reference.md) is written from. |
| Examples | The stories in `preview/stories/<folder>/<name>.stories.js`, each in its own frame. |
| Every option | For a prop with a fixed set of values or a true/false prop, one more frame that shows each value on its own. |
| Source | The markup the preview wrote from the story's `args`. |
| Color tokens | The `--color-*` tokens the component's styles read, each with a light and a dark color picker. |

Each example sits in a **canvas** with three controls, and an **Open on its own** link that opens its frame as a page:

- **Color scheme**: light, system or dark, as icon toggles (a sun, a half-filled circle, a moon).
- **Width**: fill, phone (320px), tablet (768px) or desktop (1024px), as device icons. Hidden on a phone.
- **Check accessibility**: its icon shows the state (idle, running, no violations, violations). It runs [axe-core](https://github.com/dequelabs/axe-core) on the frame as it is now (scheme, width and token values included) and lists each failure.

The [Theme](../preview/content/theme.webc) page lists every color token with a light and a dark color picker. A color applies to every frame, is kept in this browser (`localStorage`, key `kit-preview-tokens`), and reaches other open tabs. A bar under the header counts the values in use, with a Reset.

## Add a story

A new component needs one: `yarn test` fails without it, unless the component renders only inside another (listed in `NO_STORY` in `preview/lib/catalog.js`).

```js
// preview/stories/ui/callout.stories.js
export default { title: "Building blocks/callout" };

export const Default = { args: { default: "<p>Bring a laptop.</p>" } };
```

- `args` are the component's props and slots. A string prop is written `@name="…"`, `true` as a bare `@name`, and any other value (an array, an object) as `:@name`. The `default` arg is the content between the tags; any other slot is a `<template slot="name">`.
- An arg must be a prop or slot in the component's header. A prop the header does not list (such as `href` on `<arrow-link>`) is declared under `argTypes` in the default export.
- `export const Name = { name: "A better title", args }` adds more examples. `height` in the default export gives the frame a minimum height in pixels.
- A component that reads the course's data (`<masthead>`, `<grading>`) needs no args: its story is `export const Default = {}`, and it shows the starter course.
- Practice components read a worksheet from the page. The preview supplies the sample worksheet at `preview/stories/practice/sample.worksheet.md`; a story takes a question from it with `question("2.1")`.

## How it is built

| Path | What |
|---|---|
| `preview/eleventy.config.js` | The kit plugin pointed at `preview/content`, the layouts, and one virtual page per component and per story. |
| `preview/lib/catalog.js` | Reads every component header and story, and lists the pages and frames. |
| `preview/lib/render-story.js` | Writes a story's args as the WebC a page would hold. Eleventy compiles it, so the real component renders. |
| `preview/_includes/` | The preview's own components: `preview-nav`, `preview-canvas`, `preview-component`, `preview-tokens`, `preview-overrides`. |
| `@allons-y/webc-patterns`, `@allons-y/webc-code-sample` | Dev dependencies. The kit's base styles load in a `kit` layer below Norn's, so a Norn component keeps its own look; `shell.css` styles only the preview's own pieces. The page frame uses their `norn-skip-link`, `norn-header`, `norn-side-nav`, `norn-simple-table`, `norn-code-block` and `norn-footer`. The kit's plugin owns the one WebC registration, so they join its `components` list, and the preview adds the helpers they call. |
| `preview/_data` | A link to `examples/starter/_data`, so the preview shows the starter course. |
| `preview/content/assets/` | The canvas controls, the token loader and the preview's styles. |

The preview is not part of the published package: `package.json`'s `files` leaves it out.

## Published preview

`.github/workflows/pages.yml` calls the organization's reusable Pages workflow, as the other Allons-y Studio projects do. `yarn pages:build` (`scripts/build-pages.js`) writes the project's landing site (`website/`) at the root and this preview under `components/`, and `yarn docs:test` audits the landing site before anything is published to the `gh-pages` branch:

- Each push to `main` publishes at the site root: the landing site at <https://allonsy-studio.github.io/course-kit/> and the preview at <https://allonsy-studio.github.io/course-kit/components/>.
- Each pull request from this repository publishes the same two to `preview/<number>/`, gets a comment with the URL, and loses its preview when it closes.

The workflow builds with `PATH_PREFIX` set to the path it serves from. `preview/eleventy.config.js` passes it to Eleventy as `pathPrefix`, and `HtmlBasePlugin` adds it to every link and asset URL in the output, so the layouts and components keep writing root-relative URLs (`/styles/`). The preview's prefix is the site's with `components/` added. A URL built in a script or passed as a prop needs Eleventy's `url` filter. `test/pages.test.js` builds both under a prefix and checks that no link escapes it.

The two builds look like one site. The preview's header, banner and footer come from the landing's data (`website/_data/`, through `ossProps` and `website/lib/chrome.js`), and its links back to the landing are relative, so they work under any prefix. A local `yarn preview` has no landing site beside it, so those links go nowhere there.

Turn on GitHub Pages for the repository with the `gh-pages` branch as the source (Settings, Pages) before the first run.
