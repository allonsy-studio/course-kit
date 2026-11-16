import assert from "node:assert/strict";
import { test } from "node:test";

import { checkOptions } from "../lib/check.js";
import { resolveSite } from "../lib/data/site.js";
import { buildStarter } from "./build-options.js";

const footer = (html) => /<footer>[\s\S]*?<\/footer>/.exec(html)[0];

test("without institution.sourceUrl the footer has no source link", async () => {
	const pages = await buildStarter();
	assert.doesNotMatch(footer(pages["/"]), /Open source|class="source"/);
});

test("institution.sourceUrl adds an Open source link to the footer of every page", async () => {
	const pages = await buildStarter({ institution: { name: "Example College", timezone: "America/New_York", sourceUrl: "https://github.com/example/course" } });
	for (const url of ["/", "/schedule/"]) assert.match(footer(pages[url]), /<a href="https:\/\/github\.com\/example\/course" rel="noopener">Open source<\/a>/, url);
});

test("institution.sourceUrl must be a web address, and reaches the site data", () => {
	assert.doesNotThrow(() => checkOptions({ institution: { sourceUrl: "https://github.com/example/course" } }));
	for (const bad of ["github.com/example", "javascript:alert(1)", "", "https://", 3]) assert.throws(() => checkOptions({ institution: { sourceUrl: bad } }), /institution\.sourceUrl/, String(bad));
	assert.equal(resolveSite({ course: { code: "A1", name: "B" }, institution: { sourceUrl: "https://example.org/x" }, env: {} }).sourceUrl, "https://example.org/x");
	assert.equal(resolveSite({ course: { code: "A1", name: "B" }, env: {} }).sourceUrl, "");
});
