import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "website", "_site");
const prefix = "/course-kit/";

before(() => {
	const built = spawnSync(process.execPath, [path.join(root, "scripts", "site.js"), "build"], { cwd: root, env: { ...process.env, PATH_PREFIX: prefix }, encoding: "utf8" });
	assert.equal(built.status, 0, built.stderr || built.stdout);
});

/** @param {string} file @returns {string[]} the root-relative links and sources a page holds, outside code */
const links = (file) => {
	const html = fs.readFileSync(file, "utf8").replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/g, "");
	return [...html.matchAll(/\s(?:href|src)="(\/[^"/][^"]*|\/)"/g)].map((match) => match[1]);
};

test("Pages gets the landing site at the root and the preview under components/", () => {
	assert.ok(fs.existsSync(path.join(site, "index.html")), "the landing page");
	assert.ok(fs.existsSync(path.join(site, "components", "index.html")), "the preview's index");
	assert.ok(fs.existsSync(path.join(site, "components", "components", "ui", "callout", "index.html")), "a component page");
});

test("the landing page links under the prefix, and to the preview", () => {
	const found = links(path.join(site, "index.html"));
	assert.ok(found.length >= 3, `found ${found.length} links`);
	for (const url of found) assert.ok(url.startsWith(prefix), `landing links to ${url}`);
	assert.ok(found.includes(`${prefix}components/`), "the landing page links to the preview");
});

test("the preview's links stay under components/, with the prefix", () => {
	for (const page of ["index.html", "theme/index.html", "components/ui/callout/index.html", "frames/ui/callout/default/index.html"]) {
		for (const url of links(path.join(site, "components", page))) assert.ok(url.startsWith(`${prefix}components/`), `${page} links to ${url}`);
	}
});
