import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { walk } from "../lib/files.js";
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
