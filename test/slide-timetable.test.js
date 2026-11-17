import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { packageRoot } from "../lib/paths.js";

const source = fs.readFileSync(path.join(packageRoot, "components", "site", "slide-timetable.webc"), "utf8").replace(/\s+/g, " ");

test("a deck link and a speaker-notes link in the slide timetable are 44px targets", () => {
	assert.match(source, /:host :is\(\.deck-title, \.notes\) a \{ display: inline-flex; align-items: center; gap: 0\.25em; min-block-size: var\(--target-min\); \}/);
});

test("both kinds of link sit in a paragraph the rule names", () => {
	assert.match(source, /<p class="deck-title"[^>]*><arrow-link/);
	assert.match(source, /<p class="notes"[^>]*><a /);
});
