import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { ENDPOINT, themeMiddleware } from "../lib/theme-server.js";

let server;
let base;
let dir;

before(async () => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), "course-kit-server-"));
	const middleware = themeMiddleware({ dataDir: dir });
	server = http.createServer((req, res) => middleware(req, res, () => {
		res.statusCode = 404;
		res.end("next");
	}));
	await new Promise((done) => server.listen(0, "127.0.0.1", done));
	base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (body, headers = {}) =>
	fetch(base + ENDPOINT, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("GET returns the token table and an empty theme when there is no file", async () => {
	const response = await fetch(base + ENDPOINT);
	assert.equal(response.status, 200);
	const data = await response.json();
	assert.deepEqual(data.theme, {});
	assert.ok(data.tokens.some((token) => token.key === "accent" && token.site && token.deck));
	assert.ok(data.tokens.some((token) => token.key === "link" && token.site && !token.deck));
	assert.equal(data.gradient.length, 4);
});

test("POST writes a valid theme, schema first", async () => {
	const response = await post({ accent: "#1B998B", site: { page: { light: "#FBF9F3", dark: "#181b25" } } });
	assert.equal(response.status, 200);
	const written = fs.readFileSync(path.join(dir, "theme.json"), "utf8");
	assert.ok(written.startsWith('{\n\t"$schema": "../node_modules/@allons-y/course-kit/schemas/theme.schema.json",'));
	assert.equal(JSON.parse(written).accent, "#1B998B");
	assert.equal((await (await fetch(base + ENDPOINT)).json()).theme.accent, "#1B998B");
});

test("POST refuses a bad theme and leaves the file alone", async () => {
	const before = fs.readFileSync(path.join(dir, "theme.json"), "utf8");
	const response = await post({ magenta: "#f0f" });
	assert.equal(response.status, 400);
	assert.match((await response.json()).error, /"magenta" is not a color token/);
	assert.equal((await post("{ nope")).status, 400);
	assert.equal((await post({ page: "red; } body { display: none" })).status, 400);
	assert.equal(fs.readFileSync(path.join(dir, "theme.json"), "utf8"), before);
});

test("POST refuses another origin and anything but JSON", async () => {
	assert.equal((await post({ accent: "red" }, { origin: "https://evil.example" })).status, 403);
	assert.equal((await post({ accent: "red" }, { "content-type": "text/plain" })).status, 415);
	assert.equal((await post({ accent: "red" }, { origin: base })).status, 200);
});

test("other paths pass through", async () => {
	const response = await fetch(`${base}/styles/base.css`);
	assert.equal(response.status, 404);
	assert.equal(await response.text(), "next");
});
