import assert from "node:assert/strict";
import { test } from "node:test";

import { checkOptions } from "../lib/check.js";
import { buildStarter } from "./build-options.js";

const DECK = "/slides/week-1-day-1/";

test("a deck has its theme switcher and the script that restores the choice by default", async () => {
	const html = (await buildStarter())[DECK];
	assert.match(html, /data-toggle-theme/);
	assert.match(html, /localStorage\.getItem\("theme"\)/, "the restore script runs in the head");
});

test("slides.themeToggle false leaves out the button and the restore script", async () => {
	const html = (await buildStarter({ slides: { themeToggle: false } }))[DECK];
	assert.doesNotMatch(html, /data-toggle-theme/);
	assert.doesNotMatch(html.replace(/<script type="module"[\s\S]*?<\/script>/g, ""), /localStorage/, "no script in the head touches the browser's storage");
	assert.match(html, /data-prev/, "the rest of the controls stay");
});

test("slides.themeToggle is a known option", () => {
	assert.doesNotThrow(() => checkOptions({ slides: { themeToggle: false } }));
	assert.throws(() => checkOptions({ slides: { themeToggel: false } }), /themeToggle/);
});

test("the theme button names the theme that is on, in words from the copy layer, and a change is announced", async () => {
	const html = (await buildStarter())[DECK];
	const button = /<button[^>]*data-toggle-theme[^>]*>/.exec(html)[0];
	assert.match(button, /aria-label="Cycle color theme"/, "a name before the script runs");
	for (const theme of ["system", "light", "dark"]) {
		assert.match(button, new RegExp(`data-name-${theme}="Cycle color theme, now ${theme}"`));
		assert.match(button, new RegExp(`data-status-${theme}="Color theme: ${theme}"`));
	}
	assert.match(html, /<span[^>]*role="status"[^>]*data-theme-status[^>]*><\/span>/);
	assert.doesNotMatch((await buildStarter({ slides: { themeToggle: false } }))[DECK], /data-theme-status/);
});
