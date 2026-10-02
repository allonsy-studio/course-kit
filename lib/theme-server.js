import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { GRADIENT, TOKENS, validateTheme } from "./theme.js";

export const ENDPOINT = "/.course-kit/theme";
const MAX_BODY = 64 * 1024;

/**
 * @param {import("node:http").ServerResponse} res
 * @param {number} status
 * @param {object} body
 */
const send = (res, status, body) => {
	res.statusCode = status;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.end(JSON.stringify(body));
};

/**
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<string>}
 */
const readBody = (req) =>
	new Promise((resolve, reject) => {
		let size = 0;
		const chunks = [];
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > MAX_BODY) reject(new Error("theme: request is too large"));
			else chunks.push(chunk);
		});
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});

/** @param {import("node:http").IncomingMessage} req */
const sameOrigin = (req) => {
	const origin = req.headers.origin;
	if (!origin) return true;
	try {
		return new URL(origin).host === req.headers.host;
	} catch {
		return false;
	}
};

/**
 * Dev-server middleware for the theme panel: GET returns the token table and
 * `_data/theme.json`; POST validates and writes it.
 * @param {{ dataDir?: string }} [options]
 * @returns {(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => unknown) => Promise<unknown>}
 */
export function themeMiddleware({ dataDir = "_data" } = {}) {
	const file = join(dataDir, "theme.json");
	return async (req, res, next) => {
		if (new URL(req.url, "http://localhost").pathname !== ENDPOINT) return next();
		if (!sameOrigin(req)) return send(res, 403, { error: "theme: cross-origin request refused" });

		if (req.method === "GET") {
			let theme = {};
			try {
				theme = JSON.parse(await readFile(file, "utf8"));
			} catch (error) {
				if (error.code !== "ENOENT") return send(res, 500, { error: `theme: ${file} is not valid JSON` });
			}
			const tokens = TOKENS.map(({ key, role, site, deck }) => ({ key, role, site: site !== undefined, deck: deck !== undefined }));
			return send(res, 200, { file, tokens, gradient: GRADIENT, theme });
		}

		if (req.method === "POST") {
			if (!String(req.headers["content-type"]).startsWith("application/json")) return send(res, 415, { error: "theme: send JSON" });
			try {
				const theme = JSON.parse(await readBody(req));
				validateTheme(theme);
				const { $schema, ...rest } = theme;
				const ordered = { $schema: $schema ?? "../node_modules/@allons-y/course-kit/schemas/theme.schema.json", ...rest };
				await writeFile(file, `${JSON.stringify(ordered, null, "\t")}\n`);
				return send(res, 200, { file });
			} catch (error) {
				return send(res, 400, { error: error.message });
			}
		}

		return send(res, 405, { error: "theme: use GET or POST" });
	};
}
