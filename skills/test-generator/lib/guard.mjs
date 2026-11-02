#!/usr/bin/env node
/**
 * Keeps tests and answer keys out of the repository.
 *
 * `node guard.mjs scan [dir]`: fail when the repository holds a test, a key or a builder.
 * `node guard.mjs overlap <stems.json> <worksheet.md>`: fail when the worksheet reuses a test question.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/** Written into every file the generator makes, so a scan can find strays whatever they are named. */
export const MARKER = "test-generator:private";

/** File names that look like a test or a key. */
const NAMES = /(^|[-_.\/])(key|answer-?key|test-?\d*-?(key|build)|build-?test)([-_.]|$)/i;

/** Content that only a generated test, key or content file holds. */
const CONTENT = [new RegExp(MARKER), /class="(?:ans|svg-ans)"/, /<body class="key"/];

const git = (cwd, ...args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/**
 * @param {string} dir
 * @returns {string | null} the git work tree holding `dir`, or null
 */
export function repoOf(dir) {
	let at = path.resolve(dir);
	while (!existsSync(at)) at = path.dirname(at);
	try {
		return git(at, "rev-parse", "--show-toplevel").trim();
	} catch {
		return null;
	}
}

/**
 * Where a course's tests go: `$COURSE_TESTS_DIR/<course>`, else `~/course-tests/<course>`.
 * @param {string} course e.g. "cs101"
 * @param {string} [outDir] an explicit folder, which wins
 * @returns {string}
 */
export const resolveOutDir = (course, outDir) => path.resolve(outDir ?? path.join(process.env.COURSE_TESTS_DIR ?? path.join(homedir(), "course-tests"), course));

/**
 * Refuse a folder inside a git work tree, unless git ignores it.
 * @param {string} dir
 * @throws {Error} when files written there could be committed
 */
export function assertPrivate(dir) {
	const root = repoOf(dir);
	if (!root) return;
	let at = path.resolve(dir);
	while (!existsSync(at)) at = path.dirname(at);
	try {
		// A probe inside the folder, so a `folder/` rule matches before the folder exists.
		git(root, "check-ignore", "-q", path.join(path.relative(root, path.resolve(dir)), ".probe"));
		return;
	} catch {
		throw new Error(`${dir} is inside the repository ${root}, and git does not ignore it. Tests and answer keys stay out of the repository: use a folder outside it (COURSE_TESTS_DIR), or add the folder to .gitignore.`);
	}
}

/**
 * Files git tracks, or would track, that look like a test, a key or a builder.
 * @param {string} dir a folder inside the repository
 * @returns {string[]} paths, relative to the repository
 */
export function scan(dir = process.cwd()) {
	const root = repoOf(dir);
	if (!root) throw new Error(`${dir} is not inside a git repository.`);
	const files = git(root, "ls-files", "-co", "--exclude-standard").split("\n").filter(Boolean);
	return files.filter((file) => {
		if (/^skills\/test-generator\//.test(file)) return false;
		if (NAMES.test(file) && /\.(pdf|html?|mjs|json)$/i.test(file)) return true;
		if (!/\.(html?|mjs|json|md|txt)$/i.test(file)) return false;
		try {
			const text = readFileSync(path.join(root, file), "utf8");
			return CONTENT.some((pattern) => pattern.test(text));
		} catch {
			return false;
		}
	});
}

/** @param {string} text @returns {string} lowercase words only */
const words = (text) => text.toLowerCase().replace(/<[^>]*>/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

/** @param {string} text @param {number} size @returns {Set<string>} runs of `size` words */
const shingles = (text, size = 4) => {
	const list = words(text).split(" ");
	return new Set(list.length < size ? [list.join(" ")] : list.slice(0, list.length - size + 1).map((_, index) => list.slice(index, index + size).join(" ")));
};

/**
 * Test questions whose wording the worksheet repeats.
 * @param {string[]} stems every question's text from the test
 * @param {string} worksheet the `.worksheet.md` source
 * @param {number} [threshold] share of a stem's word runs found in the worksheet
 * @returns {{ stem: string, share: number }[]}
 */
export function overlap(stems, worksheet, threshold = 0.5) {
	const have = shingles(worksheet);
	return stems
		.filter((stem) => words(stem).split(" ").length >= 4)
		.map((stem) => {
			const runs = [...shingles(stem)];
			return { stem, share: runs.filter((run) => have.has(run)).length / runs.length };
		})
		.filter((entry) => entry.share >= threshold);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const [command, a, b] = process.argv.slice(2);
	if (command === "scan") {
		const found = scan(a);
		if (found.length) {
			console.error(`These look like tests, keys or builders, and must not be committed:\n${found.map((file) => `  ${file}`).join("\n")}`);
			process.exit(1);
		}
		console.log("No test, key or builder in the repository.");
	} else if (command === "overlap") {
		const stems = JSON.parse(readFileSync(a, "utf8"));
		const hits = overlap(stems, readFileSync(b, "utf8"));
		if (hits.length) {
			console.error(`The worksheet repeats ${hits.length} test question${hits.length === 1 ? "" : "s"}. Rewrite them:\n${hits.map((hit) => `  ${Math.round(hit.share * 100)}%  ${words(hit.stem).slice(0, 90)}`).join("\n")}`);
			process.exit(1);
		}
		console.log("The worksheet shares no question wording with the test.");
	} else {
		console.error("Usage: guard.mjs scan [dir] | overlap <stems.json> <worksheet.md>");
		process.exit(2);
	}
}
