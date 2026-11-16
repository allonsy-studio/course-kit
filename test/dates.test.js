import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, test } from "node:test";

import { WebC } from "@11ty/webc";

import { checkOptions } from "../lib/check.js";
import { compactDate, dateIn, dueLabel, examSlot, fullDate, scheduleKeyDates, setDateFormats, timeOfDay } from "../lib/filters.js";
import { packageRoot } from "../lib/paths.js";

afterEach(() => setDateFormats());

test("the long form is the default; the short form abbreviates the weekday and month and leaves out the year", () => {
	assert.equal(fullDate("2026-10-23"), "Friday, October 23, 2026");
	assert.equal(compactDate("2026-10-23"), "Fri, Oct 23");
	assert.equal(dateIn("2026-10-23", "short"), "Fri, Oct 23");
	assert.equal(dateIn("2026-10-23", "full"), "Friday, October 23, 2026");
	assert.equal(dateIn("2026-10-23"), "Friday, October 23, 2026");
});

test("a date that is empty or not a date passes through, and a Date object works", () => {
	assert.equal(compactDate(""), "");
	assert.equal(compactDate("soon"), "soon");
	assert.equal(compactDate(new Date("2026-10-23T00:00:00Z")), "Fri, Oct 23");
});

test("due labels use the short form", () => {
	assert.equal(dueLabel({ due: "2026-10-23", dueTime: "12:00 pm" }), "Fri, Oct 23, 12:00PM");
});

test("setDateFormats changes the named formats and the language, and no argument restores them", () => {
	setDateFormats({ short: { month: "numeric", day: "numeric" } });
	assert.equal(compactDate("2026-10-23"), "10/23");
	assert.equal(fullDate("2026-10-23"), "Friday, October 23, 2026", "the long form keeps its default");
	setDateFormats({ locale: "fr-CA" });
	assert.equal(fullDate("2026-10-23"), "vendredi 23 octobre 2026");
	setDateFormats();
	assert.equal(compactDate("2026-10-23"), "Fri, Oct 23");
});

test("the exam slot and the key dates take the short form on request", () => {
	const exam = { date: "2026-12-08", start: "9:00am", end: "12:00pm" };
	assert.equal(examSlot(exam), "Tuesday, December 8, 2026, 9:00AM–12:00PM");
	assert.equal(examSlot(exam, "short"), "Tue, Dec 8, 9:00AM–12:00PM");
	const project = { title: "Final project", components: [{ name: "Plan", date: "2026-11-02", due: "2026-11-02", dueTime: "11:59 pm" }] };
	const dates = (style) => scheduleKeyDates([], project, exam, undefined, style).flatMap((group) => group.items.map((item) => item.date));
	assert.deepEqual(dates(), ["Monday, November 2, 2026, 11:59PM", "Tuesday, December 8, 2026, 9:00AM–12:00PM"]);
	assert.deepEqual(dates("short"), ["Mon, Nov 2, 11:59PM", "Tue, Dec 8, 9:00AM–12:00PM"]);
	assert.equal(timeOfDay("11:59 pm"), "11:59PM");
});

test("the rubric's Due column is short by default, and long with date-style", async () => {
	const render = async (attrs) => {
		const page = new WebC();
		page.defineComponents(path.join(packageRoot, "components", "ui", "table-rubric.webc"));
		page.setHelper("dateIn", dateIn);
		page.setHelper("timeOfDay", timeOfDay);
		page.setContent(`<table-rubric :@criteria="criteria" :@copy="copy" ${attrs}></table-rubric>`);
		const copy = { milestone: "Milestone", due: "Due", points: "Points", whatIsGraded: "What is graded", totalPointsPossible: "Total" };
		const criteria = [{ title: "Plan", due: "2026-10-23", dueTime: "12:00 pm", points: 10, description: "A plan" }, { title: "Draft", points: 5, description: "A draft" }];
		return (await page.compile({ data: { criteria, copy } })).html;
	};
	const due = (html) => [...html.matchAll(/<td role="cell" class="due">.*?<\/td>/g)].map((match) => match[0].replace(/<[^>]+>/g, "").replace(/^Due/, ""));
	assert.deepEqual(due(await render("")), ["Fri, Oct 23, 12:00PM", ""]);
	assert.deepEqual(due(await render('@date-style="full"')), ["Friday, October 23, 2026, 12:00PM", ""]);
	assert.deepEqual(due(await render('@date-style="short"')), ["Fri, Oct 23, 12:00PM", ""]);
});

test("checkOptions accepts the date formats and says what is wrong with one that would be ignored", () => {
	assert.doesNotThrow(() => checkOptions({ dateFormats: { locale: "fr-CA", full: { dateStyle: "full" }, short: { month: "numeric", day: "numeric" } } }));
	assert.throws(() => checkOptions({ dateFormats: { local: "en-US" } }), /unknown option `dateFormats\.local`\. Did you mean `locale`\?/);
	assert.throws(() => checkOptions({ dateFormats: { locale: "not a tag" } }), /not a language tag/);
	assert.throws(() => checkOptions({ dateFormats: { short: "Oct 23" } }), /`dateFormats\.short` must be Intl\.DateTimeFormat options/);
	assert.throws(() => checkOptions({ dateFormats: { full: { month: "huge" } } }), /`dateFormats\.full` must be Intl\.DateTimeFormat options/);
});
