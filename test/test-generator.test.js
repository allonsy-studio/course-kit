import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkPoints } from "../skills/test-generator/lib/document.mjs";
import { assertPrivate, overlap, resolveOutDir, scan } from "../skills/test-generator/lib/guard.mjs";
import { code, mc, recordedStems, resetStems, termMatch } from "../skills/test-generator/lib/items.mjs";
import { checkSnippet } from "../skills/test-generator/lib/python-check.mjs";
import { scaffold } from "../skills/test-generator/scripts/start.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "test-generator-"));

/** A git repository with one committed file. */
const repo = () => {
	const dir = tmp();
	for (const args of [["init", "-q"], ["config", "user.email", "t@example.com"], ["config", "user.name", "T"]]) execFileSync("git", ["-C", dir, ...args]);
	fs.writeFileSync(path.join(dir, "README.md"), "# course\n");
	execFileSync("git", ["-C", dir, "add", "."]);
	execFileSync("git", ["-C", dir, "commit", "-q", "-m", "init"]);
	return dir;
};

test("a multiple-choice item shows its answer only in the key", () => {
	const student = mc(1, "Pick " + code("<b>"), ["a", "b"], 1, false);
	const key = mc(1, "Pick " + code("<b>"), ["a", "b"], 1, true);
	assert.doesNotMatch(student, /class="ans"|class="hit"/);
	assert.match(key, /class="ans">b</);
	assert.match(key, /class="hit"/);
});

test("items remember their wording, for the worksheet check", () => {
	resetStems();
	mc(1, "Which <b>element</b> holds the main content?", ["x"], 0, false);
	termMatch({ terms: [["DOM", 0]], defs: ["The browser's tree of the page."], key: false });
	assert.deepEqual(recordedStems(), ["Which element holds the main content?", "The browser's tree of the page."]);
	resetStems();
	assert.deepEqual(recordedStems(), []);
});

test("sections must add up to the test's points", () => {
	assert.equal(checkPoints([{ n: 1, title: "A", points: 60 }, { n: 2, title: "B", points: 40 }]), 100);
	assert.throws(() => checkPoints([{ n: 1, title: "A", points: 60 }]), /Points total 60, expected 100/);
});

test("tests are refused inside a repository, and allowed outside or in an ignored folder", () => {
	const dir = repo();
	assert.throws(() => assertPrivate(path.join(dir, "tests")), /inside the repository/);
	fs.writeFileSync(path.join(dir, ".gitignore"), "private/\n");
	assert.doesNotThrow(() => assertPrivate(path.join(dir, "private")));
	assert.doesNotThrow(() => assertPrivate(path.join(tmp(), "cs101")));
	assert.equal(resolveOutDir("cs101", "/somewhere"), "/somewhere");
});

test("the scan finds a test, a key or a content file in the repository, and passes a clean one", () => {
	const dir = repo();
	assert.deepEqual(scan(dir), []);
	fs.writeFileSync(path.join(dir, "test-2-key.pdf"), "x");
	fs.writeFileSync(path.join(dir, "notes.html"), "<!-- test-generator:private -->");
	fs.writeFileSync(path.join(dir, "ok.md"), "# fine\n");
	assert.deepEqual(scan(dir).sort(), ["notes.html", "test-2-key.pdf"]);
});

test("the overlap check flags a copied question and passes a new one", () => {
	const stems = ["Which element is the landmark for the main content of a page?"];
	assert.equal(overlap(stems, "Which element is the landmark for the main content of a page? main").length, 1);
	assert.equal(overlap(stems, "Name the region element that wraps what is unique to this document.").length, 0);
});

test("a new test builds into the private folder, with a marker, a key, and its question list", async () => {
	const out = tmp();
	const made = scaffold({ course: "cs101", name: "test-1", title: "Test 1: HTML", out });
	assert.ok(fs.existsSync(made.content) && fs.existsSync(made.draft));
	assert.throws(() => scaffold({ course: "cs101", name: "test-1", title: "Again", out }), /exists/);

	const run = spawnSync(process.execPath, [made.content], { env: { ...process.env, HTML_ONLY: "1" }, encoding: "utf8" });
	assert.equal(run.status, 0, run.stderr);
	const html = fs.readFileSync(path.join(out, "test-1.html"), "utf8");
	const key = fs.readFileSync(path.join(out, "test-1-key.html"), "utf8");
	assert.match(html, /test-generator:private/);
	assert.doesNotMatch(html, /class="ans"|Answer key/);
	assert.match(key, /Answer key/);
	assert.match(key, /class="ans"/);
	const stems = JSON.parse(fs.readFileSync(path.join(out, "test-1-stems.json"), "utf8"));
	assert.ok(stems.some((stem) => /main content/.test(stem)));
});

test("a build into a repository is refused", () => {
	const dir = repo();
	assert.throws(() => scaffold({ course: "cs101", name: "test-1", title: "T", out: path.join(dir, "tests") }), /inside the repository/);
});

test("the Python check agrees with Python, and catches a wrong key", { skip: spawnSync("python3", ["--version"]).error ? "python3 is not installed" : false }, () => {
	assert.match(checkSnippet({ id: "1", src: "for i in range(2):\n    print(i)", expect: "0\n1" }), /^1:/);
	assert.throws(() => checkSnippet({ id: "2", src: "print(1)", expect: "2" }), /Python check failed for 2/);
	assert.match(checkSnippet({ id: "3", src: "if True print(1)", expect: "", mode: "syntax" }), /SyntaxError/);
});
