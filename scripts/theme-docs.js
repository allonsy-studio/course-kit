import { writeFileSync } from "node:fs";

import { GRADIENT, TOKENS } from "../lib/theme.js";

const show = (value) => (value === undefined ? "" : typeof value === "string" ? `\`${value}\`` : `\`${value.light}\` / \`${value.dark}\``);

/** @returns {string} docs/tokens.md, generated from the token table */
export function tokensDoc() {
	const rows = TOKENS.map((token) => `| \`${token.key}\` | \`--color-${token.key}\` | ${token.role} | ${show(token.site)} | ${show(token.deck)} |`);
	return `# Color tokens

Generated from \`lib/theme.js\` by \`yarn schema\`. Do not edit by hand.

Every color in the site and the slide decks comes from one of these. Override any of them in the course's \`_data/theme.json\`; the key is the token name without \`--color-\`. A value is one color, or \`{ "light": color, "dark": color }\`.

| Key | CSS | Role | Site default | Deck default |
|---|---|---|---|---|
${rows.join("\n")}
| \`gradient\` | \`--color-gradient-1\` to \`-4\`, \`--gradient-stops\` | Decorative gradient, one to four colors | ${GRADIENT.map(show).join(", ")} | |

A blank default means that stylesheet does not use the token.

## Scope

- A top-level key applies to the site and the decks.
- \`"site": { … }\` applies to the site only; \`"deck": { … }\` to the decks only. Either wins over a top-level key.

\`\`\`json
{
	"$schema": "../node_modules/@allons-y/course-kit/schemas/theme.schema.json",
	"accent": "#7BD1E6",
	"accent-text": { "light": "hsl(193deg 58% 31%)", "dark": "hsl(192deg 68% 72%)" },
	"site": { "page": { "light": "#FBF9F3", "dark": "hsl(228deg 20% 12%)" } },
	"gradient": ["#7BD1E6", "#FFC233"]
}
\`\`\`
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	writeFileSync(new URL("../docs/tokens.md", import.meta.url), tokensDoc());
}
