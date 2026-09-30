import fs from "node:fs";
import path from "node:path";

import { packageRoot } from "./paths.js";

const root = path.join(packageRoot, "glue");

/**
 * Publish glue pages (pagination and permalink templates) as virtual
 * templates. A page the course repo also defines is skipped.
 * @param {import('@11ty/eleventy').UserConfig} config
 * @param {{ inputDir?: string, pages: Record<string, string> }} options `pages` maps a glue name to its virtual path, e.g. { "lesson-day": "lessons/lesson-day.webc" }
 */
export async function registerGlue(config, { inputDir = "content", pages }) {
	for (const [name, virtualPath] of Object.entries(pages)) {
		if (fs.existsSync(path.join(inputDir, virtualPath))) continue;
		const { default: data } = await import(path.join(root, `${name}.data.js`));
		config.addTemplate(virtualPath, fs.readFileSync(path.join(root, `${name}.webc`), "utf8"), data);
	}
}
