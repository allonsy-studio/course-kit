/**
 * Run every Python snippet on the paper, so the key prints what Python prints.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * @typedef {object} Snippet
 * @property {string} id e.g. "2.3"
 * @property {string} src the program
 * @property {string} expect the exact output the key shows
 * @property {string} [stdin] what `input()` reads, one line per call
 * @property {"run" | "syntax" | "hang"} [mode] `syntax` must fail to compile; `hang` must still be running after the timeout
 */

/** Make `input()` read stdin without echoing the prompt. */
const HARNESS = ["import builtins, sys", 'builtins.input = lambda prompt="": sys.stdin.readline().rstrip("\\n")', "src = open(sys.argv[1]).read()", "exec(compile(src, 'item.py', 'exec'))"].join("\n");

/**
 * @param {Snippet} snippet
 * @returns {string} one result line
 * @throws {Error} when Python disagrees with the key
 */
export function checkSnippet({ id, src, expect, stdin = "", mode = "run" }) {
	const dir = mkdtempSync(path.join(tmpdir(), "test-check-"));
	const file = path.join(dir, "item.py");
	writeFileSync(file, `${src}\n`);
	const result = spawnSync("python3", ["-u", "-c", HARNESS, file], { input: stdin, encoding: "utf8", timeout: mode === "hang" ? 700 : 5000, maxBuffer: 64 * 1024 * 1024 });
	rmSync(dir, { recursive: true, force: true });
	const out = (result.stdout ?? "").replace(/\n$/, "");
	const fail = (why) => {
		throw new Error(`Python check failed for ${id}: ${why}\n--- stdout ---\n${out.slice(0, 400)}\n--- stderr ---\n${result.stderr}`);
	};
	if (mode === "syntax") {
		if (!/SyntaxError/.test(result.stderr) || out) fail("expected a SyntaxError before any output");
		return `${id}: SyntaxError, nothing printed`;
	}
	if (mode === "hang") {
		if (!(result.error && ["ETIMEDOUT", "ENOBUFS"].includes(result.error.code))) fail("expected the loop to still be running at the timeout");
		if (!out.startsWith(expect)) fail(`expected output to start with ${JSON.stringify(expect)}`);
		return `${id}: still running after 0.7s`;
	}
	if (result.status !== 0) fail(`exit status ${result.status}`);
	if (expect && out !== expect) fail(`expected ${JSON.stringify(expect)}, got ${JSON.stringify(out)}`);
	return `${id}: ${JSON.stringify(out)}`;
}

/**
 * @param {Snippet[]} snippets
 * @returns {string[]} one result line per snippet
 */
export const checkSnippets = (snippets) => snippets.map(checkSnippet);
