import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { COPY_DEFAULTS } from "../lib/copy.js";
import { copyDoc } from "../scripts/copy-docs.js";

const root = path.resolve(import.meta.dirname, "..");

/** Every source file that can emit wording: components, layouts, glue, build code and client scripts. */
const sources = [];
for (const dir of ["components", "layouts", "glue", "lib", "assets/scripts"]) {
	const walk = (folder) => {
		for (const entry of fs.readdirSync(path.join(root, folder), { withFileTypes: true })) {
			const relative = path.join(folder, entry.name);
			if (entry.isDirectory()) walk(relative);
			else if (/\.(webc|js)$/.test(entry.name) && relative !== path.join("lib", "copy.js")) sources.push({ file: relative, text: fs.readFileSync(path.join(root, relative), "utf8") });
		}
	};
	walk(dir);
}

/** Keys built from a prefix at run time (`schedule.dueKind` + a kind), so no source names them whole. */
const DYNAMIC_PREFIXES = { schedule: ["dueKind"] };

/** Keys the courses use and the kit's own components do not: the footer's "Open source" link is each course's, not the kit's. */
const COURSE_ONLY = new Set(["nav.openSource"]);

/** A key's name without its plural variant: `dueInDays_one` is used as `dueInDays`. */
const base = (key) => key.replace(/_(one|other|zero|two|few|many)$/, "");

/** The `ns.key` pairs a file names: `t("ns", "key")`, `copy.ns.key`, and `copy.key` where `copy` was set to one namespace. */
const used = (text) => {
	const found = [];
	for (const match of text.matchAll(/\bt\(\s*"(\w+)"\s*,\s*"(\w+)"/g)) found.push([match[1], match[2]]);
	for (const match of text.matchAll(/\bcopy\.(\w+)\.(\w+)/g)) found.push([match[1], match[2]]);
	for (const match of text.matchAll(/\b(\w+)\s*=\s*(?:\$data\.)?copy\.(\w+)\s*[;,\n)]/g)) {
		for (const use of text.matchAll(new RegExp(`(?<![\\w.])${match[1]}\\.(\\w+)`, "g"))) found.push([match[2], use[1]]);
	}
	return found;
};

test("every copy key a component, layout or script names exists in the defaults", () => {
	const missing = [];
	for (const { file, text } of sources) {
		for (const [ns, key] of used(text)) {
			if (!(ns in COPY_DEFAULTS)) continue; // a local named `copy`, not the copy layer
			const table = COPY_DEFAULTS[ns];
			const prefixed = (DYNAMIC_PREFIXES[ns] ?? []).includes(key);
			if (!prefixed && !(key in table) && !(`${key}_one` in table) && !(`${key}_other` in table)) missing.push(`${file}: ${ns}.${key}`);
		}
	}
	assert.deepEqual(missing, []);
});

test("no copy key is an orphan: each key's name appears in a component, layout, script or build module", () => {
	const orphans = [];
	for (const [ns, table] of Object.entries(COPY_DEFAULTS)) {
		for (const key of Object.keys(table)) {
			if (ns === "code" && key === "languages") continue;
			if (COURSE_ONLY.has(`${ns}.${key}`) || (DYNAMIC_PREFIXES[ns] ?? []).some((prefix) => key.startsWith(prefix))) continue;
			const name = base(key);
			const pattern = new RegExp(`[."'\`]${name}(?![\\w])`);
			if (!sources.some(({ text }) => pattern.test(text))) orphans.push(`${ns}.${key}`);
		}
	}
	assert.deepEqual(orphans, []);
});

test("every default is a string, and each _one variant has an _other", () => {
	for (const [ns, table] of Object.entries(COPY_DEFAULTS)) {
		for (const [key, value] of Object.entries(table)) {
			if (ns === "code" && key === "languages") continue;
			assert.equal(typeof value, "string", `${ns}.${key}`);
			if (key.endsWith("_one")) assert.ok(`${base(key)}_other` in table, `${ns}.${key} has no _other`);
		}
	}
});

test("docs/copy.md lists every key and is current (run `yarn docs`)", () => {
	assert.equal(fs.readFileSync(path.join(root, "docs", "copy.md"), "utf8"), copyDoc());
});
