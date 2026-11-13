import assert from "node:assert/strict";
import { test } from "node:test";

import { minifyInline } from "../lib/minify.js";
import { markdown } from "../lib/markdown.js";

const run = (html, outputPath = "public/page/index.html") => minifyInline({ production: false }).call({ page: { outputPath } }, html, outputPath);

test("inline JavaScript and CSS are minified, and nothing else changes", async () => {
	const html = '<p class="a  b">text   kept</p><pre><code>  spaced   code\n  here</code></pre><script type="module">\n// comment\nconst longName = 1;\nconsole.log( longName );\n</script><style>\n/* c */\n.a { color: red; }\n</style>';
	const out = await run(html);
	assert.match(out, /<p class="a {2}b">text {3}kept<\/p>/);
	assert.match(out, /<pre><code> {2}spaced {3}code\n {2}here<\/code><\/pre>/);
	assert.ok(!out.includes("comment") && !out.includes("longName"), "the script is minified and its names shortened");
	assert.match(out, /<style>\.a\{color:red\}<\/style>/);
});

test("a JSON data block, a src script and a py-editor script are untouched", async () => {
	const html = '<script type="application/json" id="copy-data">{ "a" :  { "b": "x  y" } }</script><script src="/js/x.js"></script><script type="py-editor">def f():\n    return  1\n</script>';
	assert.equal(await run(html), html);
});

test("strings and property names a script looks up survive, and bundled scripts that wrap their code do not collide", async () => {
	const out = await run('<script type="module">(() => { const COPY = JSON.parse(document.getElementById("copy-data").textContent); const t = (ns, key) => COPY[ns]?.[key]; document.querySelector("[data-hide-past]").dataset.hidePast = t("schedule", "hidePast"); })();\n(() => { const COPY = 2; const t = COPY; })();</script>');
	for (const kept of ['"copy-data"', "textContent", '"[data-hide-past]"', "hidePast", '"schedule"']) assert.ok(out.includes(kept), kept);
});

test("a script that does not parse fails the build and names the page", async () => {
	await assert.rejects(run("<script>const = ;</script>", "public/worksheet/index.html"), /could not minify an inline script in public\/worksheet\/index\.html/);
});

test("the markdown converter's table and code output pass through untouched", async () => {
	const html = markdown.render("| a | b |\n|---|:-:|\n| 1 | 2 |\n", { page: { inputPath: "./content/x.md" } });
	assert.equal(await run(html), html);
});

test("it does nothing outside production unless asked, and skips files that are not HTML", async () => {
	const html = "<script>const   a = 1;</script>";
	assert.equal(await minifyInline().call({ page: { outputPath: "x.html" } }, html, "x.html"), html);
	assert.equal(await run(html, "feed.xml"), html);
});
