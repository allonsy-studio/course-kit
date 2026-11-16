import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { resolveCopy } from "../lib/copy.js";
import { packageRoot } from "../lib/paths.js";

const read = (...parts) => fs.readFileSync(path.join(packageRoot, ...parts), "utf8");

test("no page lets a reader override the system's light or dark setting", () => {
	assert.ok(!fs.existsSync(path.join(packageRoot, "assets", "scripts", "theme-restore.js")), "the saved-theme script is gone");
	const deck = read("layouts", "deck.webc");
	assert.doesNotMatch(deck, /data-toggle-theme|theme-restore/, "the deck has no theme button and loads no saved theme");
	const script = read("assets", "scripts", "deck.js");
	assert.doesNotMatch(script, /colorScheme|dataset\.theme|THEME_KEY|data-toggle-theme/, "the deck script does not set a scheme");
	assert.doesNotMatch(script, /case "t"/i, "there is no theme shortcut");
	assert.doesNotMatch(read("components", "ui", "codepen-embed.webc"), /dataset\.theme\b/, "the embed reads the system only");
});

test("the deck has no wording for a theme button", () => {
	assert.equal("cycleColorTheme" in resolveCopy().deck, false);
});
