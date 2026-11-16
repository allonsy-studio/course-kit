/**
 * The kit's own code block for the landing: the same markup, styles and copy button a course's Markdown fences get.
 * The landing is a Norn site, so the block's CSS is read from `assets/styles/base.css` and its tokens from `lib/theme.js`.
 */
import fs from "node:fs";
import path from "node:path";

import { resolveCopy } from "../../lib/copy.js";
import { markdown } from "../../lib/markdown.js";
import { TOKENS } from "../../lib/theme.js";

const root = path.resolve(import.meta.dirname, "../..");
const CODE_TOKENS = /^(code|highlight-line$|border$|text$|text-muted$|accent-secondary$)/;

/** A token's value as one custom property: `light-dark()` for a pair. */
const declare = ({ key, site }) => {
	const value = typeof site === "object" ? `light-dark(${site.light}, ${site.dark})` : site;
	return `--color-${key}: ${value};`;
};

/** The block's styles: its tokens, the few base variables it reads, then the rules from the kit's stylesheet. */
export function codeCss() {
	const css = fs.readFileSync(path.join(root, "assets/styles/base.css"), "utf8");
	const start = css.indexOf("/* ---- Code blocks ----");
	const end = css.indexOf(":where(kbd)");
	if (start === -1 || end === -1) throw new Error("website: the code block's rules moved in assets/styles/base.css; update lib/code.js.");
	const tokens = TOKENS.filter(({ key, site }) => site && CODE_TOKENS.test(key)).map(declare).join("\n\t");
	return `:root {\n\t${tokens}\n\t--thin-border-width: 1px;\n\t--target-min: 44px;\n\t--sans-font: var(--norn-font-body, system-ui, sans-serif);\n\t--mono-font: var(--norn-font-mono, ui-monospace, monospace);\n\t--font-weight--semi-bold: 600;\n}\n${css.slice(start, end)}`;
}

/** The `#copy-data` block `copy.js` reads its wording from. */
export const copyData = () => JSON.stringify({ code: resolveCopy().code }).replaceAll("<", "\\u003c");

/**
 * One fenced sample as the kit renders it.
 * @param {string} code
 * @param {string} language
 * @param {string} [title] file name shown beside the language
 * @returns {string} the `figure.code-block` markup
 */
export function kitCode(code, language, title) {
	const info = title ? `${language} title="${title}"` : language;
	return markdown.render(`\`\`\`${info}\n${code}\n\`\`\`\n`, { page: { inputPath: "./website/content/index.webc" } });
}
