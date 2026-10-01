import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { assetPath, componentFiles, registerAssets, registerGlue } from "../index.js";

/**
 * @returns {string} a fresh temp directory
 */
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "course-kit-"));

/**
 * @returns {{ templates: Record<string, unknown[]>, copies: Record<string, string>[], directoryAssignments: Record<string, string>, addTemplate: Function, addPassthroughCopy: Function }} a stand-in Eleventy config that records registrations
 */
const fakeConfig = () => {
	const config = {
		templates: {},
		copies: [],
		directoryAssignments: { fonts: "fonts" },
		addTemplate: (virtualPath, content, data) => (config.templates[virtualPath] = [content, data]),
		addPassthroughCopy: (map) => config.copies.push(map),
	};
	return config;
};

test("componentFiles lists package components when the course has none", () => {
	const files = componentFiles(path.join(tmp(), "none"));
	assert.ok(files.length > 30);
	assert.ok(files.every((file) => file.endsWith(".webc")));
});

test("componentFiles drops a package component the course defines, and keeps the course's", () => {
	const dir = tmp();
	fs.writeFileSync(path.join(dir, "eyebrow.webc"), "<p></p>");
	const files = componentFiles(dir);
	const names = files.map((file) => path.basename(file, ".webc"));
	assert.equal(names.filter((name) => name === "eyebrow").length, 1);
	assert.ok(files.includes(path.join(dir, "eyebrow.webc")));
});

test("assetPath prefers the course copy, falls back to the package, else null", () => {
	const input = tmp();
	fs.mkdirSync(path.join(input, "styles"));
	fs.writeFileSync(path.join(input, "styles", "base.css"), "/* course */");
	assert.equal(assetPath("styles/base.css", input), path.join(input, "styles", "base.css"));
	assert.match(assetPath("styles/deck.css", input), /assets[\\/]styles[\\/]deck\.css$/);
	assert.equal(assetPath("styles/missing.css", input), null);
});

test("registerAssets skips excluded and course-owned files", () => {
	const input = tmp();
	fs.mkdirSync(path.join(input, "scripts"));
	fs.writeFileSync(path.join(input, "scripts", "today.js"), "");
	const config = fakeConfig();
	registerAssets(config, { inputDir: input, exclude: ["styles/semantics.css"] });
	assert.ok("styles/base.css" in config.templates);
	assert.ok(!("styles/semantics.css" in config.templates));
	assert.ok(!("scripts/today.js" in config.templates));
	assert.ok("scripts/deck.js" in config.templates);
	assert.equal(Object.keys(config.copies[0]).length, 3);
});

test("registerGlue registers a page, and skips one the course defines", async () => {
	const input = tmp();
	const pages = { "lesson-day": "lessons/lesson-day.webc" };
	const config = fakeConfig();
	await registerGlue(config, { inputDir: input, pages });
	assert.ok("lessons/lesson-day.webc" in config.templates);
	assert.equal(config.templates["lessons/lesson-day.webc"][1].instructorOnly, true);

	fs.mkdirSync(path.join(input, "lessons"));
	fs.writeFileSync(path.join(input, "lessons", "lesson-day.webc"), "");
	const skipped = fakeConfig();
	await registerGlue(skipped, { inputDir: input, pages });
	assert.deepEqual(skipped.templates, {});
});
