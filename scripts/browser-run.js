/**
 * `yarn docs:test`: builds the audit site (`node scripts/site.js audit`), serves `website/_a11y` with Eleventy's server, then runs Cypress.
 * `BROWSER_PORT` sets the port (default 8080). `--no-build` serves the existing build; other arguments go to `cypress run`.
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

import EleventyDevServer from "@11ty/eleventy-dev-server";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "website/_a11y");
const port = Number(process.env.BROWSER_PORT || 8080);
const args = process.argv.slice(2);
const skipBuild = args.includes("--no-build");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
	console.error(`BROWSER_PORT must be a port number from 1 to 65535; got "${process.env.BROWSER_PORT}".`);
	process.exit(1);
}

if (!skipBuild) {
	const { status } = spawnSync(process.execPath, [path.join(root, "scripts/site.js"), "audit"], { cwd: root, stdio: "inherit" });
	if (status !== 0) process.exit(status ?? 1);
}

// Eleventy's server, static: no reload script in the audited pages, no watcher, and no silent move to the next port.
/**
 * Answers 400 for a badly encoded URL, which would otherwise crash the server mid-run.
 * @type {(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => void}
 */
const rejectMalformed = (req, res, next) => {
	try {
		decodeURIComponent(req.url ?? "/");
	} catch {
		return res.writeHead(400).end("Malformed URL");
	}
	next();
};

const server = new EleventyDevServer("audit", dir, {
	liveReload: false,
	domDiff: false,
	portReassignmentRetryCount: 0,
	showVersion: false,
	middleware: [rejectMalformed],
});
server.serve(port);
await server.ready();

const cypress = spawn(process.execPath, [path.join(root, "node_modules/cypress/bin/cypress"), "run", "--project", "website", ...args.filter((a) => a !== "--no-build")], {
	cwd: root,
	stdio: "inherit",
	env: { ...process.env, BROWSER_PORT: String(port) },
});
const stop = (signal) => cypress.kill(signal);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
cypress.on("exit", async (code, signal) => {
	await server.close();
	process.exit(code ?? (signal ? 1 : 0));
});
