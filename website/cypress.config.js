// Named .js in "type": "module" projects; .mjs loads as ESM elsewhere.

// `yarn docs:test` builds `_a11y` and serves it before Cypress starts (`scripts/browser-run.js`); this file only reads it.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { defineConfig } from "cypress";

import { selectPages } from "./lib/affected-pages.js";

const PORT = Number(process.env.BROWSER_PORT || 8080);
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
			const hint = "run `yarn docs:test`, which builds and serves it (`--no-build` serves an existing build)";
			if (!existsSync(BUILD_DIR)) throw new Error(`No audit build in website/_a11y; ${hint}.`);
			const up = await fetch(config.baseUrl, { signal: AbortSignal.timeout(3000) }).then(
				(res) => res.ok,
				() => false,
			);
			if (!up) throw new Error(`Nothing is serving the audit build at ${config.baseUrl}; ${hint}.`);

			// Every built page, or on a pull request only the affected ones (the workflow supplies the base build and the changed
			// files); with BROWSER_SHARD every count-th of those from the index-th, so pages of one kind spread across the shards.
			const { index, count } = parseShard(process.env.BROWSER_SHARD);
			const selected = selectPages({ headDir: BUILD_DIR, env: process.env });
			config.env.pages = selected.pages.filter((_, i) => i % count === index - 1);
			const summary = `Browser pages: ${selected.reason}; shard ${index}/${count} tests ${config.env.pages.length}.`;
			console.log(`\n${summary}\n`);
			if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Browser (${index}/${count})::${summary.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")}`);
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
