import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkOptions } from "../lib/check.js";
import { COPY_DEFAULTS, copyJson, fill, plural, resolveCopy } from "../lib/copy.js";
import { courseDeadlines, dueKeyItems, dueKindLabel, expandTokens, scheduleWeeks } from "../lib/filters.js";
import { resolveSite } from "../lib/data/site.js";
import { prepareWorksheet, setWorksheetDefaults } from "../lib/worksheets.js";

const dirWith = (strings) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "course-kit-copy-"));
	if (strings !== undefined) fs.writeFileSync(path.join(dir, "strings.json"), typeof strings === "string" ? strings : JSON.stringify(strings));
	return dir;
};

test("the defaults are the spec's strings, home says Today's class and the past-weeks label never swaps", () => {
	assert.equal(COPY_DEFAULTS.home.todayLabel, "Today's class");
	assert.equal(COPY_DEFAULTS.schedule.hidePast, "Hide past weeks");
	assert.ok(!("showPast" in COPY_DEFAULTS.schedule));
	assert.equal(COPY_DEFAULTS.schedule.dueKindReading, "Reading check");
	for (const dropped of ["selfMarked", "notChecked", "navRight", "navWrong", "missedLead", "review", "questions", "seeResults", "results"]) assert.ok(!(dropped in COPY_DEFAULTS.worksheet), dropped);
	assert.equal(COPY_DEFAULTS.worksheet.checkAll, "See results");
});

test("strings.json overrides a key, keeps the rest, and fails on a key that is not a copy key", () => {
	const copy = resolveCopy({ dataDir: dirWith({ schedule: { dueKindReading: "Homework" }, code: { languages: { rust: "Rust" } } }) });
	assert.equal(copy.schedule.dueKindReading, "Homework");
	assert.equal(copy.schedule.dueKindTest, "Test");
	assert.equal(copy.code.languages.rust, "Rust");
	assert.equal(copy.code.languages.bash, "Terminal");
	assert.throws(() => resolveCopy({ dataDir: dirWith({ schedule: { nope: "x" } }) }), /strings\.json: "schedule\.nope" is not a copy key/);
	assert.throws(() => resolveCopy({ dataDir: dirWith({ nowhere: { a: "x" } }) }), /strings\.json: "nowhere\.a" is not a copy key/);
	assert.throws(() => resolveCopy({ dataDir: dirWith({ schedule: { today: 3 } }) }), /must be a string/);
	assert.doesNotThrow(() => resolveCopy({ dataDir: dirWith() }));
	resolveCopy({ dataDir: "_data" });
});

test("a course's own namespaces layer on the shared defaults, strings.json can override them, and a shared name is refused", () => {
	try {
		const copy = resolveCopy({ dataDir: dirWith({ phpLab: { run: "Go" } }), extra: { phpLab: { run: "Run", reset: "Reset" } } });
		assert.equal(copy.phpLab.run, "Go");
		assert.equal(copy.phpLab.reset, "Reset");
		assert.equal(copy.nav.site, "Site");
		assert.throws(() => resolveCopy({ dataDir: dirWith({ phpLab: { nope: "x" } }) }), /"phpLab\.nope" is not a copy key/);
		assert.throws(() => resolveCopy({ extra: { nav: { site: "x" } } }), /"nav" is a shared namespace/);
	} finally {
		resolveCopy({ dataDir: "_data", extra: {} });
	}
});

test("fill replaces placeholders and plural picks the variant for the count", () => {
	assert.equal(fill("Week {week} · {weekday}", { week: 3, weekday: "Tuesday" }), "Week 3 · Tuesday");
	assert.equal(fill("{missing}!", {}), "!");
	assert.equal(fill(plural(COPY_DEFAULTS.home, "dueInDays", 1), { count: 1 }), "In 1 day");
	assert.equal(fill(plural(COPY_DEFAULTS.home, "dueInDays", 3), { count: 3 }), "In 3 days");
	assert.equal(fill(plural(COPY_DEFAULTS.schedule, "pastHidden", 2), { count: 2 }), "2 finished weeks hidden.");
});

test("copyJson carries the copy, the worksheet's own wording, and cannot close its script tag", () => {
	const copy = resolveCopy({ dataDir: dirWith() });
	const json = copyJson({ copy, worksheet: { copy: { ...copy.worksheet, notice: "<b>x</b>" } } });
	assert.ok(!json.includes("<"));
	assert.equal(JSON.parse(json).worksheet.notice, "<b>x</b>");
	assert.equal(JSON.parse(copyJson({ copy })).worksheet.checkAll, "See results");
});

test("the campus zone comes from the config and falls back to UTC", () => {
	assert.equal(resolveSite({ course: { code: "X", name: "Y" }, institution: { timezone: "America/Chicago" }, env: {} }).timezone, "America/Chicago");
	assert.equal(resolveSite({ course: { code: "X", name: "Y" }, env: {} }).timezone, "UTC");
	assert.doesNotThrow(() => checkOptions({}));
});

const lessons = [
	{ week: 1, day: 1, weekday: "Tuesday", date: "2026-09-01", display: "Tuesday, September 1, 2026", time: "10:00AM–11:15AM", topics: ["Intro"], meetingReadings: [{ title: "Read A", href: "/a", due: "2026-09-01", dueTime: "11:59PM" }], due: [{ title: "Lab 1", href: "/lab", due: "2026-09-03", dueTime: "11:59PM" }] },
	{ week: 1, day: 2, weekday: "Thursday", date: "2026-09-03", display: "Thursday, September 3, 2026", time: "10:00AM–11:15AM", topics: ["Test 1"], meetingReadings: [], due: [{ title: "Quiz", due: "2026-09-03", kind: "practice" }] },
	{ week: 2, day: 1, weekday: "Tuesday", date: "2026-09-08", display: "Tuesday, September 8, 2026", time: "10:00AM–11:15AM", topics: ["Test 2"], noClass: "Holiday", meetingReadings: [], due: [] },
];
const weeks = [{ readings: [{ title: "No due", href: "/n" }, { title: "Week reading", href: "/w", due: "2026-09-02" }] }, {}];

test("scheduleWeeks adds a test entry per Test n topic on a day that meets, and kind fallbacks", () => {
	const [first, second] = scheduleWeeks(lessons, weeks);
	assert.deepEqual(first.meetings[0].due.map((item) => [item.title, item.kind]), [["Lab 1", "graded"]]);
	const test1 = first.meetings[1].due.find((item) => item.title === "Test 1");
	assert.deepEqual([test1.kind, test1.due, test1.dueTime, test1.dueLabel, test1.href], ["test", "2026-09-03", "10:00AM", "Thu, Sep 3, 10:00AM", undefined]);
	assert.equal(first.meetings[1].due.find((item) => item.title === "Quiz").kind, "practice");
	assert.equal(first.meetings[0].readings[0].kind, "reading");
	assert.equal(first.readings[0].kind, undefined, "a reading with no due date has no chip");
	assert.equal(first.readings[1].kind, "reading");
	assert.deepEqual(second.meetings[0].due, [], "a holiday carrying a Test topic is skipped");
});

test("courseDeadlines sorts, de-duplicates and covers meetings, readings and the final exam", () => {
	const built = scheduleWeeks(lessons, weeks);
	const list = courseDeadlines(built, { finalExam: { date: "2026-12-08", start: "9:00AM" } });
	assert.deepEqual(list.map((item) => item.title), ["Read A", "Week reading", "Quiz", "Test 1", "Lab 1", "Final exam"]);
	const [readA, , quiz, test1, lab, exam] = list;
	assert.deepEqual([readA.sort, test1.sort, quiz.sort, lab.sort, exam.sort], ["2026-09-01T23:59", "2026-09-03T10:00", "2026-09-03T10:00", "2026-09-03T23:59", "2026-12-08T09:00"]);
	assert.deepEqual([lab.kind, readA.kind, exam.kind, quiz.kind], ["graded", "reading", "test", "practice"]);
	assert.equal(exam.href, undefined);
	assert.equal(courseDeadlines([...built, ...built]).length, 5, "the same iso|title is kept once");
	assert.equal(list.find((item) => item.title === "No due"), undefined);
	assert.equal(courseDeadlines(built, undefined, { ...COPY_DEFAULTS, schedule: { ...COPY_DEFAULTS.schedule, finalExam: "Exam" } }).length, 5);
});

test("the due chips come from the kind table, never from a title", () => {
	assert.equal(dueKindLabel("reading"), "Reading check");
	assert.equal(dueKindLabel("practice", { schedule: { dueKindPractice: "Drill" } }), "Drill");
	const keys = dueKeyItems(scheduleWeeks(lessons, weeks));
	assert.deepEqual(keys.map((key) => [key.kind, key.graded]), [["test", "graded"], ["graded", "graded"], ["reading", "graded"], ["practice", "not graded"]]);
});

test("data tokens in grading prose come from the course's data", () => {
	const data = { schedule: { meetings: { days: ["Tuesday", "Thursday"], time: "10:00AM–11:15AM" } }, lessons, project: { due: "2026-12-03", dueTime: "11:59 pm" }, copy: COPY_DEFAULTS };
	assert.equal(expandTokens("Due at {classStart}, last on {lastClass}; final due {finalDue}.", data), "Due at Tuesday and Thursday at 10:00AM, last on Thursday, September 3, 2026; final due Thursday, December 3, 2026, 11:59PM.");
	assert.equal(expandTokens("{finalDue}", {}), "{finalDue}");
	assert.equal(expandTokens("no tokens", data), "no tokens");
});

test("checkMode is end by default, settable per worksheet and per site, and validated", () => {
	assert.equal(prepareWorksheet({ title: "T", sections: [] }).worksheet.checkMode, "end");
	assert.equal(prepareWorksheet({ title: "T", sections: [], checkMode: "question" }).worksheet.checkMode, "question");
	setWorksheetDefaults({ checkMode: "question" });
	try {
		assert.equal(prepareWorksheet({ title: "T", sections: [] }).worksheet.checkMode, "question");
		assert.equal(prepareWorksheet({ title: "T", sections: [], checkMode: "end" }).worksheet.checkMode, "end");
	} finally {
		setWorksheetDefaults();
	}
	assert.throws(() => prepareWorksheet({ title: "T", sections: [], checkMode: "often" }), /checkMode is "often"/);
	assert.throws(() => setWorksheetDefaults({ checkMode: "often" }), /must be "question" or "end"/);
	assert.throws(() => checkOptions({ worksheets: { checkMode: "often" } }), /worksheets\.checkMode/);
	assert.equal(prepareWorksheet({ title: "T", sections: [] }).worksheet.copy.checkOne, "Check answer");
});
