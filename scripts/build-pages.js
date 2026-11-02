/**
 * Build what GitHub Pages serves: the landing site at the root, and the component preview under `components/`.
 * `PATH_PREFIX` is the path the site is served from (default "/"); the preview gets it with `components/` added.
 * Output: `website/_site`.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const eleventy = path.join(root, "node_modules", "@11ty", "eleventy", "cmd.cjs");

/** @param {string[]} args @param {Record<string, string>} [env] */
function run(args, env = {}) {
	const { status } = spawnSync(process.execPath, [eleventy, ...args], { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
	if (status !== 0) process.exit(status ?? 1);
}

const prefix = (process.env.PATH_PREFIX || "/").replace(/\/?$/, "/");

run(["--config=website/eleventy.config.js"], { PATH_PREFIX: prefix });
run(["--config=preview/eleventy.config.js", "--output=website/_site/components"], { PATH_PREFIX: `${prefix}components/` });
