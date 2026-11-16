import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { WebC } from "@11ty/webc";

import { resolveCopy } from "../lib/copy.js";
import { packageRoot } from "../lib/paths.js";

const LINKS = [
	{ url: "/", title: "Home" },
	{ url: "/schedule/", title: "Schedule" },
	{ url: "/slides/", title: "Slides" },
	{ url: "/demo/", title: "Demos" },
	{ url: "/glossary/", title: "Glossary" },
];

/** The pages of the site menu: Home, then `count - 1` more. The masthead adds Syllabus after Home. */
const pages = (count) => LINKS.slice(0, count);

/** Render `<masthead>` with course data and optional attributes, as the base layout would. */
async function render(course = {}, attrs = "", { count = 2, instructor } = {}) {
	const page = new WebC();
	const site = path.join(packageRoot, "components", "site");
	page.defineComponents([path.join(site, "masthead.webc"), path.join(site, "nav-links.webc"), path.join(packageRoot, "components", "ui", "eyebrow.webc")]);
	page.setHelper("eleventyNavigation", () => pages(count));
	page.setContent(`<masthead ${attrs}></masthead>`);
	const data = { site: { institution: "Example College" }, term: { label: "Fall 2026" }, course: { code: "CS101", name: "Intro", ...course }, schedule: {}, instructor, page: { url: "/" }, collections: { all: [] }, copy: resolveCopy() };
	return (await page.compile({ data })).html;
}

/** The opening tag of the hero menu. */
const menu = (html) => html.match(/<nav[^>]*data-context="hero"[^>]*>/)[0];

test("the menu is one column with 3 links or fewer, and two with more", async () => {
	// The masthead adds Syllabus, so `count` pages make `count + 1` links.
	assert.doesNotMatch(menu(await render({}, "", { count: 1 })), /two-column/, "2 links");
	assert.doesNotMatch(menu(await render({}, "", { count: 2 })), /two-column/, "3 links");
	assert.match(menu(await render({}, "", { count: 3 })), /two-column/, "4 links");
	assert.match(menu(await render({}, "", { count: 5 })), /two-column/, "6 links");
	assert.match(menu(await render({}, "", { count: 3 })), /\bcolumn\b/, "still the column variant");
});

test("the instructor's contact link counts toward the 3", async () => {
	assert.doesNotMatch(menu(await render({}, "", { count: 2 })), /two-column/);
	assert.match(menu(await render({}, "", { count: 2, instructor: { contact: "/contact/" } })), /two-column/);
});

test("navColumns auto is the same as nothing", async () => {
	assert.doesNotMatch(menu(await render({ navColumns: "auto" }, "", { count: 2 })), /two-column/);
	assert.match(menu(await render({ navColumns: "auto" }, "", { count: 4 })), /two-column/);
	assert.match(menu(await render({}, '@nav-columns="auto"', { count: 4 })), /two-column/);
});

test("navColumns 1 and 2 fix the layout however many links there are", async () => {
	assert.doesNotMatch(menu(await render({ navColumns: 1 }, "", { count: 5 })), /two-column/);
	assert.match(menu(await render({ navColumns: 2 }, "", { count: 1 })), /two-column/);
});

test("the tag's nav-columns wins over the data, in either direction", async () => {
	assert.doesNotMatch(menu(await render({ navColumns: 2 }, '@nav-columns="1"', { count: 1 })), /two-column/);
	assert.match(menu(await render({ navColumns: 1 }, '@nav-columns="2"', { count: 1 })), /two-column/);
	assert.doesNotMatch(menu(await render({}, '@nav-columns="1"', { count: 5 })), /two-column/);
});

test("both layouts list every link", async () => {
	for (const count of [1, 5]) {
		const html = await render({}, "", { count });
		for (const { title } of pages(count)) assert.match(html, new RegExp(`>${title}</a>`));
		assert.match(html, />Syllabus<\/a>/);
	}
});
