/**
 * One build for the whole site: the landing at the root, the component preview under `components/`.
 * `node scripts/site.js build` writes `website/_site` (what Pages serves); `start` builds, serves it, and rebuilds on change.
 * `PATH_PREFIX` is the path the site is served from (default "/"); the preview gets it with `components/` added.
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

import EleventyDevServer from "@11ty/eleventy-dev-server";

const root = path.resolve(import.meta.dirname, "..");
const eleventy = path.join(root, "node_modules", "@11ty", "eleventy", "cmd.cjs");
const output = "website/_site";
const prefix = (process.env.PATH_PREFIX || "/").replace(/\/?$/, "/");

const builds = [
	{ args: ["--config=website/eleventy.config.js"], env: { PATH_PREFIX: prefix } },
	{ args: ["--config=preview/eleventy.config.js"], env: { PATH_PREFIX: `${prefix}components/`, PREVIEW_OUTPUT: `${output}/components` } },
];
const options = (build, extra = []) => ({ cwd: root, stdio: "inherit", env: { ...process.env, ...build.env }, args: [eleventy, ...build.args, ...extra] });

/** Build both sites once. */
function build() {
	for (const item of builds) {
		const { args, ...rest } = options(item);
		const { status } = spawnSync(process.execPath, args, rest);
		if (status !== 0) process.exit(status ?? 1);
	}
}

/** Build both, then keep both rebuilding and serve the one output. */
async function start() {
	build();
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

const mode = process.argv[2];
if (mode === "build") build();
else if (mode === "start") await start();
else {
	console.error("Usage: node scripts/site.js build|start");
	process.exit(1);
}
