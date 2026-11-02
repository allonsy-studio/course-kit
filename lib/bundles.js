import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

import { RenderPlugin } from "@11ty/eleventy";

import { assetPath } from "./assets.js";

const requireResolve = createRequire(import.meta.url).resolve;

/**
 * Register 11ty bundles here for import into eleventy.config.js.
 * @param {import('@11ty/eleventy').TemplateConfig} config
 * @param {{ inputDir?: string }} [options]
 */
export default function registerBundles(config, { inputDir = "content" } = {}) {
	config.addBundle("css", {
		toFileDirectory: config.directoryAssignments.css,
	});

	config.addBundle("js", {
		toFileDirectory: config.directoryAssignments.js,
	});

	let templateConfig;
	let extensionMap;
	config.on("eleventy.config", (instance) => {
		templateConfig = instance;
	});
	config.on("eleventy.extensionmap", (map) => {
		extensionMap = map;
	});

	/**
	 * Render a template file into a page's `css` or `js` bundle, for
	 * `getBundle(type)` to inline; strips front matter and swaps `deck.css`'s
	 * font import for the inlined data URIs on an embedded render, so a deck
	 * saved to disk still has its fonts.
	 * @param {"css"|"js"} type bundle name
	 * @param {string} inputPath project-relative, e.g. "content/styles/deck.css"
	 * @param {object} data the calling page's data cascade (`$data`)
	 * @param {string} [bucket] bundle bucket; a page emits buckets in the order
	 *   it needs them, which is how site CSS stays ahead of component CSS
	 * @returns {Promise<string>} always empty — the code lands in the bundle
	 */
	config.addJavaScriptFunction("bundleFile", async function (type, inputPath, data, bucket = "default") {
		const options = { templateConfig, extensionMap };
		const context = { page: data.page, eleventy: data.eleventy };
		const located = inputPath.startsWith(`${inputDir}/`) ? assetPath(inputPath.slice(inputDir.length + 1), inputDir) : null;
		const source = await readFile(located ?? inputPath, "utf8");
		const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
		const render =
			body === source
				? await RenderPlugin.File.call(context, located ?? inputPath, options)
				: await RenderPlugin.String.call(context, body, extensionMap.getKey(inputPath), options);
		let code = await render({ ...data, embed: true });
		if (type === "css" && data.fontFaces) {
			// Regex, not a literal string match: cssnano may reformat the
			// import's quotes/whitespace in production before this runs.
			code = code.replace(/@import\s*(?:url\()?["']?font\.css["']?\)?\s*;/, data.fontFaces);
		}
		return config.getPairedShortcode(type).call(context, code, bucket, data.page.url);
	});

	/**
	 * Add a vendored stylesheet or script to a page's bundle, verbatim.
	 * Resolved through `require.resolve`, never an assembled `node_modules`
	 * path, so it survives a linker change.
	 * @param {"css"|"js"} type bundle name
	 * @param {string} spec module specifier, e.g. "prism-themes/themes/prism-coldark-cold.css"
	 * @param {object} data the calling page's data cascade (`$data`)
	 * @param {string} [bucket] bundle bucket, as for `bundleFile`
	 * @returns {Promise<string>} always empty — the code lands in the bundle
	 */
	config.addJavaScriptFunction("bundleVendor", async function (type, spec, data, bucket = "default") {
		const context = { page: data.page, eleventy: data.eleventy };
		const code = await readFile(requireResolve(spec), "utf8");
		return config.getPairedShortcode(type).call(context, code, bucket, data.page.url);
	});
}
