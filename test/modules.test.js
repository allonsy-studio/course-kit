import assert from "node:assert/strict";
import { test } from "node:test";

import { dateRange, fullDate, timeOfDay } from "../lib/filters.js";
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
