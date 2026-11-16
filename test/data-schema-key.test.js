import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import Eleventy from "@11ty/eleventy";

import { withoutSchema } from "../lib/data/read.js";

const starter = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "examples", "starter");

test("withoutSchema drops only a top-level $schema key", () => {
	assert.deepEqual(withoutSchema({ $schema: "x", A: { min: 90 } }), { A: { min: 90 } });
	assert.deepEqual(withoutSchema({ A: { $schema: "kept" } }), { A: { $schema: "kept" } });
	assert.deepEqual(withoutSchema([1]), [1]);
	assert.equal(withoutSchema("text"), "text");
});

test("a template that loops over a data object never sees $schema", async () => {
	const cwd = process.cwd();
	process.chdir(starter);
	try {
		// An Eleventy config of its own: the starter's, plus a page that loops over each data object.
		const configPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "course-kit-loop-")), "eleventy.config.mjs");
		const loops = ["scale:{% for letter, band in scale %}{{ letter }};{% endfor %}", "policies:{% for key, policy in policies %}{{ key }};{% endfor %}", "instructor:{% for key, value in instructor %}{{ key }};{% endfor %}", "course:{% for key, value in course %}{{ key }};{% endfor %}", "grading:{% for key, value in grading %}{{ key }};{% endfor %}"];
		fs.writeFileSync(configPath, `import courseKit from ${JSON.stringify(pathToFileURL(path.join(starter, "..", "..", "index.js")).href)};
export default function (config) {
	courseKit(config, { institution: { name: "Example College", timezone: "America/New_York" } });
	config.addTemplate("loop-check.njk", ${JSON.stringify(loops.join("\n"))}, { permalink: "/loop-check/" });
}
`);
		const eleventy = new Eleventy("content", "public", { configPath, quietMode: true });
		const pages = await eleventy.toJSON();
		const html = pages.find((page) => page.url === "/loop-check/").content;
		assert.match(html, /scale:A;B;C;D;F;/);
		assert.doesNotMatch(html, /\$schema/);
		assert.match(html, /instructor:name;/);
	} finally {
		process.chdir(cwd);
	}
});
