/** Media features each audited mode emulates. */
export const MODES = {
	light: [{ name: "prefers-color-scheme", value: "light" }],
	dark: [{ name: "prefers-color-scheme", value: "dark" }],
	// Windows high contrast.
	"forced-colors": [
		{ name: "forced-colors", value: "active" },
		{ name: "prefers-color-scheme", value: "light" },
	],
};

export const A11Y_MODES = Object.keys(MODES);

export const VIEWPORTS = {
	desktop: [1280, 800],
	mobile: [390, 844],
};

/**
 * Each width and mode the axe audit runs a page in. Forced colors runs at the desktop width only: contrast is skipped
 * there, and the light and dark runs already check the mobile layout's structure.
 */
export const A11Y_RUNS = Object.keys(VIEWPORTS).flatMap((viewport) =>
	A11Y_MODES.filter((mode) => mode !== "forced-colors" || viewport === "desktop").map((mode) => [viewport, mode]),
);

/** WCAG 2.2 AAA rule sets: the A and AA rules, the AAA ones (7:1 contrast among them), & axe's best practices. */
export const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag2aaa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/** The narrowest width a page must reflow to without scrolling sideways (WCAG 1.4.10). */
export const REFLOW_WIDTH = 320;

/** The smallest operable target, in CSS px (WCAG 2.5.5 AAA). */
export const TARGET_MIN = 44;
