import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { WebC } from "@11ty/webc";

import { resolveCopy } from "../lib/copy.js";
import { packageRoot } from "../lib/paths.js";

const NAVIGATION = [
	{ url: "/", title: "Home" },
	{ url: "/schedule/", title: "Schedule" },
	{ url: "/slides/", title: "Slides" },
];

/** Render `<masthead>` with course data and optional attributes, as the base layout would. */
async function render(course = {}, attrs = "") {
	const page = new WebC();
	const site = path.join(packageRoot, "components", "site");
	page.defineComponents([path.join(site, "masthead.webc"), path.join(site, "nav-links.webc"), path.join(packageRoot, "components", "ui", "eyebrow.webc")]);
	page.setHelper("eleventyNavigation", () => NAVIGATION);
	page.setContent(`<masthead ${attrs}></masthead>`);
	const data = { site: { institution: "Example College" }, term: { label: "Fall 2026" }, course: { code: "CS101", name: "Intro", ...course }, schedule: {}, page: { url: "/" }, collections: { all: [] }, copy: resolveCopy() };
	return (await page.compile({ data })).html;
}

/** The opening tag of the hero menu. */
const menu = (html) => html.match(/<nav[^>]*data-context="hero"[^>]*>/)[0];

test("the hero menu is one column unless the course or the tag asks for two", async () => {
	assert.doesNotMatch(menu(await render()), /two-column/);
	assert.doesNotMatch(menu(await render({ navColumns: 1 })), /two-column/);
	assert.match(menu(await render({ navColumns: 2 })), /\bcolumn\b/, "it is still the column variant");
});

test("navColumns 2 sets the menu in two columns", async () => {
	assert.match(menu(await render({ navColumns: 2 })), /two-column/);
	assert.match(menu(await render({}, '@nav-columns="2"')), /two-column/);
});

test("the tag's nav-columns wins over the data, in either direction", async () => {
	assert.doesNotMatch(menu(await render({ navColumns: 2 }, '@nav-columns="1"')), /two-column/);
	assert.match(menu(await render({ navColumns: 1 }, '@nav-columns="2"')), /two-column/);
});

test("both layouts list every link", async () => {
	for (const html of [await render(), await render({ navColumns: 2 })]) {
		for (const { title } of NAVIGATION) assert.match(html, new RegExp(`>${title}</a>`));
	}
});
