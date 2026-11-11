import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { walk } from "../lib/files.js";
import { pathToFileURL } from "node:url";
import { componentsDoc, readHeader } from "../scripts/component-docs.js";
import { packageRoot } from "../lib/paths.js";

const root = path.join(packageRoot, "components");
const files = walk(root, (name) => name.endsWith(".webc"));
const relative = (file) => path.relative(root, file);

/** The `<style>` blocks of a component, which are plain CSS. A mask's black is not a displayed color. */
const styles = (source) =>
	[...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1].replace(/^.*\bmask:.*$/gm, ""));

test("components live in ui, practice or site", () => {
	const stray = files.filter((file) => !["ui", "practice", "site"].includes(relative(file).split(path.sep)[0]));
	assert.deepEqual(stray.map(relative), []);
});

test("every component opens with a JSDoc header in a setup script", () => {
	const missing = files.filter((file) => !/<script webc:setup>\s*\/\*\*/.test(fs.readFileSync(file, "utf8")));
	assert.deepEqual(missing.map(relative), []);
});

test("ui components take props and slots only, never page data", () => {
	const reading = files.filter((file) => relative(file).startsWith("ui") && fs.readFileSync(file, "utf8").includes("$data"));
	assert.deepEqual(reading.map(relative), []);
});

test("component stylesheets use theme tokens, not color literals", () => {
	const literal = /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i;
	const offenders = files.filter((file) => styles(fs.readFileSync(file, "utf8")).some((css) => literal.test(css)));
	assert.deepEqual(offenders.map(relative), []);
});

test("every component's header has a summary, and every prop and slot a description", () => {
	const gaps = [];
	for (const file of files) {
		const header = readHeader(fs.readFileSync(file, "utf8"));
		if (!header?.summary) gaps.push(`${relative(file)}: no summary`);
		for (const prop of header?.props ?? []) if (!prop.text) gaps.push(`${relative(file)}: prop ${prop.name} has no description`);
		for (const slot of header?.slots ?? []) if (!slot.text) gaps.push(`${relative(file)}: slot ${slot.name} has no description`);
	}
	assert.deepEqual(gaps, []);
});

test("the committed component reference matches the headers (run `yarn docs`)", () => {
	assert.equal(fs.readFileSync(path.join(packageRoot, "docs", "components-reference.md"), "utf8"), componentsDoc());
});

test("assigned-list renders the items array, falls back to its slot's <dl> when the array is empty, and shows chips for a bare @chips", async () => {
	const { WebC } = await import("@11ty/webc");
	const render = async (markup) => {
		const page = new WebC();
		page.defineComponents(path.join(packageRoot, "components", "ui", "assigned-list.webc"));
		page.setContent(markup);
		return (await page.compile({ data: {} })).html;
	};
	const items = ':@items="[{ title: \'Test 1\', kind: \'test\' }]" :@kinds="{ test: \'Test\' }"';
	const dl = "<dl><dt>From the slot</dt><dd>Tue</dd></dl>";
	const withItems = await render(`<assigned-list @label="Due" ${items} @chips>${dl}</assigned-list>`);
	assert.match(withItems, /<li/);
	assert.match(withItems, /due-chip/);
	assert.doesNotMatch(withItems, /From the slot/, "the array wins when it has items");
	const empty = await render(`<assigned-list @label="Due" :@items="[]">${dl}</assigned-list>`);
	assert.match(empty, /From the slot/);
	assert.doesNotMatch(empty, /<li/);
	assert.match(await render(`<assigned-list @label="Due">${dl}</assigned-list>`), /From the slot/);
});

test("link-list, card-list and nav-links render their data, fall back to the slot when it is empty, and hide when both are empty", async () => {
	const { WebC } = await import("@11ty/webc");
	const render = async (file, markup) => {
		const page = new WebC();
		page.defineComponents([path.join(packageRoot, "components", file), path.join(packageRoot, "components", "ui", "eyebrow.webc")]);
		page.setHelper("slugify", (text) => String(text).toLowerCase().replace(/\W+/g, "-"));
		page.setContent(markup);
		return (await page.compile({ data: { copy: {} } })).html;
	};
	const cases = [
		["ui/link-list.webc", "link-list", ':@items="[{ url: \'/a\', name: \'From data\' }]"', "<ul><li><a href='/s'>From slot</a></li></ul>", "default"],
		["ui/card-list.webc", "card-list", ':@items="[{ data: { name: \'From data\' }, page: { url: \'/a\' } }]"', "<ul><li>From slot</li></ul>", "cards"],
		["site/nav-links.webc", "nav-links", ':@navigation="[{ url: \'/a\', title: \'From data\' }]"', "<ul><li><a href='/s'>From slot</a></li></ul>", "default"],
	];
	for (const [file, tag, data, slot, name] of cases) {
		const slotted = name === "default" ? slot : `<template slot="${name}" webc:nokeep>${slot}</template>`;
		const withData = await render(file, `<${tag} ${data}>${slotted}</${tag}>`);
		assert.match(withData, /From data/, `${tag}: the data renders`);
		assert.doesNotMatch(withData, /From slot/, `${tag}: the data wins when it has items`);
		const emptied = await render(file, `<${tag} :@${tag === "nav-links" ? "navigation" : "items"}="[]">${slotted}</${tag}>`);
		assert.match(emptied, /From slot/, `${tag}: an empty array falls back to the slot`);
		assert.match(await render(file, `<${tag}>${slotted}</${tag}>`), /From slot/, `${tag}: a missing prop falls back to the slot`);
	}
});

test("no story writes a link with no name in a slot", async () => {
	const unnamed = [];
	for (const file of walk(path.join(packageRoot, "preview", "stories"), (name) => name.endsWith(".stories.js"))) {
		const stories = await import(pathToFileURL(file).href);
		for (const [exportName, story] of Object.entries(stories)) {
			if (exportName === "default") continue;
			for (const value of Object.values(story.args ?? {})) {
				if (typeof value !== "string") continue;
				for (const [anchor] of value.matchAll(/<a\b[^>]*>\s*<\/a>/g)) if (!/aria-label(ledby)?=/.test(anchor)) unnamed.push(`${path.basename(file)} ${exportName}: ${anchor}`);
			}
		}
	}
	assert.deepEqual(unnamed, []);
});

test("a component's scoped CSS never wraps :host in :is, :where, :not or :has, which WebC's rewriter leaves unrewritten", () => {
	const wrapped = [];
	for (const file of files) {
		const text = fs.readFileSync(file, "utf8");
		for (const [style] of text.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)) if (/:(is|where|not|has)\(\s*:host/.test(style)) wrapped.push(path.relative(root, file));
	}
	assert.deepEqual(wrapped, []);
});

test("every documented prop is read by its component's template or script", () => {
	const unread = [];
	for (const file of files) {
		const text = fs.readFileSync(file, "utf8");
		const setup = /^<script webc:setup>([\s\S]*?)<\/script>/.exec(text);
		if (!setup) continue;
		const names = [...setup[1].matchAll(/@prop \{(?:[^{}]|\{[^{}]*\})*\} \[?([A-Za-z]+)/g)].map((match) => match[1]);
		const body = text.slice(setup[0].length).replace(/<style[\s\S]*?<\/style>/g, "") + setup[1].split("*/").slice(1).join("*/");
		for (const name of names) if (!new RegExp(`(?<![\\w.-])${name}(?![\\w-])`).test(body)) unread.push(`${path.relative(root, file)}: ${name}`);
	}
	assert.deepEqual(unread, []);
});

test("callout colors itself from the type prop or the type attribute, and ignores any other value", async () => {
	const { WebC } = await import("@11ty/webc");
	const render = async (markup) => {
		const page = new WebC();
		page.defineComponents(path.join(packageRoot, "components", "ui", "callout.webc"));
		page.setContent(markup);
		return (await page.compile({ data: {} })).html;
	};
	assert.match(await render('<callout @type="warn">x</callout>'), /class="callout warn"/);
	assert.match(await render("<callout :type=\"'error'\">x</callout>"), /class="callout error"/);
	assert.match(await render("<callout :type=\"'success'\">x</callout>"), /type="success"/);
	assert.match(await render('<callout @type="bogus">x</callout>'), /class="callout"/);
	assert.match(await render("<callout>x</callout>"), /class="callout"/);
});
