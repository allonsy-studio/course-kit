import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import postcss from "postcss";

/**
 * The PostCSS pipeline: partial imports (`_`-prefixed only), polyfills, and
 * minification in production. Plugin object form, as a `postcss.config.js`
 * would export it.
 * @param {{ env?: string, inputDir?: string }} [options]
 * @returns {{ env: string, map: boolean, plugins: Record<string, object> }}
 */
export default function postcssConfig({ env = process.env.ELEVENTY_ENV ?? "development", inputDir = "content" } = {}) {
	const isProduction = env === "production";
	return {
		env,
		map: !isProduction,
		plugins: {
			"postcss-import": {
				filter: (url) => url.startsWith("_") && url.endsWith(".css"),
				path: path.resolve(inputDir, "styles"),
			},
			/* stage 3; stage 4 === stable. https://preset-env.cssdb.org/features/#stage-3 */
			"postcss-preset-env": {
				stage: 3,
			},
			// Production only: keeps dev CSS close to source.
			cssnano: {
				preset: [
					"advanced",
					{
						reduceIdents: false,
						// Font families live in custom properties, invisible to
						// discardUnused, so keep them.
						discardUnused: { fontFace: false },
						normalizeWhitespace: true,
						discardComments: { removeAll: true },
					},
				],
			},
		},
	};
}

/**
 * Instantiate plugin-object form the way postcss-load-config does.
 * @param {Record<string, object>} plugins
 * @returns {Promise<import("postcss").AcceptedPlugin[]>}
 */
const instantiate = (plugins) =>
	Promise.all(
		Object.entries(plugins).map(async ([name, options]) => {
			const { default: plugin } = await import(name);
			return plugin(options);
		}),
	);

/** @type {Map<string, Promise<import("postcss").AcceptedPlugin[]>>} */
const cache = new Map();

/**
 * Process CSS through the pipeline above.
 * @param {string} content
 * @param {import('@11ty/eleventy').TemplateContext} ctx
 * @param {{ inputDir?: string }} [options]
 * @returns {Promise<string>}
 */
export async function processCSS(content, ctx, { inputDir = "content" } = {}) {
	const inputPath = ctx.page?.inputPath;
	const outputPath = ctx.page?.outputPath;
	const { plugins, env, map } = postcssConfig({ inputDir });
	if (!cache.has(env + inputDir)) cache.set(env + inputDir, instantiate(plugins));

	try {
		const result = await postcss(await cache.get(env + inputDir)).process(content, { map, from: inputPath, to: outputPath });

		// Write the map file beside the emitted stylesheet (dev only; maps
		// are disabled in production).
		if (result.map && outputPath) {
			await mkdir(path.dirname(outputPath), { recursive: true });
			await writeFile(`${outputPath}.map`, result.map.toString());
		}

		// Register @imported partials so --watch rebuilds when they change.
		const dependencies = (result.messages ?? [])
			.filter((message) => message.type === "dependency")
			.map((message) => message.file);
		if (dependencies.length > 0 && typeof ctx.addDependency === "function") {
			ctx.addDependency(inputPath, dependencies);
		}

		return result.css;
	} catch (err) {
		throw new Error(`\n[processCSS] ${inputPath}: ${err.message}`, { cause: err });
	}
}
