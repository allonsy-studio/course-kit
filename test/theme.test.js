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
	assert.ok(site.includes("--color-page: light-dark(#fff, hsl(228deg 20% 12%));"));
	assert.ok(deck.includes("--color-page: light-dark(#FBF9F3, #14131a);"));
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
	assert.ok(renderColors("deck", theme).includes("--color-border: light-dark(#EFEBDF, #33313e);"));
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
