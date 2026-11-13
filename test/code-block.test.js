import assert from "node:assert/strict";
import { test } from "node:test";

import { markdown } from "../lib/markdown.js";

/** A render env for a page, as Eleventy supplies it. */
const page = (inputPath = "./content/guide.md", extra = {}) => ({ page: { inputPath }, ...extra });

test("a language fence renders as a code-block figure with its label, file name and line numbers", () => {
	const html = markdown.render('```js title="tag-filter.js"\nconst a = 1;\nconst b = 2;\n```\n', page());
	assert.match(html, /^<figure class="code-block" data-edge="js" data-line-numbers>/);
	assert.match(html, /<span class="code-block-lang">JavaScript<\/span><span class="code-block-file">tag-filter\.js<\/span>/);
	assert.match(html, /<pre class="language-js"/);
});

test("a one-line or terminal fence gets no line numbers; an unknown language shows its name in capitals", () => {
	assert.doesNotMatch(markdown.render("```css\na { color: red; }\n```\n", page()), /data-line-numbers/);
	assert.doesNotMatch(markdown.render("```sh\n$ yarn\n$ yarn build\n```\n", page()), /data-line-numbers/);
	assert.match(markdown.render("```sh\n$ yarn\n```\n", page()), /data-edge="shell"/);
	assert.match(markdown.render("```rust\nfn main() {}\n```\n", page()), /data-edge="neutral".*code-block-lang">RUST</s);
});

test("a terminal fence is labelled Terminal and a fence with no language is labelled Code", () => {
	assert.match(markdown.render("```bash\n$ yarn\n```\n", page()), /code-block-lang">Terminal</);
	const plain = markdown.render("```\nplain\nlines\n```\n", page());
	assert.match(plain, /data-edge="neutral"/);
	assert.match(plain, /code-block-lang">Code</);
	assert.doesNotMatch(plain, /data-line-numbers/);
});

test("every fence carries a data-edge, from the language family", () => {
	const edge = (language) => /data-edge="(\w+)"/.exec(markdown.render(`\`\`\`${language}\nx\n\`\`\`\n`, page()))?.[1];
	assert.deepEqual(["scss", "jsx", "svg", "php", "zsh", "yaml"].map(edge), ["css", "js", "html", "html", "shell", "neutral"]);
});

test("a fence stays bare outside a page, in a slide, in a deck and on a notes sheet", () => {
	const fence = "```js\nconst a = 1;\n```\n";
	assert.doesNotMatch(markdown.render(fence), /code-block/, "no page");
	assert.doesNotMatch(markdown.render(fence, { page: { inputPath: "" } }), /code-block/, "an empty input path");
	assert.doesNotMatch(markdown.render(fence, page("./content/slides/week-1-day-1.md")), /code-block/, "under /slides/");
	assert.doesNotMatch(markdown.render(fence, page("./content/guide.md", { layout: "deck" })), /code-block/, "layout deck");
	assert.doesNotMatch(markdown.render(fence, page("./content/guide.md", { notesSheet: {} })), /code-block/, "a notes sheet");
	assert.doesNotMatch(markdown.render(">>> slide\n\n```js\nconst a = 1;\n```\n\n>>>\n", page()), /code-block/, "inside a slide container");
});
