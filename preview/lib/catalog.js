import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { readHeader } from "../../scripts/component-docs.js";
import { markdown } from "../../lib/markdown.js";
import { TOKENS } from "../../lib/theme.js";
import { matrixCells, PROPS, renderMatrix, renderStory, SLOTS } from "./render-story.js";

const root = path.resolve(import.meta.dirname, "..", "..");
const componentsDir = path.join(root, "components");
const storiesDir = path.join(root, "preview", "stories");

/** The component folders, in the order the preview shows them. */
export const GROUPS = [
	{ id: "ui", title: "Building blocks", description: "Props and slots only; they never read the page's data. Use them anywhere." },
	{ id: "site", title: "Site sections", description: "Parts of a course site. Most read the course's data files, so they work with no props." },
	{ id: "practice", title: "Practice worksheets", description: "The widgets a practice worksheet is made of." },
];

/** Components with nothing to show on their own: they render only inside another. */
export const NO_STORY = new Set(["today-marker"]);

/** @param {string} text @returns {string} `text` with `code` spans as elements, HTML escaped */
export const inline = (text) =>
	text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/`([^`]+)`/g, "<code>$1</code>");

/** Start case, as Storybook names a story from its export: `LongText` is "Long Text". */
export const startCase = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (first) => first.toUpperCase());

/** Kebab case, for a story's URL. */
export const kebabCase = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const tokenRoles = new Map(TOKENS.map((token) => [`--color-${token.key}`, token.role]));

/** The tokens the site's stylesheet defines; the rest are the decks' alone. */
const siteTokens = new Set(TOKENS.filter((token) => token.site).map((token) => `--color-${token.key}`));

/**
 * The color tokens a component's CSS reads, with what each colors.
 * @param {string} source a `.webc` file
 * @returns {{ name: string, role: string }[]}
 */
export function tokensRead(source) {
	const names = [...new Set([...source.matchAll(/var\((--color-[a-z-]+)/g)].map((match) => match[1]))].filter((name) => tokenRoles.has(name));
	return names.sort().map((name) => ({ name, role: tokenRoles.get(name), defined: siteTokens.has(name) }));
}

/**
 * A CSF file's default export and stories, in export order. The import carries the file's mtime so an edit is read again.
 * @param {string} file
 * @returns {Promise<{ meta: object, stories: { exportName: string, args?: object, name?: string }[] }>}
 */
async function readStories(file) {
	const module = await import(`${pathToFileURL(file).href}?v=${statSync(file).mtimeMs}`);
	const source = readFileSync(file, "utf8");
	const exported = [...source.matchAll(/^export const (\w+)/gm)].map((match) => match[1]);
	return { meta: module.default ?? {}, stories: exported.filter((name) => module[name]).map((exportName) => ({ exportName, ...module[exportName] })) };
}

/**
 * A story's frame: the component, inside the page context the story gives it.
 * `wrap` is markup with `{story}` where the component goes (a `#today` target for the Today link, a list for a `<dt>`);
 * `note` is a line of explanation shown above it, for a component whose real output depends on the page or the reader's clock.
 * `empty` marks a story whose frame is meant to render nothing visible, and says why.
 * @param {string} markup
 * @param {{ wrap?: string, note?: string, empty?: string }} story
 */
function framed(markup, story) {
	// A frame that renders nothing visible fails the audit, unless its story says why: `empty: "reason"`.
	if (story.empty) return `${markup}\n<template data-story-empty>${story.empty}</template>`;
	const wrapped = story.wrap ? story.wrap.replace("{story}", () => markup) : markup;
	return story.note ? `<p class="story-note" style="margin: 0 0 1rem; padding: 0.5rem 0.75rem; border-inline-start: 3px solid var(--color-accent); font-size: 0.9em">${story.note}</p>\n${wrapped}` : wrapped;
}

/**
 * The argTypes the header derives: each prop and slot, with its type and description.
 * @param {ReturnType<typeof readHeader>} header
 */
function derivedArgTypes(header) {
	const argTypes = {};
	for (const prop of header?.props ?? []) argTypes[prop.name] = { description: prop.text, type: { name: prop.type }, table: { category: PROPS, type: { summary: prop.type } }, optional: prop.optional };
	for (const slot of header?.slots ?? []) argTypes[slot.name] = { description: slot.text, table: { category: SLOTS } };
	// Every component can take children, whether or not its header lists the default slot.
	argTypes.default ??= { description: "The content between the tags.", table: { category: SLOTS } };
	return argTypes;
}

/**
 * Every component, its stories and its frames.
 * @returns {Promise<{ groups: object[], components: object[], frames: object[] }>}
 */
export async function buildCatalog() {
	const components = [];
	const frames = [];
	for (const group of GROUPS) {
		for (const file of readdirSync(path.join(componentsDir, group.id)).filter((name) => name.endsWith(".webc")).sort()) {
			const tag = path.basename(file, ".webc");
			const source = readFileSync(path.join(componentsDir, group.id, file), "utf8");
			const header = readHeader(source);
			const csfFile = path.join(storiesDir, group.id, `${tag}.stories.js`);
			let csf = null;
			try {
				statSync(csfFile);
				csf = await readStories(csfFile);
			} catch (error) {
				if (error.code !== "ENOENT") throw error;
			}

			const derived = derivedArgTypes(header);
			const argTypes = Object.fromEntries([...new Set([...Object.keys(derived), ...Object.keys(csf?.meta.argTypes ?? {})])].map((name) => [name, { table: { category: PROPS }, ...derived[name], ...csf?.meta.argTypes?.[name] }]));
			const url = `/components/${group.id}/${tag}/`;
			const baseline = csf?.meta.args ?? {};
			const stories = (csf?.stories ?? []).map((story) => {
				const args = { ...baseline, ...story.args };
				const frameUrl = `/frames/${group.id}/${tag}/${kebabCase(story.exportName)}/`;
				const markup = renderStory(tag, args, argTypes);
				frames.push({ groupId: group.id, url: frameUrl, title: `${tag}: ${story.name ?? startCase(story.exportName)}`, source: framed(markup, story) });
				return { name: story.name ?? startCase(story.exportName), frameUrl, source: markup, language: "html", height: story.height ?? csf.meta.height };
			});

			const cells = csf ? matrixCells({ args: baseline, argTypes }, csf.stories.find((story) => story.exportName === "Default")) : [];
			if (cells.length) {
				const matrixUrl = `/frames/${group.id}/${tag}/matrix/`;
				frames.push({ groupId: group.id, url: matrixUrl, title: `${tag}: matrix`, source: renderMatrix(tag, cells, argTypes) });
				stories.push({ name: "Every option", frameUrl: matrixUrl, source: "", matrix: true });
			}

			components.push({
				tag,
				group: group.id,
				groupTitle: group.title,
				url,
				summary: header?.summary ?? "",
				summaryHtml: inline(header?.summary ?? ""),
				props: (header?.props ?? []).map((prop) => ({ ...prop, type: prop.type || "string", textHtml: inline(prop.text) })),
				slots: (header?.slots ?? []).map((slot) => ({ ...slot, textHtml: inline(slot.text) })),
				tokens: tokensRead(source),
				stories,
				hasStory: stories.length > 0,
				noStory: NO_STORY.has(tag),
			});
		}
	}
	// A code fence is Markdown, not a component, so it has a frame of its own: the figure the renderer writes, with its copy button.
	const fences = '```js title="tag-filter.js"\nconst tags = ["html", "css"];\nconst first = tags[0];\nconsole.log(first);\n```\n\n```bash\n$ yarn install\n```\n';
	frames.push({ groupId: "ui", url: "/frames/ui/code-block/default/", title: "code-block: sample", source: markdown.render(fences, { page: { inputPath: "./content/guide.md" } }) });
	return { groups: GROUPS.map((group) => ({ ...group, components: components.filter((c) => c.group === group.id) })), components, frames };
}
