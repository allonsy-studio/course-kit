import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { applyTokens, resolveTheme } from "../lib/theme.js";

const render = (name, theme) => applyTokens(`/* tokens:${name} */`, resolveTheme(theme));

test("the palette lists the brand neutrals, then each preset", () => {
	const palette = render("palette");
	const names = [...palette.matchAll(/^--([a-z-]+):/gm)].map((match) => match[1]);
	assert.deepEqual(names.slice(0, 5), ["static-ink", "static-slate", "static-paper", "static-cream", "static-latte"]);
	assert.deepEqual(
		names.filter((name) => name.startsWith("static-")).slice(5),
		["static-magenta", "static-orange", "static-cyan", "static-yellow", "static-purple"],
	);
	assert.ok(palette.includes("--on-brand-magenta: var(--static-paper);"));
});

test("section and deck presets render in the same order, in each stylesheet's own names", () => {
	const order = (css) => [...css.matchAll(/\[data-accent="([a-z-]+)"\]/g)].map((match) => match[1]);
	assert.deepEqual(order(render("section-presets")), ["magenta", "cyan", "orange", "yellow", "purple"]);
	assert.deepEqual(order(render("accent-presets")), ["magenta", "cyan", "orange", "yellow", "purple"]);
	assert.ok(render("section-presets").includes("--section-ui: var(--static-cyan);"));
	assert.ok(render("accent-presets").includes("--accent-ui: #7BD1E6;"));
	assert.ok(render("accent-presets").startsWith(":root,\n[data-accent=\"magenta\"]"));
});

test("the white surface renders nothing; paper overrides the surface tokens", () => {
	assert.equal(render("surface", { surface: "white" }), "");
	const paper = render("surface", { surface: "paper" });
	assert.ok(paper.includes("--bg: light-dark(var(--static-paper)"));
	assert.ok(paper.includes(":where(th)"));
});

test("a custom preset joins every generated block", () => {
	const teal = { ui: "#1B998B", text: "light-dark(#0b5b52, #7fd8cc)" };
	const theme = { presets: { teal } };
	assert.ok(render("palette", theme).includes("--static-teal: #1B998B;"));
	assert.ok(render("section-presets", theme).includes('[data-accent="teal"]'));
	assert.ok(render("accent-presets", theme).includes("--accent-text: light-dark(#0b5b52, #7fd8cc);"));
});

test("a bad theme fails loudly", () => {
	assert.throws(() => resolveTheme({ surface: "beige" }), /theme\.surface/);
	assert.throws(() => resolveTheme({ presets: { "Not Valid": { ui: "#000", text: "#000" } } }), /lowercase/);
	assert.throws(() => resolveTheme({ presets: { teal: { ui: "#000" } } }), /both `ui` and `text`/);
	assert.throws(() => applyTokens("/* tokens:nope */", resolveTheme()), /unknown theme token "nope"/);
});

test("the shipped stylesheets use only known markers and leave none behind", () => {
	for (const file of ["assets/styles/base.css", "assets/styles/deck.css"]) {
		const css = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
		assert.ok(/tokens:/.test(css), `${file} has markers`);
		assert.ok(!/tokens:/.test(applyTokens(css, resolveTheme({ surface: "paper" }))), `${file} has none left`);
	}
});
