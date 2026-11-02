import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { walk } from "../lib/files.js";
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
