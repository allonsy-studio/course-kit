import fs from "node:fs";
import path from "node:path";

/**
 * @param {string} dir
 * @param {(name: string) => boolean} [match] which file names to keep
 * @returns {string[]} files under dir, recursively; [] when dir is missing
 */
export const walk = (dir, match = () => true) =>
	fs.existsSync(dir)
		? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
			entry.isDirectory() ? walk(path.join(dir, entry.name), match) : match(entry.name) ? [path.join(dir, entry.name)] : [],
		)
		: [];
