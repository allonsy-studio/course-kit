import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { WebC } from "@11ty/webc";

import { packageRoot } from "../lib/paths.js";

/** Render a page's markup with a `url` helper registered, as Eleventy registers its `url` filter. */
async function render(markup, data = {}) {
	const page = new WebC();
	page.defineComponents(path.join(packageRoot, "components", "ui", "download-button.webc"));
	page.setHelper("url", function url(...args) {
		return args.join("");
	});
	page.setContent(markup);
	return (await page.compile({ data })).html;
}

const link = (html) => /<a [^>]*>/.exec(html)?.[0];

test("download-button takes the file as url, from a literal or from page data, in a slot or not, and never prints the url filter", async () => {
	const data = { demo: { download: "/demo/cascade/cascade.html" } };
	for (const markup of [
		'<download-button @url="/a.zip">Get</download-button>',
		'<download-button :@url="$data.demo.download">Get</download-button>',
		'<download-button slot="actions" :@url="$data.demo.download" @text="\'Get\'"></download-button>',
	]) {
		const html = await render(markup, data);
		assert.match(link(html), /href="(\/a\.zip|\/demo\/cascade\/cascade\.html)" download/, markup);
		assert.doesNotMatch(html, /function\s*\(/, markup);
	}
});

test("download-button shows nothing when there is no file, rather than a link to nowhere or to the url filter", async () => {
	for (const markup of ["<download-button>Get</download-button>", '<download-button :@url="$data.demo.missing">Get</download-button>']) {
		const html = await render(markup, { demo: {} });
		assert.doesNotMatch(html, /<a\b/, markup);
		assert.doesNotMatch(html, /function\s*\(/, markup);
	}
});
