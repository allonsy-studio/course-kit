#!/usr/bin/env node
/**
 * Start a test: copy the content template and a practice-worksheet draft into the course's private folder,
 * with a `package.json` that makes its `.js` files ES modules.
 * `node start.js --course cs101 --name test-2 --title "Test 2: Loops" --date "Friday, October 2" --minutes 50`
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { assertPrivate, resolveOutDir } from "../lib/guard.js";

const root = path.resolve(import.meta.dirname, "..");

/**
 * @param {Record<string, string>} values the options
 * @returns {{ dir: string, content: string, draft: string }} the files written
 */
export function scaffold(values) {
	for (const required of ["course", "name", "title"]) if (!values[required]) throw new Error(`--${required} is required`);
	const dir = resolveOutDir(values.course, values.out);
	assertPrivate(dir);
	mkdirSync(dir, { recursive: true });

	// The folder is outside any package, so say its `.js` files are ES modules.
	const manifest = path.join(dir, "package.json");
	if (!existsSync(manifest)) writeFileSync(manifest, `${JSON.stringify({ private: true, type: "module" }, null, "\t")}\n`);

	const content = path.join(dir, `${values.name}.js`);
	if (existsSync(content)) throw new Error(`${content} exists. Pick another --name, or edit it.`);

	const fill = {
		__SLUG__: values.course,
		__FILE__: values.name,
		__COURSE__: values.label ?? values.course.toUpperCase(),
		__SCHOOL__: values.school ?? "Example College",
		__TEST__: values.title,
		__DATE__: values.date ?? "Date",
		__MINUTES__: values.minutes ?? "50",
	};
	const apply = (text) => Object.entries(fill).reduce((out, [token, value]) => out.replaceAll(token, value), text);

	const libUrl = `${pathToFileURL(path.join(root, "lib")).href}/`;
	writeFileSync(content, apply(readFileSync(path.join(root, "templates", "content.js"), "utf8").replaceAll('"../lib/', `"${libUrl}`)));

	const draft = path.join(dir, `${values.name}.practice.worksheet.md`);
	writeFileSync(draft, apply(readFileSync(path.join(root, "templates", "practice.worksheet.md"), "utf8")));
	return { dir, content, draft };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const { values } = parseArgs({ options: Object.fromEntries(["course", "name", "title", "date", "minutes", "school", "label", "out"].map((name) => [name, { type: "string" }])) });
	const made = scaffold(values);
	console.log(`Wrote ${made.content}\nWrote ${made.draft} (a draft: the published worksheet goes in the course repo)\nBuild: node ${made.content}`);
}
