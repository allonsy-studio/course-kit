// Named .js in "type": "module" projects; .mjs loads as ESM elsewhere.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

import Eleventy from "@11ty/eleventy";
import { defineConfig } from "cypress";

const PORT = 8080;
const ROOT = join(import.meta.dirname, "..");
const BUILD_DIR = join(import.meta.dirname, "_a11y");
const SPEC_DIR = join(import.meta.dirname, "cypress/e2e");

/** The specs that read the page list, found by their `Cypress.env("pages")`. A shard past the first runs only these; the first also runs the rest. */
const PAGE_SPECS = readdirSync(SPEC_DIR)
	.filter((file) => file.endsWith(".cy.js") && readFileSync(join(SPEC_DIR, file), "utf8").includes('Cypress.env("pages")'))
	.sort();

/**
 * Reads `BROWSER_SHARD` ("2/4": the second of four runs).
 * @param {string | undefined} value
 * @returns {{ index: number, count: number }}
 */
const parseShard = (value) => {
	if (!value) return { index: 1, count: 1 };
	const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(value);
	const [index, count] = match ? [Number(match[1]), Number(match[2])] : [0, 0];
	if (!match || index > count) throw new Error(`BROWSER_SHARD must be "<index>/<count>", such as "2/4"; got "${value}".`);
	return { index, count };
};

const toUrl = (file) => `/${file.split(sep).join("/").replace(/(^|\/)index\.html$/, "$1")}`;

export default defineConfig({
	// Cypress's bundled Electron: Chromium, so media emulation works, and its version moves only with Cypress, not with the runner image.
	defaultBrowser: "electron",
	e2e: {
		baseUrl: `http://127.0.0.1:${PORT}`,
		viewportWidth: 1280,
		viewportHeight: 800,
		video: false,
		screenshotOnRunFailure: true,
		defaultCommandTimeout: 8000,
		async setupNodeEvents(on, config) {
			// Unprefixed build, served by Eleventy: a local server serves from `/`.
			// The output folder comes from the site config (`SITE_OUTPUT`), not an Eleventy option: the bundle plugin writes
			// the component CSS to the config's folder, so an option that moved the pages alone would leave them unstyled.
			process.env.PATH_PREFIX = "/";
			process.env.SITE_OUTPUT = "_a11y";
			const eleventy = new Eleventy(undefined, undefined, {
				configPath: join(import.meta.dirname, "eleventy.config.js"),
				runMode: "serve",
				quietMode: true,
			});
			await eleventy.init();
			await eleventy.write();
			// Without the project styles the accent is lost & axe fails opaquely.
			if (!existsSync(join(BUILD_DIR, "assets/styles/project.css"))) {
				throw new Error("The project styles were not copied to the audit build; check the passthrough copy.");
			}
			await eleventy.serve(PORT);
			on("after:run", () => eleventy.stopWatch());

			// The component preview, built beside the landing page under /components/: every component and story frame is audited too.
			const built = spawnSync(process.execPath, [join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), "--config=preview/eleventy.config.js", "--quiet"], {
				cwd: ROOT,
				stdio: "inherit",
				// The preview is built minified, as a course that opts in would ship it, so a change that a minifier breaks fails the audit (MINIFY=0 turns it off).
				env: { ...process.env, PATH_PREFIX: "/components/", PREVIEW_OUTPUT: "website/_a11y/components", MINIFY: process.env.MINIFY ?? "1" },
			});
			if (built.status !== 0) throw new Error("The component preview did not build for the audit.");

			// Every built page, or with BROWSER_SHARD every count-th one from the index-th, so pages of one kind spread across the shards.
			const { index, count } = parseShard(process.env.BROWSER_SHARD);
			config.env.pages = readdirSync(BUILD_DIR, { recursive: true })
				.filter((f) => f.endsWith(".html"))
				.map(toUrl)
				.sort()
				.filter((_, i) => i % count === index - 1);
			if (index > 1) config.specPattern = PAGE_SPECS.map((file) => `cypress/e2e/${file}`);

			on("task", {
				log(message) {
					console.log(message);
					return null;
				},
				table(rows) {
					if (Array.isArray(rows) && rows.length) console.table(rows);
					return null;
				},
			});

			return config;
		},
	},
});
