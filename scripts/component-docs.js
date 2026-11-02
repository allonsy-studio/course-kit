import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "components");

const FOLDERS = [
	["ui", "Building blocks", "Take props and slots only; they never read the page's data. Use them anywhere."],
	["site", "Site sections", "Parts of a course site. Most read the course's data files, so they work with no props."],
	["practice", "Practice worksheets", "The widgets a practice worksheet is made of. `<practice-worksheet>` assembles them; you rarely use the others directly."],
];

/**
 * Split a `@prop {type} [name] description` line, where the type may nest braces.
 * @param {string} line the text after the tag
 * @returns {{ type: string, name: string, optional: boolean, text: string }}
 */
const parseProp = (line) => {
	let type = "";
	let rest = line;
	if (line.startsWith("{")) {
		let depth = 0;
		let end = 0;
		for (; end < line.length; end++) {
			if (line[end] === "{") depth++;
			if (line[end] === "}" && --depth === 0) break;
		}
		type = line.slice(1, end);
		rest = line.slice(end + 1).trim();
	}
	const [token, ...words] = rest.split(/\s+/);
	const optional = token.startsWith("[");
	return { type, name: token.replace(/^\[|\].*$/g, ""), optional, text: words.join(" ") };
};

/**
 * The header comment of a component: its summary, props and slots.
 * @param {string} source a `.webc` file
 * @returns {{ summary: string, props: ReturnType<typeof parseProp>[], slots: { name: string, text: string }[] } | null}
 */
export function readHeader(source) {
	const comment = source.match(/<script webc:setup>\s*\/\*\*([\s\S]*?)\*\//)?.[1];
	if (comment === undefined) return null;
	const lines = comment.split("\n").map((line) => line.replace(/^\s*\*? ?/, "").trimEnd());
	const summary = [];
	const props = [];
	const slots = [];
	let current = summary;
	for (const line of lines) {
		if (line.startsWith("@prop ")) {
			props.push(parseProp(line.slice(6)));
			current = props.at(-1);
		} else if (line.startsWith("@slot ")) {
			const [name, ...words] = line.slice(6).split(/\s+/);
			slots.push({ name, text: words.join(" ") });
			current = slots.at(-1);
		} else if (line.trim() && Array.isArray(current)) current.push(line.trim());
		else if (line.trim()) current.text = `${current.text} ${line.trim()}`.trim();
	}
	return { summary: summary.join(" "), props, slots };
}

const cell = (text) => text.replaceAll("|", "\\|").replaceAll("\n", " ");

/** @returns {string} docs/components-reference.md, generated from the component headers */
export function componentsDoc() {
	const out = [
		"# Component reference",
		"",
		"Generated from the header comment of each file in `components/` by `yarn docs`. Do not edit by hand.",
		"",
		"A component is a custom tag you write in a `.webc` page (not in a Markdown file, where the tag is left as it is). Give it a value with `@name=\"text\"`, or with `:@name=\"expression\"` to pass data:",
		"",
		"```html",
		"<course-summary></course-summary>",
		"<assigned-list @label=\"Read before class\" :@items=\"week.readings\"></assigned-list>",
		"```",
		"",
		"A prop in square brackets is optional. To change a component for your course, copy its file into your own `_includes` folder: your copy replaces the kit's, by file name.",
		"",
	];
	for (const [folder, title, blurb] of FOLDERS) {
		out.push(`## ${title}`, "", blurb, "");
		const dir = path.join(root, folder);
		const files = readdirSync(dir, { recursive: true }).filter((file) => file.endsWith(".webc")).sort();
		const icons = files.filter((file) => file.startsWith("icons"));
		for (const file of files.filter((file) => !file.startsWith("icons"))) {
			const header = readHeader(readFileSync(path.join(dir, file), "utf8"));
			const name = path.basename(file, ".webc");
			out.push(`### \`<${name}>\``, "", header?.summary || "_No description yet._", "");
			if (header?.props.length) {
				out.push("| Prop | Type | |", "|---|---|---|");
				for (const prop of header.props) out.push(`| \`${prop.optional ? `[${prop.name}]` : prop.name}\` | \`${cell(prop.type || "any")}\` | ${cell(prop.text)} |`);
				out.push("");
			}
			if (header?.slots.length) {
				out.push("Slots:", "");
				for (const slot of header.slots) out.push(`- \`${slot.name}\`: ${slot.text}`);
				out.push("");
			}
		}
		if (icons.length) out.push(`Icons, each an inline SVG that takes its color from the text: ${icons.map((file) => `\`<${path.basename(file, ".webc")}>\``).join(", ")}.`, "");
	}
	return `${out.join("\n").trimEnd()}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	writeFileSync(new URL("../docs/components-reference.md", import.meta.url), componentsDoc());
}
