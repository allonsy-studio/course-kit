import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [path.join(root, "README.md"), ...fs.readdirSync(path.join(root, "docs")).filter((name) => name.endsWith(".md")).map((name) => path.join(root, "docs", name)), path.join(root, "examples", "starter", "README.md")].filter((file) => fs.existsSync(file));

/** GitHub's anchor for a heading: lowercase, punctuation dropped, spaces to hyphens. */
const slug = (heading) => heading.toLowerCase().replace(/`/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");

/** @param {string} file */
const anchors = (file) => new Set([...fs.readFileSync(file, "utf8").matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slug(match[1])));

test("every relative link in the README and docs points at a file and heading that exist", () => {
	const broken = [];
	for (const page of pages) {
		const text = fs.readFileSync(page, "utf8").replace(/```[\s\S]*?```/g, "");
		for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
			if (/^(https?:|mailto:)/.test(target)) continue;
			const [file, anchor] = target.split("#");
			const resolved = file ? path.resolve(path.dirname(page), file) : page;
			if (!fs.existsSync(resolved)) {
				broken.push(`${path.relative(root, page)}: ${target} (no such file)`);
			} else if (anchor && resolved.endsWith(".md") && !anchors(resolved).has(anchor)) {
				broken.push(`${path.relative(root, page)}: ${target} (no such heading)`);
			}
		}
	}
	assert.deepEqual(broken, []);
});
