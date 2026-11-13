import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { CLIENT_COPY, COPY_DEFAULTS } from "../lib/copy.js";

/** A default as a table cell: pipes escaped, the empty string shown as such. */
const cell = (value) => (value === "" ? "(empty)" : `\`${value.replace(/\|/g, "\\|").replace(/\u00a0/g, "\\u00a0")}\``);

/** @returns {string} docs/copy.md, generated from `COPY_DEFAULTS` */
export function copyDoc() {
	const sections = Object.entries(COPY_DEFAULTS).map(([ns, table]) => {
		const rows = Object.entries(table).map(([key, value]) => (ns === "code" && key === "languages" ? `| \`languages\` | a map of language names to labels (${Object.keys(value).length} entries; see \`lib/copy.js\`) |` : `| \`${key}\` | ${cell(value)} |`));
		return `## \`${ns}\`\n\n| Key | Default |\n|---|---|\n${rows.join("\n")}`;
	});
	return `# Copy keys

Generated from \`lib/copy.js\` by \`yarn docs\`. Do not edit by hand.

Every student-facing and instructor-facing string, by namespace. Override any key in the course's \`_data/strings.json\`, which has this shape and is partial; see [Changing the wording](configuration.md#changing-the-wording). \`{name}\` marks a value filled at render time. A key with \`_one\` and \`_other\` variants is picked by a count.

## What a page carries

A page's \`#copy-data\` block carries only the namespaces its scripts read: ${CLIENT_COPY.map((ns) => `\`${ns}\``).join(", ")} (\`CLIENT_COPY\` in \`lib/copy.js\`); a worksheet's own copy replaces \`worksheet\`. A course whose own script reads more adds them: \`courseKit(config, { clientCopy: ["demo", "demoCheck"] })\`. A script never parses the block itself: the layout renders a small reader after it, and the script uses \`window.ckCopy.t("ns", "key", vars)\`. A test scans the kit's scripts and fails if a namespace they read is missing from \`CLIENT_COPY\`, or one is listed that no script reads.

## Naming

- The namespace is the component, layout, script or build module's file name in lowerCamelCase (\`schedule-overview\` is \`scheduleOverview\`).
- The key is the lowerCamelCase of the first four words of the English string, with punctuation and placeholders dropped ("Full requirements, milestone dates, and…" is \`fullRequirementsMilestoneDates\`). A string that is mostly placeholders, or that collides with another key in its namespace, gets a short descriptive name instead (\`contrast\`, \`weekDay\`, \`footer\`).
- The default is the English with each interpolated value turned into a \`{name}\` placeholder.
- A course that has components of its own adds its own namespaces; see [Course-only copy](configuration.md#course-only-copy).

${sections.join("\n\n")}
`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) writeFileSync(new URL("../docs/copy.md", import.meta.url), copyDoc());
