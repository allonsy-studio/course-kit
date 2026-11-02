import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkOptions, courseWarnings } from "../lib/check.js";
import { readCourseData, resolveTerm } from "../lib/data/index.js";

test("checkOptions accepts the options the README lists", () => {
	assert.doesNotThrow(() =>
		checkOptions({
			inputDir: "content",
			institution: { name: "Example College", timezone: "America/New_York", lms: "Canvas" },
			site: { language: "en-US" },
			demos: { runtime: "codepen" },
			components: ["components/*.webc"],
		}),
	);
	assert.doesNotThrow(() => checkOptions());
	assert.doesNotThrow(() => checkOptions({ pdf: false }));
});

test("checkOptions names a misspelled option and suggests the right one", () => {
	assert.throws(() => checkOptions({ demo: {} }), /unknown option `demo`\. Did you mean `demos`\?/);
	assert.throws(() => checkOptions({ institution: { nmae: "X" } }), /unknown option `institution\.nmae`\. Did you mean `name`\?/);
	assert.throws(() => checkOptions({ banana: 1 }), /unknown option `banana`\. The options are: inputDir/);
});

test("checkOptions rejects a runtime, a time zone and a shape that would be ignored", () => {
	assert.throws(() => checkOptions({ demos: { runtime: "python" } }), /must be one of "none", "codepen", "pyscript"/);
	assert.throws(() => checkOptions({ institution: { timezone: "Mars/Olympus" } }), /not a time zone name/);
	assert.throws(() => checkOptions({ institution: "Example College" }), /`institution` must be an object/);
	assert.throws(() => checkOptions({ components: "components/*.webc" }), /list of file patterns/);
	assert.throws(() => checkOptions("content"), /options must be an object/);
});

test("courseWarnings catches weights and project points that do not add up", () => {
	const grading = { homework: { weight: "40%" }, tests: { weight: "50%" } };
	assert.deepEqual(courseWarnings({ grading }), ["grading.json: the weights add up to 90%, not 100%."]);
	assert.deepEqual(courseWarnings({ grading: { $schema: "x", a: { weight: "60%" }, b: { weight: "40%" } } }), []);
	assert.match(courseWarnings({ project: { scale: 100, components: [{ points: 40 }, { points: 50 }] } })[0], /add up to 90 points, but the project's scale is 100/);
	assert.deepEqual(courseWarnings({}), []);
});

test("a data file that is not valid JSON is named in the error", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kit-data-"));
	fs.writeFileSync(path.join(dir, "schedule.json"), '{"weeks":[{"topics":["Intro"]},]}');
	assert.throws(() => readCourseData(dir), (error) => error.message.includes("schedule.json could not be read as JSON") && error.message.includes("comma"));
});

test("resolveTerm says what is missing and what the calendar has", () => {
	const dates = { 2026: { fall: { start: "2026-08-25", end: "2026-12-10", deadlines: {}, holidays: [], finalExams: { start: "2026-12-14", end: "2026-12-18" } } } };
	assert.throws(() => resolveTerm({ course: {}, dates }), /no course\.json, or it is empty/);
	assert.throws(() => resolveTerm({ course: { code: "CS101" }, dates }), /needs a `term`/);
	assert.throws(() => resolveTerm({ course: { term: { year: 2026, season: "Fall" } }, dates }), /says the term is 2026 Fall, but dates\.json has 2026 fall\. Match the year and season exactly/);
	assert.throws(() => resolveTerm({ course: { term: { year: 2030, season: "fall" } }, dates: {} }), /dates\.json has no terms/);
});
