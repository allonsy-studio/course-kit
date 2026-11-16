import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { packageRoot } from "../lib/paths.js";

const schema = JSON.parse(fs.readFileSync(path.join(packageRoot, "schemas", "worksheet.schema.json"), "utf8"));
const validate = addFormats(new Ajv2020({ allErrors: true, strict: false })).compile(schema);

test("the worksheet schema has the `order` that <practice-index> sorts by", () => {
	assert.equal(schema.properties.order.type, "integer");
	const base = { title: "Practice 1", heading: "Practice 1", sections: [] };
	assert.ok(validate({ ...base, order: 2 }), JSON.stringify(validate.errors));
	assert.ok(!validate({ ...base, order: "first" }));
	assert.ok(!validate({ ...base, order: 1.5 }));
});

test("every worksheet field a component reads for the index is in the schema", () => {
	const source = fs.readFileSync(path.join(packageRoot, "components", "site", "practice-index.webc"), "utf8");
	for (const field of [...source.matchAll(/data\.worksheet\??\.(\w+)/g)].map((match) => match[1])) assert.ok(field in schema.properties, `${field} is not in worksheet.schema.json`);
});
