import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every color token, by role. The CSS name is `--color-<key>`.
 * `site` and `deck` are the defaults in base.css and deck.css; a token with no
 * default for a stylesheet is not written to it.
 */
export const TOKENS = [
	{ key: "page", role: "Page background", site: { light: "#FBF9F3", dark: "#1C1613" }, deck: { light: "#FBF9F3", dark: "#1C1613" } },
	{ key: "surface", role: "Raised or alternate surface: cards, table headers, code", site: { light: "#F8F6F0", dark: "#2A211C" }, deck: { light: "#fff", dark: "#2A211C" } },
	{ key: "surface-subtle", role: "Faint surface tint", site: { light: "color-mix(in oklab, #EFEBDF 22%, transparent)", dark: "hsl(22deg 20% 17% / 30%)" } },
	{ key: "surface-overlay", role: "Popovers and menus", site: { light: "#FBF9F3", dark: "#2B2019" } },
	{ key: "surface-accent", role: "Accent-tinted wash, light enough for muted and accent text to stay at 7:1", site: { light: "color-mix(in oklab, var(--color-accent) 7%, var(--color-page))", dark: "color-mix(in oklab, var(--color-accent) 9%, var(--color-page))" }, deck: "color-mix(in oklab, var(--color-accent-strong) 14%, light-dark(white, black))" },
	{ key: "surface-accent-secondary", role: "Wayfinding wash: today, the current week", site: { light: "color-mix(in oklab, var(--color-accent-secondary) 5%, var(--color-page))", dark: "color-mix(in oklab, var(--color-accent-secondary) 9%, var(--color-page))" } },
	{ key: "table-header", role: "Table header cells", site: "var(--color-surface)" },
	{ key: "surface-warning", role: "Warning panel background", deck: { light: "#fff2e6", dark: "#3a2314" } },
	{ key: "text", role: "Body text", site: { light: "#33394E", dark: "#FBF9F3" }, deck: { light: "#33394E", dark: "#FBF9F3" } },
	{ key: "text-muted", role: "Secondary text", site: { light: "#414C75", dark: "#B6AFAB" }, deck: { light: "#414C75", dark: "#B6AFAB" } },
	{ key: "border", role: "Lines, rules and borders", site: { light: "#B6AFAB", dark: "#5A4A40" }, deck: { light: "#EFEBDF", dark: "#3A2E27" } },
	{ key: "border-accent", role: "Accent-tinted line", deck: "color-mix(in oklab, var(--color-accent-strong) 40%, light-dark(white, black))" },
	{ key: "accent", role: "Brand color: fills, buttons, rules, the masthead wash", site: { light: "#8B1E5E", dark: "#F07DB7" }, deck: { light: "#8B1E5E", dark: "#F07DB7" } },
	{ key: "accent-text", role: "Brand color for type, dark enough to read", site: { light: "#8B1E5E", dark: "#FC88C2" }, deck: { light: "#8B1E5E", dark: "#FC88C2" } },
	{ key: "accent-strong", role: "Brand color for decorative marks: the text tone in light mode, the fill in dark", deck: "light-dark(var(--color-accent-text), var(--color-accent))" },
	{ key: "on-accent", role: "Text on a brand-color fill", site: { light: "#FBF9F3", dark: "#1C1613" } },
	{ key: "accent-fill-hover", role: "Solid brand fill, hovered, under on-accent text", site: { light: "#6F1849", dark: "#EE93C2" } },
	{ key: "accent-hover", role: "Brand fill, hovered", site: "color-mix(in oklch, var(--color-accent) 40%, transparent)" },
	{ key: "accent-active", role: "Brand fill, pressed", site: "color-mix(in oklch, var(--color-accent) 40%, transparent)" },
	{ key: "accent-secondary", role: "Wayfinding color: progress, section bars, the current location, highlighted code", site: { light: "#1F4E9C", dark: "#84B0F7" }, deck: { light: "#1F4E9C", dark: "#84B0F7" } },
	{ key: "on-accent-secondary", role: "Text on a wayfinding-color fill", site: { light: "#FBF9F3", dark: "#1C1613" } },
	{ key: "link", role: "Links", site: "var(--color-accent-text)" },
	{ key: "link-hover", role: "Links, hovered", site: "color-mix(in oklch, var(--color-link) 90%, var(--color-text))" },
	{ key: "link-focus", role: "Links, focused", site: "color-mix(in oklch, var(--color-link) 90%, var(--color-text))" },
	{ key: "link-active", role: "Links, pressed", site: "color-mix(in oklch, var(--color-link) 90%, var(--color-text))" },
	{ key: "success", role: "Success: correct answers, confirmations", site: { light: "#0E5F40", dark: "#53C696" }, deck: { light: "#1A6034", dark: "#7fd8a0" } },
	{ key: "on-success", role: "Text on a success fill", site: { light: "#FBF9F3", dark: "#1C1613" } },
	{ key: "error", role: "Error: wrong answers, failures", site: { light: "#A90916", dark: "#FF8D88" }, deck: { light: "#A02317", dark: "#ff9d8f" } },
	{ key: "on-error", role: "Text on an error fill", site: { light: "#FBF9F3", dark: "#1C1613" } },
	{ key: "warning", role: "Warnings and cautions", site: { light: "#FFC143", dark: "#D59719" }, deck: { light: "#8a3500", dark: "#ffb37a" } },
	{ key: "on-warning", role: "Text on a warning fill", site: { light: "#33394E", dark: "#1C1613" } },
	{ key: "highlight", role: "Highlighted (marked) text", site: { light: "#FFD36C", dark: "#FFC233" } },
	{ key: "on-highlight", role: "Text on a highlight fill", site: "#33394E" },
	{ key: "focus-ring", role: "Focus outline (solid, 2.4.13)", site: { light: "#33394E", dark: "#FFC233" } },
	{ key: "border-strong", role: "Edges of anything operable (at least 3:1)", site: { light: "#414C75", dark: "#B6AFAB" } },
	{ key: "tag-test", role: "Glossary tag hue for tests; its tints derive from it", site: { light: "#b37019", dark: "#e7a855" } },
	{ key: "tag-reading", role: "Glossary tag hue for readings; its tints derive from it", site: { light: "#1938b3", dark: "#5572e7" } },
	{ key: "tag-meeting", role: "Glossary tag hue for class meetings; its tints derive from it", site: { light: "#13863d", dark: "#55e78b" } },
	{ key: "code", role: "Preformatted code text and its border", site: "var(--color-text)" },
	{ key: "code-surface", role: "Code block ground", site: { light: "#FFFDF8", dark: "#241C18" } },
	{ key: "code-text", role: "Code text", site: "var(--color-text)" },
	{ key: "code-keyword", role: "Code keywords, and the copy button", site: { light: "#824306", dark: "#E9A35C" } },
	{ key: "code-string", role: "Code strings", site: { light: "#635200", dark: "#FFD36C" } },
	{ key: "code-function", role: "Code functions", site: { light: "#195A6E", dark: "#7BD1E6" } },
	{ key: "code-number", role: "Code numbers", site: { light: "#992D15", dark: "#FF9F80" } },
	{ key: "code-comment", role: "Code comments", site: { light: "#414C75", dark: "#B6AFAB" } },
	{ key: "code-edge-css", role: "Decorative language bar: CSS", site: "#7BD1E6" },
	{ key: "code-edge-js", role: "Decorative language bar: JavaScript", site: "#FFC233" },
	{ key: "code-edge-html", role: "Decorative language bar: HTML", site: "#B0651E" },
	{ key: "code-edge-shell", role: "Decorative language bar: terminal", site: "#D6A86A" },
	{ key: "code-edge-neutral", role: "Decorative language bar: anything else", site: "var(--color-border)" },
	{ key: "highlight-line", role: "Highlighted code line wash", site: { light: "color-mix(in oklab, var(--color-accent-secondary) 3%, var(--color-code-surface))", dark: "color-mix(in oklab, var(--color-accent-secondary) 6%, var(--color-code-surface))" } },
];

/** Default gradient stops. A theme may list one to four. */
export const GRADIENT = [{ light: "#8B1E5E", dark: "#E573AD" }, "#7BD1E6", { light: "#FFD36C", dark: "#FFC233" }, "#FF9A56"];

const KEYS = new Set(TOKENS.map((token) => token.key));
const UNSAFE = /[;{}<>]/;

/**
 * @param {unknown} value a color, or `{ light, dark }`
 * @returns {string} the CSS value
 */
const css = (value) => (typeof value === "string" ? value : `light-dark(${value.light}, ${value.dark})`);

/**
 * @param {unknown} value
 * @param {string} where a path for the error message
 */
const checkColor = (value, where) => {
	const ok = (v) => typeof v === "string" && v.trim() !== "" && !UNSAFE.test(v);
	if (ok(value)) return;
	if (value && typeof value === "object" && ok(value.light) && ok(value.dark) && Object.keys(value).length === 2) return;
	throw new Error(`theme: ${where} must be a color, or { "light": color, "dark": color }`);
};

/**
 * @param {Record<string, unknown>} overrides
 * @param {string} where
 */
const checkOverrides = (overrides, where) => {
	for (const [key, value] of Object.entries(overrides)) {
		if (key === "$schema") continue;
		if (key === "gradient" && where === "theme") {
			if (!Array.isArray(value) || value.length < 1 || value.length > 4) throw new Error("theme: gradient must list one to four colors");
			value.forEach((stop, index) => checkColor(stop, `gradient[${index}]`));
			continue;
		}
		if ((key === "site" || key === "deck") && where === "theme") {
			if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`theme: ${key} must be an object of color overrides`);
			checkOverrides(value, `theme.${key}`);
			continue;
		}
		if (!KEYS.has(key)) throw new Error(`${where}: "${key}" is not a color token. Use one of: ${[...KEYS].join(", ")}`);
		checkColor(value, `${where}.${key}`);
	}
};

/**
 * Throw a plain-language error unless `theme` is a valid theme.json object.
 * @param {unknown} theme
 */
export function validateTheme(theme) {
	if (!theme || typeof theme !== "object" || Array.isArray(theme)) throw new Error("theme: must be an object");
	checkOverrides(theme, "theme");
}

/**
 * The course's theme: `_data/theme.json` over the config option over the defaults.
 * Top-level keys apply to the site and the decks; `site` and `deck` hold overrides for one only.
 * @param {{ dataDir?: string, theme?: object }} [options]
 * @returns {{ overrides: Record<string, unknown>, site: Record<string, unknown>, deck: Record<string, unknown>, gradient: unknown[] }}
 */
export function resolveTheme({ dataDir, theme = {} } = {}) {
	let file = {};
	if (dataDir) {
		try {
			file = JSON.parse(readFileSync(join(dataDir, "theme.json"), "utf8"));
		} catch (error) {
			if (error.code !== "ENOENT") throw new Error(`theme: ${join(dataDir, "theme.json")} is not valid JSON (${error.message})`, { cause: error });
		}
	}
	checkOverrides(theme, "theme");
	checkOverrides(file, "theme");
	const { site: optionSite = {}, deck: optionDeck = {}, gradient: optionGradient, ...optionTokens } = theme;
	const { site: fileSite = {}, deck: fileDeck = {}, gradient: fileGradient, ...fileTokens } = file;
	delete optionTokens.$schema;
	delete fileTokens.$schema;
	return {
		overrides: { ...optionTokens, ...fileTokens },
		site: { ...optionSite, ...fileSite },
		deck: { ...optionDeck, ...fileDeck },
		gradient: fileGradient ?? optionGradient ?? GRADIENT,
	};
}

/**
 * The `--color-*` declarations for one stylesheet.
 * @param {"site" | "deck"} context
 * @param {ReturnType<typeof resolveTheme>} theme
 * @returns {string}
 */
export function renderColors(context, theme) {
	const lines = [];
	for (const token of TOKENS) {
		const fallback = token[context];
		if (fallback === undefined) continue;
		const value = theme[context][token.key] ?? theme.overrides[token.key] ?? fallback;
		lines.push(`--color-${token.key}: ${css(value)};`);
	}
	if (context === "site") {
		const stops = theme.gradient.map((stop, index) => `--color-gradient-${index + 1}: ${css(stop)};`);
		const names = theme.gradient.map((_, index) => `var(--color-gradient-${index + 1})`);
		// A gradient needs two stops; one color repeats.
		if (names.length === 1) names.push(names[0]);
		lines.push(...stops, `--gradient-stops: ${names.join(", ")};`);
	}
	return lines.join("\n");
}

const MARKER = /\/\*\s*tokens:([a-z-]+)\s*\*\//g;

/**
 * Replace each `/* tokens:site *\/` or `/* tokens:deck *\/` marker in a stylesheet.
 * @param {string} source
 * @param {ReturnType<typeof resolveTheme>} theme
 * @returns {string}
 */
export function applyTokens(source, theme) {
	return source.replace(MARKER, (_, name) => {
		if (name !== "site" && name !== "deck") throw new Error(`course-kit: unknown theme token block "${name}"`);
		return renderColors(name, theme);
	});
}
