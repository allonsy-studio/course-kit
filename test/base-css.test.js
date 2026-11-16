import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { packageRoot } from "../lib/paths.js";

/** The base stylesheet with whitespace collapsed, so a rule can be matched as one line. */
const css = fs.readFileSync(path.join(packageRoot, "assets", "styles", "base.css"), "utf8").replace(/\s+/g, " ");

test("a print-only row of separators is hidden on screen and a flex row in print", () => {
	assert.match(css, /\.separators\.print-only \{ display: none; \}/, "hidden on screen, beating `.separators { display: flex }`");
	assert.match(css, /\.separators\.print-only \{ @media print \{ display: flex; \} \}/, "flex in print, not `revert`, which would drop the row layout");
});

test("a screen-only row of separators is hidden in print", () => {
	assert.match(css, /\.separators\.screen-only \{ @media print \{ display: none; \} \}/);
});

test("every link directly in a light table's cell is a 44px target, not only a lone one", () => {
	assert.match(css, /\.table-light \{.*?:where\(td, th\) > a \{ display: inline-flex; align-items: center; min-block-size: var\(--target-min\); \}/);
	assert.doesNotMatch(css, /:where\(td, th\) > a:only-child/);
});

test("on a phone a document's page comes before its contents list, as it does in the source", () => {
	const phone = /@media screen and \(width <= 900px\) \{ grid-template-columns: minmax\(0, 1fr\); grid-template-areas: "page" "contents";/;
	assert.match(css, phone);
	assert.match(css, /\.doc-layout\[data-contents="true"\] \{.*?grid-template-areas: "contents page";/, "beside the page on a wide screen");
	const layout = fs.readFileSync(path.join(packageRoot, "layouts", "document.webc"), "utf8");
	assert.ok(layout.indexOf('class="content-column"') < layout.indexOf('class="doc-contents"'), "the page is first in the source, so a screen reader reaches its h1 before the list");
});
