/**
 * One build for the whole site: the landing at the root, the component preview under `components/`.
 * `node scripts/site.js build` writes `website/_site` (what Pages serves); `start` builds, serves it, and rebuilds on change.
 * `audit` writes `website/_a11y` for the browser tests: unprefixed, built afresh and swapped in, the preview minified unless `MINIFY=0`.
 * `PATH_PREFIX` is the path the site is served from (default "/"); the preview gets it with `components/` added.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

import EleventyDevServer from "@11ty/eleventy-dev-server";

const root = path.resolve(import.meta.dirname, "..");
const eleventy = path.join(root, "node_modules", "@11ty", "eleventy", "cmd.cjs");
const mode = process.argv[2];
const audit = mode === "audit";
// The landing's output comes from its config (`SITE_OUTPUT`): the bundle plugin writes the component CSS there too.
const site = audit ? `_a11y-build-${process.pid}` : "_site";
const output = audit ? "website/_a11y" : `website/${site}`;
const prefix = audit ? "/" : (process.env.PATH_PREFIX || "/").replace(/\/?$/, "/");

const builds = [
	{ args: ["--config=website/eleventy.config.js"], env: { PATH_PREFIX: prefix, SITE_OUTPUT: site } },
	{
		args: ["--config=preview/eleventy.config.js"],
		// The audit runs on the preview minified, as a course that opts in would ship it, so a change a minifier breaks fails.
		env: { PATH_PREFIX: `${prefix}components/`, PREVIEW_OUTPUT: `website/${site}/components`, ...(audit && { MINIFY: process.env.MINIFY ?? "1" }) },
	},
];
const options = (build, extra = []) => ({ cwd: root, stdio: "inherit", env: { ...process.env, ...build.env }, args: [eleventy, ...build.args, ...extra] });

/**
 * Build both sites once.
 * @param {string[]} [extra] more Eleventy arguments
 * @returns {number} 0, or the status of the build that failed
 */
function build(extra = []) {
	for (const item of builds) {
		const { args, ...rest } = options(item, extra);
		const { status } = spawnSync(process.execPath, args, rest);
		if (status !== 0) return status ?? 1;
	}
	return 0;
}

/** Build the audit site into an empty folder of its own, then swap it in, so no stale page is tested and a run serving `_a11y` keeps a whole build. */
function buildAudit() {
	const final = path.join(root, output);
	const fresh = path.join(root, "website", site);
	const fail = (status, message) => {
		rmSync(fresh, { recursive: true, force: true });
		if (message) console.error(message);
		process.exit(status);
	};
	const status = build(["--quiet"]);
	if (status !== 0) fail(status);
	// Without the project styles the accent is lost & axe fails opaquely.
	if (!existsSync(path.join(fresh, "assets/styles/project.css"))) fail(1, "The project styles were not copied to the audit build; check the passthrough copy.");
	rmSync(final, { recursive: true, force: true });
	renameSync(fresh, final);
}

/** Build both, then keep both rebuilding and serve the one output. */
async function start() {
	const status = build();
	if (status !== 0) process.exit(status);
	const children = builds.map((item) => {
		const { args, ...rest } = options(item, ["--watch", "--quiet"]);
		return spawn(process.execPath, args, rest);
	});
	const server = new EleventyDevServer("site", output, { port: 8080, pathPrefix: prefix, watch: [`${output}/**`], showVersion: false });
	server.serve(8080);
	const stop = () => {
		children.forEach((child) => child.kill());
		server.close().finally(() => process.exit(0));
	};
	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);
}

if (mode === "build") process.exitCode = build();
else if (mode === "start") await start();
else if (audit) buildAudit();
else {
	console.error("Usage: node scripts/site.js build|start|audit");
	process.exit(1);
}
