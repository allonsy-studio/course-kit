import path from "node:path";

import { walk } from "./files.js";
import { packageRoot } from "./paths.js";

const isComponent = (name) => name.endsWith(".webc");

/**
 * Package components minus any the course repo also defines (WebC throws on a
 * duplicate name), then the course's own.
 * @param {string} [localDir] the course repo's component directory
 * @returns {string[]} file paths for the WebC plugin's `components` option
 */
export function componentFiles(localDir = "_includes") {
	const local = walk(localDir, isComponent);
	const taken = new Set(local.map((file) => path.basename(file, ".webc")));
	const shared = walk(path.join(packageRoot, "components"), isComponent).filter((file) => !taken.has(path.basename(file, ".webc")));
	return [...shared, ...local];
}
