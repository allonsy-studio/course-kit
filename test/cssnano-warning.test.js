import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { packageRoot } from "../lib/paths.js";

test("minifying CSS prints no cssnano preset warning", () => {
	const module = pathToFileURL(path.join(packageRoot, "lib", "postcss.js")).href;
	const script = `import { processCSS } from ${JSON.stringify(module)};
const out = await processCSS("a {  color : red ;  }\\n/* gone */\\nb { margin : 0 }", { file: "x.css", from: "x.css" });
process.stdout.write(String(out.css ?? out));`;
	const run = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", env: { ...process.env, ELEVENTY_ENV: "production" }, cwd: packageRoot });
	assert.equal(run.status, 0, run.stderr);
	assert.doesNotMatch(run.stderr, /CSSNANO_INSTALLED_PRESET|installed package/);
	assert.doesNotMatch(run.stdout, /gone|\s{2}/, "minified");
});
