import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";

import { affectedPages, listPages, normalize, selectPages } from "../website/lib/affected-pages.js";

const temp = mkdtempSync(join(tmpdir(), "affected-pages-"));
after(() => rmSync(temp, { recursive: true, force: true }));

let count = 0;
/** Writes `files` (path -> text or bytes) under a new directory. */
const fixture = (files) => {
	const dir = join(temp, String(count++));
	for (const [path, data] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, path)), { recursive: true });
		writeFileSync(join(dir, path), data);
	}
	return dir;
};

const page = (body = "") => `<!doctype html><html><head></head><body>${body}</body></html>`;

/** A landing site with two pages, and a component preview with three, built under `components/`. */
const BASE = {
	"index.html": page("<p>Home</p>"),
	"about/index.html": page("<p>About</p>"),
	"assets/site.css": "a{}",
	"components/index.html": page("<p>Index</p>"),
	"components/frames/a/index.html": page("<p>One</p>"),
	"components/frames/b/index.html": page("<p>Two</p>"),
	"components/styles/base.css": "b{}",
	"components/fonts/f.woff2": Buffer.from([1, 2, 3]),
};
const PREVIEW = ["/components/", "/components/frames/a/", "/components/frames/b/"];
const LANDING = ["/", "/about/"];

/** The pages affected by building `change` on top of BASE. */
const affected = (change) => {
	const head = { ...BASE, ...change };
	for (const [path, data] of Object.entries(head)) if (data === null) delete head[path];
	const headDir = fixture(head);
	return affectedPages({ headDir, baseDir: fixture(BASE), pages: listPages(headDir) });
};

test("listPages lists every built page, sorted", () => {
	assert.deepEqual(listPages(fixture(BASE)), ["/", "/about/", ...PREVIEW]);
	assert.deepEqual(listPages(fixture({ "404.html": page(), "a/b/index.html": page(), "a/b/data.json": "{}" })), ["/404.html", "/a/b/"]);
});

test("identical builds affect no page", () => {
	assert.deepEqual(affected({}), []);
});

test("a changed HTML file affects only its page", () => {
	assert.deepEqual(affected({ "components/frames/a/index.html": page("<p>Changed</p>") }), ["/components/frames/a/"]);
	assert.deepEqual(affected({ "about/index.html": page("<p>Changed</p>") }), ["/about/"]);
	assert.deepEqual(affected({ "components/frames/b/index.html": page("<p>Changed</p>"), "index.html": page("<p>Changed</p>") }), ["/", "/components/frames/b/"]);
});

test("a changed asset affects every page of its site, and no page of the other", () => {
	assert.deepEqual(affected({ "assets/site.css": "a{color:red}" }), LANDING);
	assert.deepEqual(affected({ "components/styles/base.css": "b{color:red}" }), PREVIEW);
	assert.deepEqual(affected({ "components/fonts/f.woff2": Buffer.from([1, 2, 4]) }), PREVIEW, "a binary file counts, byte for byte");
	assert.deepEqual(affected({ "assets/site.css": "a{color:red}", "components/frames/a/index.html": page("<p>Changed</p>") }), [...LANDING, "/components/frames/a/"], "an asset and a page together");
});

test("a new page, a new asset and a removed asset count; a removed page has nothing to test", () => {
	assert.deepEqual(affected({ "new/index.html": page() }), ["/new/"]);
	assert.deepEqual(affected({ "assets/new.png": Buffer.from([9]) }), LANDING);
	assert.deepEqual(affected({ "components/styles/base.css": null }), PREVIEW);
	assert.deepEqual(affected({ "about/index.html": null }), []);
});

test("normalize renumbers only the WebC uids a page defines in an id, and drops inline source maps", () => {
	assert.equal(normalize('<p id="a-webc-aB_1z">x</p><a for="a-webc-aB_1z" data-x="b-webc-Zz9-0"></a><i id="b-webc-Zz9-0-copy"></i>'), '<p id="a-webc-0">x</p><a for="a-webc-0" data-x="b-webc-1"></a><i id="b-webc-1-copy"></i>');
	assert.notEqual(normalize('<p id="webc-aaaaa"></p><a for="webc-aaaaa">'), normalize('<p id="webc-aaaaa"></p><a for="webc-bbbbb">'), "a broken reference still differs");
	assert.notEqual(normalize("<p>webc-alpha</p>"), normalize("<p>webc-gamma</p>"), "text that only looks like a uid still differs");
	assert.equal(normalize("<p>@allons-y/webc-patterns</p>"), "<p>@allons-y/webc-patterns</p>");
	assert.equal(normalize("a{}\n/*# sourceMappingURL=data:application/json;base64,QUJD */"), "a{}\n");
	assert.equal(normalize("x();\n//# sourceMappingURL=data:application/json;base64,QUJD"), "x();\n");
});

test("two builds of the same source differ only by random ids and source maps, so no page is affected", () => {
	const markup = (uid, map) => page(`<style>a{}/*# sourceMappingURL=data:application/json;base64,${map} */</style><nav aria-labelledby="x-webc-${uid}"><span id="x-webc-${uid}"></span></nav>`);
	const headDir = fixture({ ...BASE, "index.html": markup("Q9-kd", "WFla"), "assets/site.css": "a{}\n/*# sourceMappingURL=data:application/json;base64,WFla */" });
	const baseDir = fixture({ ...BASE, "index.html": markup("aB_1z", "QUJD"), "assets/site.css": "a{}\n/*# sourceMappingURL=data:application/json;base64,QUJD */" });
	assert.deepEqual(affectedPages({ headDir, baseDir, pages: listPages(headDir) }), []);
});

test("selectPages tests every page off a pull request, when forced, outside content, and when it cannot compare", () => {
	const headDir = fixture(BASE);
	const baseDir = fixture(BASE);
	const select = (env) => selectPages({ headDir, env });
	const every = (reason) => ({ pages: ["/", "/about/", ...PREVIEW], total: 5, reason: `every page (5): ${reason}` });
	const notPullRequest = "not compared with a base build (not a pull request)";

	assert.deepEqual(select({}), every(notPullRequest));
	assert.deepEqual(select({ AUDIT_OUTSIDE_COUNT: "0" }), every(notPullRequest));
	assert.deepEqual(select({ AUDIT_ALL_PAGES: "1", AUDIT_OUTSIDE_COUNT: "0", AUDIT_BASE_DIR: baseDir }), every("AUDIT_ALL_PAGES is set"));
	assert.equal(select({ AUDIT_ALL_PAGES: "0", AUDIT_OUTSIDE_COUNT: "0", AUDIT_BASE_DIR: baseDir }).reason, "0 affected pages of 5");

	// Only an explicit "0" outside the content paths allows a comparison.
	assert.deepEqual(select({ AUDIT_OUTSIDE_COUNT: "1", AUDIT_BASE_DIR: baseDir }), every("1 changed file is outside the content paths"));
	assert.deepEqual(select({ AUDIT_OUTSIDE_COUNT: "7", AUDIT_BASE_DIR: baseDir }), every("7 changed files are outside the content paths"));
	assert.deepEqual(select({ AUDIT_OUTSIDE_COUNT: "", AUDIT_BASE_DIR: baseDir }), every("the changed files were not checked"));
	assert.deepEqual(select({ AUDIT_BASE_DIR: baseDir }), every("the changed files were not checked"));
	assert.deepEqual(select({ AUDIT_OUTSIDE_COUNT: "00", AUDIT_BASE_DIR: baseDir }), every("00 changed files are outside the content paths"));

	assert.deepEqual(select({ AUDIT_OUTSIDE_COUNT: "0", AUDIT_BASE_DIR: join(baseDir, "missing") }), every("the base build is missing"));
});

test("selectPages tests only the affected pages when every change is content and the base is built", () => {
	const baseDir = fixture(BASE);
	const select = (change) => selectPages({ headDir: fixture({ ...BASE, ...change }), env: { AUDIT_OUTSIDE_COUNT: "0", AUDIT_BASE_DIR: baseDir } });

	assert.deepEqual(select({ "components/frames/a/index.html": page("<p>Changed</p>") }), { pages: ["/components/frames/a/"], total: 5, reason: "1 affected page of 5" });
	assert.deepEqual(select({ "assets/site.css": "a{color:red}" }), { pages: LANDING, total: 5, reason: "2 affected pages of 5" });
	assert.deepEqual(select({}), { pages: [], total: 5, reason: "0 affected pages of 5" });
});
