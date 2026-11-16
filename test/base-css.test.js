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
