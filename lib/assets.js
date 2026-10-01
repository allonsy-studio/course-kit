import fs from "node:fs";
import path from "node:path";

import { packageRoot } from "./paths.js";

const root = path.join(packageRoot, "assets");

/**
 * Resolve an asset: the course repo's copy wins, else the package's.
 * @param {string} rel path under the input dir, e.g. "styles/deck.css"
 * @param {string} [inputDir] the course repo's input directory
 * @returns {string | null} absolute path, or null when neither has it
 */
export function assetPath(rel, inputDir = "content") {
	const local = path.resolve(inputDir, rel);
	if (fs.existsSync(local)) return local;
	const shared = path.join(root, rel);
	return fs.existsSync(shared) ? shared : null;
}

/**
 * @param {string} dir
 * @returns {string[]} file names directly in dir; [] when it is missing
 */
const list = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => fs.statSync(path.join(dir, file)).isFile()) : []);

/**
 * Publish the package's stylesheets and scripts as virtual templates and its
 * fonts as passthrough copies. Files the course repo also has are skipped.
 * @param {import('@11ty/eleventy').UserConfig} config
 * @param {{ inputDir?: string, exclude?: string[] }} [options] `exclude` lists assets to skip, e.g. ["styles/semantics.css"]
 */
export function registerAssets(config, { inputDir = "content", exclude = [] } = {}) {
	for (const kind of ["styles", "scripts"]) {
		for (const file of list(path.join(root, kind))) {
			if (exclude.includes(`${kind}/${file}`) || fs.existsSync(path.join(inputDir, kind, file))) continue;
			config.addTemplate(`${kind}/${file}`, fs.readFileSync(path.join(root, kind, file), "utf8"));
		}
	}
	const fonts = list(path.join(root, "fonts")).filter((file) => !fs.existsSync(path.join(inputDir, "fonts", file)));
	config.addPassthroughCopy(Object.fromEntries(fonts.map((file) => [path.join(root, "fonts", file), `/${config.directoryAssignments.fonts}/${file}`])));
}
