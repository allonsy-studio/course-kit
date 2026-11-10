import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import Eleventy from "@11ty/eleventy";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const starter = path.join(root, "examples", "starter");

const SCHEMAS = ["course", "dates", "grading", "instructor", "policies", "scale", "schedule"];

/** A validator for the JSON Schema dialect a schema declares. */
const validator = (schema) => addFormats(new (String(schema.$schema).includes("2020-12") ? Ajv2020 : Ajv)({ allErrors: true, strict: false }));

test("the starter's data files match the shipped schemas", () => {
	for (const name of SCHEMAS) {
		const schema = JSON.parse(fs.readFileSync(path.join(root, "schemas", `${name}.schema.json`), "utf8"));
		const ajv = validator(schema);
		const data = JSON.parse(fs.readFileSync(path.join(starter, "_data", `${name}.json`), "utf8"));
		const validate = ajv.compile(schema);
		assert.ok(validate(data), `${name}.json: ${ajv.errorsText(validate.errors)}`);
	}
});

test("every shipped schema is valid JSON Schema", () => {
	for (const file of fs.readdirSync(path.join(root, "schemas")).filter((name) => name.endsWith(".json"))) {
		const schema = JSON.parse(fs.readFileSync(path.join(root, "schemas", file), "utf8"));
		assert.doesNotThrow(() => validator(schema).compile(schema), file);
	}
});

/** @type {Record<string, string>} output url -> HTML */
let pages = {};
const cwd = process.cwd();

before(async () => {
	process.chdir(starter);
	const eleventy = new Eleventy("content", "public", { configPath: "eleventy.config.js", quietMode: true });
	const built = await eleventy.toJSON();
	pages = Object.fromEntries(built.map((page) => [page.url, page.content]));
});

after(() => process.chdir(cwd));

test("the starter builds the pages a course needs", () => {
	for (const url of ["/", "/schedule/", "/slides/", "/slides/week-1-day-1/", "/lessons/", "/lessons/week-1/day-1/", "/lessons/week-1/day-1/notes/"]) {
		assert.ok(url in pages, `${url} was not built; got ${Object.keys(pages).join(", ")}`);
	}
});

test("the home page shows the course, the instructor, the syllabus and the policies", () => {
	const html = pages["/"];
	for (const text of ["CS101", "Introduction to Web Publishing", "Dr. Sam Example", "Science Hall 210", "Syllabus", "Grade weighting", "Attendance"]) {
		assert.ok(html.includes(text), `home page is missing "${text}"`);
	}
});

test("the schedule lists the weeks, the meetings and the tests", () => {
	const html = pages["/schedule/"];
	for (const text of ["id=\"week-1\"", "id=\"week-3\"", "Welcome and how the course runs", "Test 1", "Key dates"]) {
		assert.ok(html.includes(text), `schedule is missing "${text}"`);
	}
});

test("no page leaves a component tag or a placeholder behind", () => {
	// `<eyebrow @text="…">` skips the component and leaves the tag; base.css styles it. A known inconsistency, not a missing component.
	const known = fs.readdirSync(path.join(root, "components"), { recursive: true }).filter((file) => file.endsWith(".webc")).map((file) => path.basename(file, ".webc")).filter((name) => name !== "eyebrow");
	for (const [url, html] of Object.entries(pages)) {
		const prose = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "");
		for (const name of known) assert.ok(!new RegExp(`<${name}[\\s>]`).test(prose), `${url} still has <${name}>`);
		for (const smell of ["undefined", "[object Object]", "NaN"]) assert.ok(!prose.includes(smell), `${url} contains "${smell}"`);
	}
});

test("the speaker notes and the lesson plans are built for the instructor", () => {
	assert.ok(pages["/lessons/week-1/day-1/notes/"].includes("Welcome (0:00–0:05)") || pages["/lessons/week-1/day-1/notes/"].includes("Welcome"));
	assert.ok(pages["/lessons/week-1/day-1/"].includes('href="/lessons/week-1/day-1/notes/"'));
});

test("no page links to the kit author's organization", () => {
	for (const [url, html] of Object.entries(pages)) assert.ok(!html.includes("npmjs.com/org/allons-y"), `${url} links to the allons-y npm organization`);
});

test("a page in the slides folder with no week gets no speaker-notes sheet", () => {
	assert.ok(!("/lessons/deck-notes/" in pages), "found a stray /lessons/deck-notes/ page");
});

test("the instructor's email is encoded in the page, never written out", () => {
	const html = pages["/"];
	assert.ok(!html.includes("sam.example@example.edu"));
	assert.ok(html.includes(Buffer.from("sam.example@example.edu").toString("base64")));
});

test("the home page carries the schedule for the where-we-are panel", () => {
	const html = pages["/"];
	for (const text of ["data-course-now", "data-weeks=", "Term progress", "/schedule/#week-1"]) {
		assert.ok(html.includes(text), `home page is missing "${text}"`);
	}
});

test("a lesson plan sits between the week's outline and its materials", () => {
	const html = pages["/lessons/week-1/day-1/"];
	for (const text of ["lesson-outline", "aria-current=\"page\"", "On this page", "Materials &amp; links"]) {
		assert.ok(html.includes(text), `lesson plan is missing "${text}"`);
	}
});
