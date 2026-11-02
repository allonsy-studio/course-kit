import assert from "node:assert/strict";
import { test } from "node:test";

import { dateRange, dueLabel, fullDate, scheduleKeyDates, scheduleMonths, timeOfDay } from "../lib/filters.js";
import { SLIDE_LINE_BUDGET, markdown } from "../lib/markdown.js";
import { processCSS } from "../lib/postcss.js";
import { parseWorksheet, prepareWorksheet } from "../lib/worksheets.js";

test("date filters format ISO dates", () => {
	assert.equal(fullDate("2026-08-19"), "Wednesday, August 19, 2026");
	assert.equal(dateRange("2026-10-17", "2026-10-20"), "October 17–20, 2026");
	assert.equal(dateRange("2026-11-30", "2026-12-04"), "November 30 – December 4, 2026");
	assert.equal(timeOfDay("11:59 pm"), "11:59PM");
});

test("markdown escapes text fences instead of passing them through as HTML", () => {
	const html = markdown.render("```text\n<b>x</b>\n```");
	assert.ok(html.includes("&lt;b&gt;"));
	assert.ok(!html.includes("<b>x</b>"));
	assert.equal(SLIDE_LINE_BUDGET, 17.5);
});

test("prepareWorksheet makes site paths absolute only when given a hostname", () => {
	const authored = {
		title: "T",
		sections: [{ title: "S", questions: [{ id: "q1", kind: "choice", options: ["a", "b"], answer: 0, sources: [{ href: "/slides/x/" }, { href: "https://e.org/y" }] }] }],
	};
	const hrefs = (data) => data.worksheet.sections[0].questions[0].sources.map((source) => source.href);
	assert.deepEqual(hrefs(prepareWorksheet(authored, { hostname: "https://example.edu" })), ["https://example.edu/slides/x/", "https://e.org/y"]);
	assert.deepEqual(hrefs(prepareWorksheet(authored)), ["/slides/x/", "https://e.org/y"]);
	assert.equal(typeof parseWorksheet, "function");
});

test("processCSS minifies in production and keeps only _-prefixed imports inline", async () => {
	const previous = process.env.ELEVENTY_ENV;
	process.env.ELEVENTY_ENV = "production";
	try {
		const css = await processCSS('@import "font.css";\na {\n  color: red;\n}\n', { page: { inputPath: "x.css", outputPath: undefined } });
		assert.ok(css.includes('@import "font.css"'));
		assert.ok(css.includes("a{color:red}"));
	} finally {
		if (previous === undefined) delete process.env.ELEVENTY_ENV;
		else process.env.ELEVENTY_ENV = previous;
	}
});

test("markdown accepts vocab and api slide kinds and rejects unknown ones", () => {
	for (const kind of ["vocab", "api"]) {
		const html = markdown.render(`>>> slide ${kind}\n# term\n\nA definition.\n\n>>>\n`);
		assert.ok(html.includes(`data-kind="${kind}"`));
	}
	assert.throws(() => markdown.render(">>> slide bogus\n# x\n>>>\n"), /bogus/);
});

test("markdown drops ::: tags containers from a deck", () => {
	const html = markdown.render(">>> slide vocab\n# term\n\nA definition.\n\n::: tags\ntest: 2\n:::\n\n>>>\n");
	assert.ok(html.includes("A definition."));
	assert.ok(!html.includes("test: 2"));
});

test("judge questions carry highlighted lines and a snippet's fence language", () => {
	const authored = {
		title: "T",
		sections: [{ title: "S", questions: [{ id: "q1", kind: "judge", lang: "python", code: "x = 1", lines: ["def f():", "    return 'a'"], answer: 1 }] }],
	};
	const [question] = prepareWorksheet(authored).worksheet.sections[0].questions;
	assert.equal(question.codeLines.length, 2);
	assert.match(question.codeLines[0].html, /<span class="token keyword">def<\/span>/);
	assert.match(question.codeHtml, /<span class="token number">1<\/span>/);
});

test("dueLabel reads a due date and time, or nothing", () => {
	assert.equal(dueLabel({ due: "2026-10-27", dueTime: "11:59 pm" }), "Tue, Oct 27, 11:59PM");
	assert.equal(dueLabel({ due: "2026-10-27" }), "Tue, Oct 27");
	assert.equal(dueLabel({}), "");
});

test("scheduleMonths links each month with a meeting to its first week", () => {
	const weeks = [
		{ week: 1, meetings: [{ iso: "2026-08-31" }, { iso: "2026-09-01" }] },
		{ week: 2, meetings: [{ iso: "2026-09-07", noClass: "Labor Day" }, { iso: "2026-09-08" }] },
		{ week: 3, meetings: [{ iso: "2026-10-01", noClass: "Break" }] },
	];
	assert.deepEqual(scheduleMonths(weeks), [{ name: "August", week: 1 }, { name: "September", week: 1 }]);
	assert.deepEqual(scheduleMonths(), []);
});

test("scheduleKeyDates groups tests, milestones, the exam and no-class days, and leaves out empty groups", () => {
	const lessons = [
		{ display: "Tuesday, October 6, 2026", topics: ["Test 1"] },
		{ display: "Tuesday, October 13, 2026", topics: ["Test 2"], noClass: "Fall break" },
	];
	const project = { title: "Final project", components: [{ name: "Plan", date: "2026-11-02", dueTime: "start of class" }] };
	const groups = scheduleKeyDates(lessons, project, { date: "2026-12-08", start: "9:00am", end: "12:00pm" });
	assert.deepEqual(groups.map((group) => group.title), ["Tests", "Final project", "Final exam", "No class"]);
	assert.deepEqual(groups[0].items, [{ label: "Test 1", date: "Tuesday, October 6, 2026" }]);
	assert.equal(groups[1].items[0].label, "Plan");
	assert.deepEqual(scheduleKeyDates([], undefined, undefined), []);
});
