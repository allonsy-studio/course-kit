import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every color token, by role. The CSS name is `--color-<key>`.
 * `site` and `deck` are the defaults in base.css and deck.css; a token with no
 * default for a stylesheet is not written to it.
 */
export const TOKENS = [
	{ key: "page", role: "Page background", site: { light: "#fff", dark: "hsl(228deg 20% 12%)" }, deck: { light: "#FBF9F3", dark: "#14131a" } },
	{ key: "surface", role: "Raised or alternate surface: cards, table headers, code", site: { light: "color-mix(in oklab, #414C75 7%, #fff)", dark: "hsl(228deg 18% 17%)" }, deck: { light: "#fff", dark: "#1e1d26" } },
	{ key: "surface-subtle", role: "Faint surface tint", site: { light: "color-mix(in oklab, #414C75 3%, transparent)", dark: "hsl(228deg 18% 20% / 30%)" } },
	{ key: "surface-overlay", role: "Popovers and menus", site: { light: "#fff", dark: "hsl(228deg 15% 30%)" } },
	{ key: "surface-accent", role: "Accent-tinted wash", site: { light: "color-mix(in oklab, var(--color-accent) 14%, transparent)", dark: "color-mix(in oklab, var(--color-accent) 20%, transparent)" }, deck: "color-mix(in oklab, var(--color-accent-strong) 14%, light-dark(white, black))" },
	{ key: "table-header", role: "Table header cells", site: "var(--color-surface)" },
	{ key: "surface-warning", role: "Warning panel background", deck: { light: "#fff2e6", dark: "#3a2314" } },
	{ key: "text", role: "Body text", site: { light: "#33394E", dark: "#FBF9F3" }, deck: { light: "#33394E", dark: "#f2f0f6" } },
	{ key: "text-muted", role: "Secondary text", site: { light: "#414C75", dark: "#C2B1A6" }, deck: { light: "#414C75", dark: "#a8a4b4" } },
	{ key: "border", role: "Lines, rules and borders", site: { light: "color-mix(in oklab, #414C75 22%, #fff)", dark: "hsl(228deg 14% 32%)" }, deck: { light: "#EFEBDF", dark: "#33313e" } },
	{ key: "border-accent", role: "Accent-tinted line", deck: "color-mix(in oklab, var(--color-accent-strong) 40%, light-dark(white, black))" },
	{ key: "accent", role: "Brand color: fills, buttons, rules, the masthead wash", site: { light: "#7A1F34", dark: "#D98A9B" }, deck: { light: "#7A1F34", dark: "#D98A9B" } },
	{ key: "accent-text", role: "Brand color for type, dark enough to read", site: { light: "#7A1F34", dark: "#EBB3C0" }, deck: { light: "#7A1F34", dark: "#EBB3C0" } },
	{ key: "accent-strong", role: "Brand color for decorative marks: the text tone in light mode, the fill in dark", deck: "light-dark(var(--color-accent-text), var(--color-accent))" },
	{ key: "on-accent", role: "Text on a brand-color fill", site: { light: "#FBF9F3", dark: "#181B25" } },
	{ key: "accent-hover", role: "Brand fill, hovered", site: "color-mix(in oklch, var(--color-accent) 40%, transparent)" },
	{ key: "accent-active", role: "Brand fill, pressed", site: "color-mix(in oklch, var(--color-accent) 40%, transparent)" },
	{ key: "link", role: "Links", site: "var(--color-accent-text)" },
	{ key: "link-hover", role: "Links, hovered", site: "color-mix(in oklch, var(--color-link) 90%, var(--color-text))" },
	{ key: "link-focus", role: "Links, focused", site: "color-mix(in oklch, var(--color-link) 90%, var(--color-text))" },
	{ key: "link-active", role: "Links, pressed", site: "color-mix(in oklch, var(--color-link) 90%, var(--color-text))" },
	{ key: "success", role: "Success: correct answers, confirmations", site: { light: "hsl(155deg 55% 35%)", dark: "hsl(155deg 50% 55%)" }, deck: { light: "#1c6135", dark: "#7fd8a0" } },
	{ key: "on-success", role: "Text on a success fill", site: "#FBF9F3" },
	{ key: "error", role: "Error: wrong answers, failures", site: { light: "hsl(0deg 65% 45%)", dark: "hsl(0deg 70% 60%)" }, deck: { light: "#a3261a", dark: "#ff9d8f" } },
	{ key: "on-error", role: "Text on an error fill", site: "#FBF9F3" },
	{ key: "warning", role: "Warnings and cautions", site: { light: "hsl(40deg 86% 50%)", dark: "hsl(42deg 100% 40%)" }, deck: { light: "#8a3500", dark: "#ffb37a" } },
	{ key: "on-warning", role: "Text on a warning fill", site: "#FBF9F3" },
	{ key: "highlight", role: "Highlighted (marked) text", site: { light: "#FFD36C", dark: "#FFC233" } },
	{ key: "tag-test", role: "Glossary tag hue for tests; its tints derive from it", site: { light: "#b37019", dark: "#e7a855" } },
	{ key: "tag-reading", role: "Glossary tag hue for readings; its tints derive from it", site: { light: "#1938b3", dark: "#5572e7" } },
	{ key: "tag-meeting", role: "Glossary tag hue for class meetings; its tints derive from it", site: { light: "#13863d", dark: "#55e78b" } },
	{ key: "code", role: "Preformatted code text and its border", site: "var(--color-text)" },
];

/** Default gradient stops. A theme may list one to four. */
export const GRADIENT = [{ light: "#7A1F34", dark: "#D98A9B" }, "#7BD1E6", { light: "#FFD36C", dark: "#FFC233" }, "#FF9A56"];

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
