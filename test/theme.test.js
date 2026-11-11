import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { tokensDoc } from "../scripts/theme-docs.js";
import { themeSchema } from "../scripts/theme-schema.js";
import { applyTokens, renderColors, resolveTheme, TOKENS } from "../lib/theme.js";

const dirWith = (theme) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "course-kit-theme-"));
	if (theme !== undefined) fs.writeFileSync(path.join(dir, "theme.json"), typeof theme === "string" ? theme : JSON.stringify(theme));
	return dir;
};

test("every token name is --color- plus its key, and no name is a hue", () => {
	const site = renderColors("site", resolveTheme());
	for (const name of site.match(/^--[a-z0-9-]+/gm)) assert.match(name, /^--(color-[a-z0-9-]+|gradient-stops)$/);
	assert.doesNotMatch(site + renderColors("deck", resolveTheme()), /--color-(magenta|cyan|orange|yellow|purple|ink|slate|paper|cream|latte)\b/);
});

test("the defaults render in both stylesheets, each with only the tokens it uses", () => {
	const site = renderColors("site", resolveTheme());
	const deck = renderColors("deck", resolveTheme());
	assert.ok(site.includes("--color-page: light-dark(#FBF9F3, #1C1613);"));
	assert.ok(site.includes("--color-accent-secondary: light-dark(#1F4E9C, #84B0F7);"));
	assert.ok(deck.includes("--color-page: light-dark(#FBF9F3, #1C1613);"));
	assert.ok(!deck.includes("--color-link:"));
	assert.ok(!site.includes("--color-accent-strong:"));
});

test("an override reaches both stylesheets; a deck override reaches decks only", () => {
	const dir = dirWith({ accent: "#1B998B", page: { light: "#FBF9F3", dark: "#181b25" }, deck: { page: "#000" } });
	const theme = resolveTheme({ dataDir: dir });
	assert.ok(renderColors("site", theme).includes("--color-accent: #1B998B;"));
	assert.ok(renderColors("deck", theme).includes("--color-accent: #1B998B;"));
	assert.ok(renderColors("site", theme).includes("--color-page: light-dark(#FBF9F3, #181b25);"));
	assert.ok(renderColors("deck", theme).includes("--color-page: #000;"));
});

test("a site override stays off the decks", () => {
	const theme = resolveTheme({ dataDir: dirWith({ site: { border: "#C2B1A6" }, accent: "#7BD1E6" }) });
	assert.ok(renderColors("site", theme).includes("--color-border: #C2B1A6;"));
	assert.ok(renderColors("deck", theme).includes("--color-border: light-dark(#EFEBDF, #3A2E27);"));
	assert.ok(renderColors("deck", theme).includes("--color-accent: #7BD1E6;"));
	assert.throws(() => resolveTheme({ dataDir: dirWith({ site: { magenta: "#f0f" } }) }), /theme\.site: "magenta" is not a color token/);
});

test("theme.json wins over the config option", () => {
	const theme = resolveTheme({ dataDir: dirWith({ accent: "red" }), theme: { accent: "blue", link: "green" } });
	const site = renderColors("site", theme);
	assert.ok(site.includes("--color-accent: red;"));
	assert.ok(site.includes("--color-link: green;"));
});

test("a gradient of one to four stops, with one stop repeated", () => {
	const four = renderColors("site", resolveTheme());
	assert.ok(four.includes("--gradient-stops: var(--color-gradient-1), var(--color-gradient-2), var(--color-gradient-3), var(--color-gradient-4);"));
	const two = renderColors("site", resolveTheme({ dataDir: dirWith({ gradient: ["#000", "#fff"] }) }));
	assert.ok(two.includes("--gradient-stops: var(--color-gradient-1), var(--color-gradient-2);"));
	assert.ok(!two.includes("--color-gradient-3"));
	const one = renderColors("site", resolveTheme({ dataDir: dirWith({ gradient: ["#000"] }) }));
	assert.ok(one.includes("--gradient-stops: var(--color-gradient-1), var(--color-gradient-1);"));
});

test("a bad theme fails in plain language", () => {
	assert.throws(() => resolveTheme({ dataDir: dirWith({ magenta: "#f0f" }) }), /"magenta" is not a color token/);
	assert.throws(() => resolveTheme({ dataDir: dirWith({ page: "" }) }), /theme\.page must be a color/);
	assert.throws(() => resolveTheme({ dataDir: dirWith({ page: "red; }" }) }), /theme\.page must be a color/);
	assert.throws(() => resolveTheme({ dataDir: dirWith({ page: { light: "#fff" } }) }), /theme\.page must be a color/);
	assert.throws(() => resolveTheme({ dataDir: dirWith({ gradient: [] }) }), /one to four/);
	assert.throws(() => resolveTheme({ dataDir: dirWith({ gradient: ["a", "b", "c", "d", "e"] }) }), /one to four/);
	assert.throws(() => resolveTheme({ dataDir: dirWith("{ not json") }), /not valid JSON/);
	assert.throws(() => applyTokens("/* tokens:nope */", resolveTheme()), /unknown theme token block "nope"/);
});

test("no theme.json is fine", () => {
	assert.doesNotThrow(() => resolveTheme({ dataDir: dirWith() }));
});

test("the shipped stylesheets carry one marker each and keep none after rendering", () => {
	for (const [file, marker] of [["assets/styles/base.css", "tokens:site"], ["assets/styles/deck.css", "tokens:deck"]]) {
		const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
		assert.equal(source.match(/tokens:[a-z-]+/g).join(), marker);
		assert.doesNotMatch(applyTokens(source, resolveTheme()), /tokens:/);
	}
});

test("every color the stylesheets and components use is defined", () => {
	const defined = new Set([...renderColors("site", resolveTheme()).matchAll(/^--([a-z0-9-]+)/gm), ...renderColors("deck", resolveTheme()).matchAll(/^--([a-z0-9-]+)/gm)].map((m) => m[1]));
	["color-drop-target", "color-callout"].forEach((local) => defined.add(local));
	const files = [...fs.readdirSync(new URL("../assets/styles/", import.meta.url)).map((f) => `assets/styles/${f}`), ...fs.readdirSync(new URL("../components/", import.meta.url)).filter((f) => f.endsWith(".webc")).map((f) => `components/${f}`)];
	for (const file of files) {
		const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
		for (const [, name] of source.matchAll(/var\(--((?:color-[a-z0-9-]+)|gradient-stops)/g)) assert.ok(defined.has(name), `${file} uses undefined --${name}`);
	}
});

test("the committed schema matches the token table", () => {
	const committed = JSON.parse(fs.readFileSync(new URL("../schemas/theme.schema.json", import.meta.url), "utf8"));
	assert.deepEqual(committed, themeSchema());
	assert.deepEqual(Object.keys(committed.properties.deck.properties), TOKENS.map((token) => token.key));
});

test("the committed token reference matches the token table", () => {
	assert.equal(fs.readFileSync(new URL("../docs/tokens.md", import.meta.url), "utf8"), tokensDoc());
});

/* ---- WCAG contrast (AAA) ---- */

const clampByte = (x) => Math.min(255, Math.max(0, x));
const toLinear = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => clampByte(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
const hex = (value) => {
	const h = value.replace("#", "");
	const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
	return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toOklab = ([r, g, b]) => {
	const [lr, lg, lb] = [r, g, b].map(toLinear);
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const fromOklab = ([L, a, b]) => {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(fromLinear);
};
/** `color-mix(in oklab, a p%, b)` */
const mix = (a, p, b) => fromOklab(toOklab(a).map((v, i) => v * p + toOklab(b)[i] * (1 - p)));
const luminance = (rgb) => {
	const [r, g, b] = rgb.map(toLinear);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

/** The site color of a token in one mode, as sRGB. Resolves `var()` aliases and `color-mix(in oklab, …)`. */
const resolveColor = (key, mode, seen = []) => {
	const token = TOKENS.find((item) => item.key === key);
	let value = token.site;
	if (value && typeof value === "object") value = value[mode];
	const alias = /^var\(--color-([a-z-]+)\)$/.exec(value);
	if (alias) return resolveColor(alias[1], mode, seen);
	const blend = /^color-mix\(in oklab, var\(--color-([a-z-]+)\) (\d+)%, var\(--color-([a-z-]+)\)\)$/.exec(value);
	if (blend) return mix(resolveColor(blend[1], mode), Number(blend[2]) / 100, resolveColor(blend[3], mode));
	return hex(value);
};

const MODES = ["light", "dark"];
const GROUNDS = ["page", "surface", "code-surface", "surface-overlay"];

test("every text token reads at 7:1 or better on page, surface, code surface and overlay, in both modes", () => {
	for (const mode of MODES) {
		for (const key of ["text", "text-muted", "accent-text", "accent-secondary", "link", "success", "error", "code-text", "code-keyword", "code-string", "code-function", "code-number", "code-comment"]) {
			for (const ground of GROUNDS) {
				const got = ratio(resolveColor(key, mode), resolveColor(ground, mode));
				assert.ok(got >= 7, `${key} on ${ground} (${mode}) is ${got.toFixed(2)}:1`);
			}
		}
	}
});

test("text on a fill reads at 7:1 or better", () => {
	const pairs = [["on-accent", "accent"], ["on-accent", "accent-fill-hover"], ["on-accent-secondary", "accent-secondary"], ["on-success", "success"], ["on-error", "error"], ["on-warning", "warning"], ["on-highlight", "highlight"]];
	for (const mode of MODES) {
		for (const [text, fill] of pairs) {
			const got = ratio(resolveColor(text, mode), resolveColor(fill, mode));
			assert.ok(got >= 7, `${text} on ${fill} (${mode}) is ${got.toFixed(2)}:1`);
		}
	}
});

test("text on the accent washes and the highlighted code line stays at 7:1", () => {
	for (const mode of MODES) {
		for (const [wash, accent] of [["surface-accent", "accent-text"], ["surface-accent-secondary", "accent-secondary"]]) {
			for (const key of ["text", "text-muted", accent]) {
				const got = ratio(resolveColor(key, mode), resolveColor(wash, mode));
				assert.ok(got >= 7, `${key} on ${wash} (${mode}) is ${got.toFixed(2)}:1`);
			}
		}
		for (const key of ["code-text", "code-keyword", "code-string", "code-function", "code-number", "code-comment"]) {
			const got = ratio(resolveColor(key, mode), resolveColor("highlight-line", mode));
			assert.ok(got >= 7, `${key} on highlight-line (${mode}) is ${got.toFixed(2)}:1`);
		}
	}
});

test("the focus ring and the edge of an operable control are 3:1 against page and surface", () => {
	for (const mode of MODES) {
		for (const key of ["focus-ring", "border-strong"]) {
			for (const ground of ["page", "surface"]) {
				const got = ratio(resolveColor(key, mode), resolveColor(ground, mode));
				assert.ok(got >= 3, `${key} on ${ground} (${mode}) is ${got.toFixed(2)}:1`);
			}
		}
	}
});

test("the link color follows the accent text, and the new tokens render", () => {
	const site = renderColors("site", resolveTheme());
	assert.ok(site.includes("--color-link: var(--color-accent-text);"));
	for (const key of ["focus-ring", "border-strong", "on-highlight", "accent-fill-hover", "surface-accent-secondary", "code-surface", "code-edge-neutral", "highlight-line"]) assert.ok(site.includes(`--color-${key}:`), key);
});
