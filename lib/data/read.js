import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @param {string} file
 * @returns {object} the parsed JSON, or {} when the file is missing
 */
const readJson = (file) => {
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		if (error.code === "ENOENT") return {};
		throw error;
	}
};

/**
 * The course's authored data files.
 * @param {string} [dataDir]
 * @returns {{ course: object, dates: object, schedule: object }}
 */
export function readCourseData(dataDir = "_data") {
	return {
		course: readJson(join(dataDir, "course.json")),
		dates: readJson(join(dataDir, "dates.json")),
		schedule: readJson(join(dataDir, "schedule.json")),
	};
}

/**
 * @param {string} [file]
 * @returns {object} the course's package.json, or {} when missing
 */
export const readPackage = (file = "package.json") => readJson(file);

/**
 * Whether the course supplies its own `_data` entry of this name: a file, or a folder.
 * @param {string} name
 * @param {string} [dataDir]
 * @returns {boolean}
 */
export const courseDefines = (name, dataDir = "_data") =>
	[".js", ".cjs", ".mjs", ".json"].some((extension) => existsSync(join(dataDir, `${name}${extension}`))) || existsSync(join(dataDir, name));
