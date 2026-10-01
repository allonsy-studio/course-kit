import { writeFileSync } from "node:fs";

import { TOKENS } from "../lib/theme.js";

/** @returns {object} the JSON schema for `_data/theme.json`, generated from the token table */
export function themeSchema() {
	const color = { $ref: "#/$defs/color" };
	const tokens = Object.fromEntries(TOKENS.map((token) => [token.key, { ...color, description: `${token.role}. CSS: --color-${token.key}` }]));
	return {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		$id: "https://github.com/allonsy-studio/course-kit/schemas/theme.schema.json",
		title: "Course theme",
		description: "Color overrides for the course site and its slide decks. Every key is optional; anything left out uses the package default. See docs/tokens.md.",
		type: "object",
		additionalProperties: false,
		properties: {
			$schema: { type: "string" },
			...tokens,
			gradient: { type: "array", minItems: 1, maxItems: 4, items: color, description: "One to four colors for decorative gradients. CSS: --color-gradient-1 to -4, joined as --gradient-stops" },
			site: { type: "object", additionalProperties: false, properties: tokens, description: "Overrides that apply to the site only, not the slide decks" },
			deck: { type: "object", additionalProperties: false, properties: tokens, description: "Overrides that apply to slide decks only" },
		},
		$defs: {
			color: {
				description: "A CSS color, or a pair for light and dark mode",
				oneOf: [
					{ type: "string", minLength: 1, pattern: "^[^;{}<>]+$" },
					{
						type: "object",
						additionalProperties: false,
						required: ["light", "dark"],
						properties: { light: { type: "string", minLength: 1, pattern: "^[^;{}<>]+$" }, dark: { type: "string", minLength: 1, pattern: "^[^;{}<>]+$" } },
					},
				],
			},
		},
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	writeFileSync(new URL("../schemas/theme.schema.json", import.meta.url), `${JSON.stringify(themeSchema(), null, "\t")}\n`);
}
