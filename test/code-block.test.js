import assert from "node:assert/strict";
import { test } from "node:test";

import { markdown } from "../lib/markdown.js";

test("a language fence renders as a code-block figure with its label, file name and line numbers", () => {
	const html = markdown.render('```js title="tag-filter.js"\nconst a = 1;\nconst b = 2;\n```\n');
	assert.match(html, /^<figure class="code-block" data-edge="js" data-line-numbers>/);
	assert.match(html, /<span class="code-block-lang">JavaScript<\/span><span class="code-block-file">tag-filter\.js<\/span>/);
	assert.match(html, /<pre class="language-js"/);
});

test("a one-line or terminal fence gets no line numbers; an unknown language shows its own name", () => {
	assert.doesNotMatch(markdown.render("```css\na { color: red; }\n```\n"), /data-line-numbers/);
	assert.doesNotMatch(markdown.render("```sh\n$ yarn\n$ yarn build\n```\n"), /data-line-numbers/);
	assert.match(markdown.render("```sh\n$ yarn\n```\n"), /data-edge="shell"/);
	assert.match(markdown.render("```rust\nfn main() {}\n```\n"), /data-edge="neutral".*code-block-lang">rust</s);
});

test("a plain fence and a fence inside a slide stay bare", () => {
	assert.doesNotMatch(markdown.render("```\nplain\n```\n"), /code-block/);
	assert.doesNotMatch(markdown.render(">>> slide\n\n```js\nconst a = 1;\n```\n\n>>>\n"), /code-block/);
});
