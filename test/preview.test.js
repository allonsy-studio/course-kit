import assert from "node:assert/strict";
import { before, test } from "node:test";

import Eleventy from "@11ty/eleventy";

import { TOKENS } from "../lib/theme.js";
import { buildCatalog, NO_STORY } from "../preview/lib/catalog.js";

/** @type {Record<string, string>} output url -> HTML */
let pages = {};
let catalog;

before(async () => {
	catalog = await buildCatalog();
	const eleventy = new Eleventy("preview/content", "preview/_site", { configPath: "preview/eleventy.config.js", quietMode: true });
	pages = Object.fromEntries((await eleventy.toJSON()).map((page) => [page.url, page.content]));
});

test("every component has a page, and an example unless it renders only inside another", () => {
	assert.ok(catalog.components.length > 40, "the catalog found the components");
	for (const component of catalog.components) {
		assert.ok(component.url in pages, `${component.url} was not built`);
		assert.ok(component.hasStory || NO_STORY.has(component.tag), `${component.tag} needs an example: add preview/stories/${component.group}/${component.tag}.stories.js`);
	}
});

test("every story has a frame that rendered with no leftover error", () => {
	for (const frame of catalog.frames) {
		assert.ok(frame.url in pages, `${frame.url} was not built`);
		assert.ok(!/\[object Object\]|undefined/.test(pages[frame.url].replace(/<(script|style)[\s\S]*?<\/\1>/g, "")), `${frame.url} shows an unfilled value`);
	}
});

test("a component page lists its props, slots and examples", () => {
	const html = pages["/components/ui/assigned-list/"];
	for (const text of ["&lt;assigned-list&gt;", "label", "items", "dueOn", "data-canvas"]) assert.ok(html.includes(text), `the assigned-list page is missing "${text}"`);
});

test("the theme page lists every color token", () => {
	const html = pages["/theme/"];
	for (const { key } of TOKENS) assert.ok(html.includes(`--color-${key}`), `--color-${key} is missing from the theme page`);
});

test("no story names an argument its component does not declare", () => {
	// buildCatalog throws on an arg with no argType; reaching here means every arg matched.
	assert.ok(catalog.frames.length >= catalog.components.length);
});

test("every page has a readable tab title", () => {
	for (const [url, html] of Object.entries(pages)) {
		const title = typeof html === "string" ? html.match(/<title>([^<]*)<\/title>/)?.[1] : undefined;
		if (title === undefined) continue;
		assert.ok(title.trim() && !/function|=>|\[object/.test(title), `${url} has the title "${title}"`);
	}
});

test("built under a path prefix, every link and asset stays under it", async () => {
	const prefix = "/course-kit/preview/12/";
	process.env.PATH_PREFIX = prefix;
	try {
		const eleventy = new Eleventy("preview/content", "preview/_site", { configPath: "preview/eleventy.config.js", quietMode: true });
		const built = await eleventy.toJSON();
		assert.ok(built.length > catalog.components.length, "the preview built");
		for (const page of built.filter((entry) => typeof entry.url === "string" && entry.url.endsWith("/") && typeof entry.content === "string")) {
			const html = page.content.replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/g, "");
			for (const [, url] of html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)) {
				if (url.startsWith("//")) continue;
				assert.ok(url.startsWith(prefix), `${page.url} links to ${url}, outside ${prefix}`);
			}
		}
	} finally {
		delete process.env.PATH_PREFIX;
	}
});

test("a story's wrap and note frame it; the Today link story has a target, and its twin has none", () => {
	const html = (url) => pages[url].replace(/<(script|style)[\s\S]*?<\/\1>/g, "");
	const withTarget = catalog.frames.find((frame) => frame.title === "today-link: Default");
	const without = catalog.frames.find((frame) => frame.title === "today-link: No target");
	assert.match(html(withTarget.url), /id="today"/);
	assert.doesNotMatch(html(without.url), /id="today"/);
	for (const frame of [withTarget, without]) assert.match(html(frame.url), /class="story-note"/, `${frame.url} says what it shows`);
});
