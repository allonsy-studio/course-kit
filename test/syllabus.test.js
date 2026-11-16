import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { WebC } from "@11ty/webc";

import { fill, resolveCopy } from "../lib/copy.js";
import { packageRoot } from "../lib/paths.js";

const COURSE = { outcomes: ["Write a page."], textbook: { required: "None." } };
const GRADING = { homework: { title: "Homework", weight: "100%", body: "Weekly." } };

/** Render `<syllabus>` with page data, as a course page would. */
async function render(data = {}, attrs = "") {
	const page = new WebC();
	page.defineComponents([path.join(packageRoot, "components", "site", "syllabus.webc"), path.join(packageRoot, "components", "ui", "callout.webc")]);
	for (const helper of ["fullDate", "timeOfDay", "examSlot", "lastMeeting", "expandTokens", "calloutLabel"]) page.setHelper(helper, (value) => String(value));
	page.setHelper("fill", fill);
	page.setContent(`<syllabus ${attrs}></syllabus>`);
	const compiled = await page.compile({ data: { course: COURSE, grading: GRADING, copy: resolveCopy(), term: { keyDates: [] }, site: {}, schedule: {}, project: {}, ...data } });
	return compiled.html.replace(/<(style|script)[\s\S]*?<\/\1>/g, "");
}

/** The ids the contents list links to, in order. */
const linked = (html) => [...html.matchAll(/<a href="#([\w-]+)">/g)].map((match) => match[1]);

test("the syllabus lists its parts in a labelled nav, in page order, each linking to a heading that exists", async () => {
	const html = await render({ term: { keyDates: [{ label: "Classes begin", display: "Aug 25" }] } });
	assert.match(html, /<nav aria-labelledby="syllabus-contents-label"[^>]*class="syllabus-contents screen-only"/);
	assert.match(html, /<p id="syllabus-contents-label" class="rail-label">Contents<\/p>/);
	const ids = linked(html);
	assert.deepEqual(ids, ["outcomes", "text", "technology", "coursework", "grading", "key-dates"]);
	for (const id of ids) assert.match(html, new RegExp(`<h3 id="${id}">`), `${id} is a heading`);
	assert.deepEqual([...html.matchAll(/<h3 id="([\w-]+)">/g)].map((match) => match[1]), ids, "the headings are in the same order as the links");
	assert.match(html, /style="--parts: 6"/);
});

test("a part the course leaves out is not listed", async () => {
	assert.ok(!linked(await render()).includes("additional-outcomes"));
	assert.ok(!linked(await render()).includes("key-dates"));
	assert.deepEqual(linked(await render({ grading: undefined })), ["outcomes", "text", "technology"]);
	const html = await render({ course: { ...COURSE, additionalOutcomes: ["Compare."] } });
	assert.deepEqual(linked(html).slice(0, 2), ["outcomes", "additional-outcomes"]);
	assert.match(html, /<a href="#additional-outcomes">Additional outcomes<\/a>/);
	assert.match(html, /<h3 id="additional-outcomes">/);
});

test("contents=\"false\" and course.syllabusContents false leave the list out, and the prop wins over the data", async () => {
	for (const html of [await render({}, '@contents="false"'), await render({ course: { ...COURSE, syllabusContents: false } })]) {
		assert.doesNotMatch(html, /syllabus-contents/);
		assert.match(html, /<h3 id="outcomes">/, "the syllabus itself is unchanged");
	}
	assert.match(await render({ course: { ...COURSE, syllabusContents: false } }, '@contents="true"'), /syllabus-contents/);
	assert.match(await render({}, '@contents="true"'), /syllabus-contents/);
	assert.match(await render({ course: { ...COURSE, syllabusContents: true } }), /syllabus-contents/);
});
