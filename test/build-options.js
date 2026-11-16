import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import Eleventy from "@11ty/eleventy";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Build the starter course with `courseKit` options of the test's choosing, in memory.
 * @param {object} options merged over the starter's own (`institution`)
 * @returns {Promise<Record<string, string>>} output url -> HTML
 */
export async function buildStarter(options = {}) {
	const cwd = process.cwd();
	const configPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "course-kit-build-")), "eleventy.config.mjs");
	fs.writeFileSync(configPath, `import courseKit from ${JSON.stringify(pathToFileURL(path.join(root, "index.js")).href)};
export default function (config) {
	courseKit(config, ${JSON.stringify({ institution: { name: "Example College", timezone: "America/New_York" }, ...options })});
}
`);
	process.chdir(path.join(root, "examples", "starter"));
	try {
		const eleventy = new Eleventy("content", "public", { configPath, quietMode: true });
		return Object.fromEntries((await eleventy.toJSON()).map((page) => [page.url, page.content]));
	} finally {
		process.chdir(cwd);
	}
}
