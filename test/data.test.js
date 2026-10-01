import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { buildLessons, readCourseData, resolveAudience, resolvePdf, resolveSite, resolveTerm } from "../lib/data/index.js";

const course = { code: "CS101", name: "Intro", term: { year: 2026, season: "fall" } };
const dates = {
	LABELS: { "2026-09-07": "Labor Day" },
	2026: {
		fall: {
			start: "2026-08-19",
			end: "2026-12-03",
			holidays: ["2026-09-07", { start: "2026-10-17", end: "2026-10-20" }],
			deadlines: {
				drop: { date: "2026-08-25", label: "Last day to add or drop", audience: "students" },
				grades: { date: "2026-09-01", label: "Grades due", audience: "faculty" },
			},
			finalExams: { start: "2026-12-07", end: "2026-12-14" },
			readingDays: ["2026-12-04", "2026-12-05"],
		},
	},
};
const schedule = {
	meetings: { days: ["Monday", "Wednesday", "Friday"], time: "9:00AM–9:50AM" },
	weeks: [{ topics: ["Intro"] }, { topics: ["Loops"] }, { topics: ["Test 1"] }, { topics: ["Functions"], resources: [] }],
};

test("resolveTerm labels the term and sorts the key dates", () => {
	const term = resolveTerm({ course, dates });
	assert.equal(term.label, "Fall 2026");
	assert.deepEqual(term.keyDates.map((item) => item.date), [...term.keyDates.map((item) => item.date)].sort());
	assert.ok(term.keyDates.some((item) => item.label === "Labor Day" && item.display === "Monday, September 7, 2026"));
	assert.ok(term.keyDates.some((item) => item.label.startsWith("Reading days") && item.display === "December 4–5, 2026"));
	assert.equal(term.finalExamsDisplay, "December 7–14, 2026");
	assert.deepEqual(term.instructorDates.map((item) => item.label), ["Grades due"]);
});

test("resolveTerm names the missing term", () => {
	assert.throws(() => resolveTerm({ course: { term: { year: 2027, season: "spring" } }, dates }), /2027 spring/);
});

test("buildLessons lays meetings on the calendar and skips days before the term", () => {
	const term = resolveTerm({ course, dates });
	const lessons = buildLessons({ course, dates, schedule, term });
	assert.equal(lessons[0].date, "2026-08-19");
	assert.equal(lessons[0].weekday, "Wednesday");
	assert.equal(lessons[0].day, 2);
	assert.equal(lessons[0].minutes, 50);
	assert.equal(lessons[0].outline.reduce((total, row) => total + row.minutes, 0), 50);
	assert.equal(lessons[0].outline[0].segment, "Welcome, introductions, how the course runs");
	assert.equal(lessons[1].outline[0].segment, "Welcome, recap the previous class, open questions");
});

test("buildLessons marks holidays, numbers real meetings and flags test weeks", () => {
	const term = resolveTerm({ course, dates });
	const lessons = buildLessons({ course, dates, schedule, term });
	const holiday = lessons.find((lesson) => lesson.date === "2026-09-07");
	assert.equal(holiday.noClass, "Labor Day");
	assert.equal(holiday.meeting, null);
	const meetings = lessons.filter((lesson) => lesson.meeting).map((lesson) => lesson.meeting);
	assert.deepEqual(meetings, meetings.map((_, index) => index + 1));
	assert.ok(lessons.filter((lesson) => lesson.week === 3).every((lesson) => lesson.testWeek));
});

test("buildLessons falls back to the default meeting days and tolerates no weeks", () => {
	const term = resolveTerm({ course, dates });
	const lessons = buildLessons({ course, dates, schedule: { weeks: [{ topics: ["A"] }] }, term });
	assert.deepEqual([...new Set(lessons.map((lesson) => lesson.weekday))], ["Thursday"]);
	assert.deepEqual(buildLessons({ course, dates, schedule: {}, term }), []);
});

test("resolveSite derives the address and metadata", () => {
	const env = { CONTEXT: "production", URL: "https://cs101.example.edu/", GITHUB_REPOSITORY: "o/r" };
	const site = resolveSite({ course, pkg: { author: "Ada Lovelace <ada@example.edu> (https://example.edu)" }, institution: { name: "Example College" }, env });
	assert.equal(site.url, "https://cs101.example.edu");
	assert.equal(site.hostname, "https://cs101.example.edu");
	assert.equal(site.preview, false);
	assert.equal(site.author, "Ada Lovelace");
	assert.equal(site.description, "Course content for Example College.");
	assert.equal(site.keywords, "Example College, CS101, Intro, syllabus, course schedule, class resources");
	assert.equal(resolveSite({ course, site: { keywords: "custom" }, env }).keywords, "custom");
});

test("resolveSite falls back to the CI repo for the address", () => {
	const site = resolveSite({ course, env: { GITHUB_REPOSITORY: "Owner/repo" } });
	assert.equal(site.hostname, "https://owner.github.io/repo");
	assert.equal(site.url, "");
	assert.equal(site.preview, true);
});

test("audience and PDF follow the build environment", () => {
	assert.equal(resolveAudience({}).value, "instructor");
	assert.equal(resolveAudience({ ELEVENTY_ENV: "production" }).student, true);
	assert.equal(resolveAudience({ ELEVENTY_ENV: "production", AUDIENCE: "instructor" }).instructor, true);
	assert.equal(resolvePdf({}).available, false);
	assert.equal(resolvePdf({ BUILD_PDF: "1" }).available, true);
	assert.equal(resolvePdf({ ELEVENTY_ENV: "production" }).available, true);
});

test("readCourseData reads the data files and tolerates missing ones", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "course-kit-data-"));
	fs.writeFileSync(path.join(dir, "course.json"), JSON.stringify(course));
	const data = readCourseData(dir);
	assert.equal(data.course.code, "CS101");
	assert.deepEqual(data.schedule, {});
});

test("courseDefines sees a data file or folder of the same name", async () => {
	const { courseDefines } = await import("../lib/data/index.js");
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "course-kit-defines-"));
	fs.writeFileSync(path.join(dir, "site.js"), "export default {};");
	fs.mkdirSync(path.join(dir, "term"));
	assert.equal(courseDefines("site", dir), true);
	assert.equal(courseDefines("term", dir), true);
	assert.equal(courseDefines("lessons", dir), false);
});
