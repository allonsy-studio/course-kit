import js from "@allons-y/opx-lint-js/eslint.config.js";
import json from "@allons-y/opx-lint-json/eslint.config.js";
import md from "@allons-y/opx-lint-md/eslint.config.js";

export default [
	...js,
	...json,
	...md,
	// Built sites and the starter's sample course are output and sample content, not source.
	{ ignores: ["**/_site/**", "**/_a11y/**", "examples/**", "website/cypress/screenshots/**"] },
	// Written by `yarn docs` and `yarn schema`.
	{ ignores: ["docs/components-reference.md", "docs/tokens.md"] },
	// Placeholders and task lists in templates and the sample worksheet that the Markdown rules misread.
	{ ignores: ["skills/test-generator/templates/**", "preview/stories/practice/sample.worksheet.md"] },
	{
		// Scripts the kit publishes, and the preview's own, run in the browser.
		files: ["assets/scripts/**/*.js", "preview/content/assets/**/*.js"],
		languageOptions: { globals: { document: "readonly", window: "readonly", localStorage: "readonly", navigator: "readonly", matchMedia: "readonly", location: "readonly", history: "readonly", URL: "readonly", ResizeObserver: "readonly", OffscreenCanvas: "readonly", CSSStyleSheet: "readonly", CustomEvent: "readonly", getComputedStyle: "readonly", requestAnimationFrame: "readonly", IntersectionObserver: "readonly", HTMLElement: "readonly", customElements: "readonly", Event: "readonly", KeyboardEvent: "readonly", MutationObserver: "readonly", fetch: "readonly", setTimeout: "readonly", clearTimeout: "readonly", Image: "readonly", FormData: "readonly", CSS: "readonly", sessionStorage: "readonly", alert: "readonly", console: "readonly", screen: "readonly", NodeFilter: "readonly", getSelection: "readonly" } },
	},
];
