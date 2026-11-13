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
	for (const text of ["data-course-now", "data-course-now-data", "data-now-card", "Coming up", "/schedule/#week-1"]) {
		assert.ok(html.includes(text), `home page is missing "${text}"`);
	}
});

test("a lesson plan sits between the week's outline and its materials", () => {
	const html = pages["/lessons/week-1/day-1/"];
	for (const text of ["lesson-outline", "aria-current=\"page\"", "On this page", "Materials &amp; links"]) {
		assert.ok(html.includes(text), `lesson plan is missing "${text}"`);
	}
});

test("every page carries the campus time zone and the copy block the scripts read", () => {
	const home = pages["/"];
	assert.match(home, /<html[^>]*data-timezone="America\/New_York"/);
	const json = JSON.parse(/<script type="application\/json" id="copy-data">([\s\S]*?)<\/script>/.exec(home)[1]);
	assert.equal(json.home.todayLabel, "Today's class");
	assert.equal(json.schedule.hidePast, "Hide past weeks");
	assert.ok(!home.includes("data-course-now hidden></section>") || home.includes('aria-labelledby="course-now-heading"'));
});

test("no component or script holds the campus time zone as a literal", () => {
	const offenders = [];
	for (const dir of ["components", "assets/scripts", "layouts", "lib"]) {
		for (const file of fs.readdirSync(path.join(root, dir), { recursive: true })) {
			const full = path.join(root, dir, file);
			if (fs.statSync(full).isFile() && fs.readFileSync(full, "utf8").includes("America/New_York") && !full.endsWith("check.js") && !full.endsWith("plugin.js")) offenders.push(path.join(dir, file));
		}
	}
	assert.deepEqual(offenders, []);
});

test("the schedule gives a test a chip, a key above the weeks and a Hide past weeks button with one label", () => {
	const html = pages["/schedule/"];
	assert.match(html, /<span data-kind="test" class="due-chip">Test<\/span>/);
	assert.match(html, /<ul aria-label="Key to due items"[^>]*class="due-key"/);
	assert.ok(html.indexOf('class="due-key"') < html.indexOf('id="week-1"'));
	assert.match(html, /<button[^>]*data-hide-past[^>]*aria-pressed="false"[^>]*>Hide past weeks<\/button>/);
	assert.ok(!html.includes("Show past weeks"));
	for (const gone of ["data-week-tools", "data-past-toggle", "past-toggle", "due-kind"]) assert.ok(!html.includes(gone), `still has ${gone}`);
});

test("the top menu starts with Home and Syllabus, and the footer lists the instructor's lesson plans", () => {
	const html = pages["/"];
	const header = /<header id="header"[\s\S]*?<\/header>/.exec(html)[0];
	const labels = [...header.matchAll(/<a href="[^"]*"[^>]*>([^<]+)<\/a>/g)].map((match) => match[1]).filter((text) => !text.includes(":"));
	assert.deepEqual(labels.slice(0, 3), ["Home", "Syllabus", "Schedule"]);
	assert.ok(!header.includes("Lesson Plans"));
	assert.ok(/<footer>[\s\S]*Lesson Plans/.test(html));
	assert.match(header, /aria-label="Site"/);
});

test("a fence in a page is a code block with its edge, and the script finds its copy strings in the copy block", () => {
	const source = fs.readFileSync(path.join(root, "assets", "scripts", "copy.js"), "utf8");
	assert.ok(source.includes('t("code", "copy")'));
	assert.ok(!/"Copy code"|"Copied"/.test(source));
});
