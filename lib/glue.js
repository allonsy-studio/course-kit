import fs from "node:fs";
import path from "node:path";

import lessonDay from "../glue/lesson-day.data.js";
import { packageRoot } from "./paths.js";

const root = path.join(packageRoot, "glue");

/** Data for each glue page, by name. */
const DATA = { "lesson-day": lessonDay };

/**
 * Publish glue pages (pagination and permalink templates) as virtual
 * templates. A page the course repo also defines is skipped.
 * @param {import('@11ty/eleventy').UserConfig} config
 * @param {{ inputDir?: string, pages: Record<string, string> }} options `pages` maps a glue name to its virtual path, e.g. { "lesson-day": "lessons/lesson-day.webc" }
 */
export function registerGlue(config, { inputDir = "content", pages }) {
	for (const [name, virtualPath] of Object.entries(pages)) {
		if (fs.existsSync(path.join(inputDir, virtualPath))) continue;
		if (!DATA[name]) throw new Error(`course-kit: no glue page named "${name}"`);
		config.addTemplate(virtualPath, fs.readFileSync(path.join(root, `${name}.webc`), "utf8"), DATA[name]);
	}
}
