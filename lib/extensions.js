import { existsSync } from "node:fs";
import path from "node:path";

import esbuild from "esbuild";

import { assetPath } from "./assets.js";
import { processCSS } from "./postcss.js";

/**
 * Teach Eleventy to build `.js` files under a `scripts` directory with esbuild
 * and `.css` files with PostCSS, each written flat to `/js` and `/styles`. A
 * virtual input (a package asset) has no file on disk, so esbuild reads it
 * from stdin.
 *
 * No passthrough copy for the scripts: this extension already writes every one
 * to /js/<basename>, and a copy to the same path races the compiled output.
 * When the copy lands second it overwrites the bundle with raw source and
 * leaves a corrupt tail ("Unexpected end of input").
 * @param {import('@11ty/eleventy').UserConfig} config
 * @param {{ isProduction: boolean, inputDir?: string }} options
 */
export default function registerExtensions(config, { isProduction, inputDir = "content" }) {
	config.addTemplateFormats("js");
	config.addExtension("js", {
		outputFileExtension: "js",
		useLayouts: false,
		compile: async function (content, inputPath) {
			const parsed = path.parse(inputPath);
			if (!parsed.dir.endsWith("scripts")) return;

			return async () => {
				const packaged = assetPath(`scripts/${parsed.base}`, inputDir);
				const result = await esbuild.build({
					...(existsSync(inputPath)
						? { entryPoints: [inputPath] }
						: { stdin: { contents: content, resolveDir: path.dirname(packaged ?? "."), sourcefile: packaged ?? inputPath } }),
					bundle: true,
					format: "esm",
					platform: "browser",
					minify: isProduction,
					sourcemap: isProduction ? false : "inline",
					write: false,
				});
				return result.outputFiles[0].text;
			};
		},
		compileOptions: {
			permalink: function (_, inputPath) {
				// Mirror compile's guard, or every .js file maps to
				// /js/<basename> and the duplicate-permalink check fails.
				if (!path.parse(inputPath).dir.endsWith("scripts")) return false;
				return () => path.join(config.directoryAssignments.js, path.basename(inputPath));
			},
		},
	});

	config.addTemplateFormats("css");
	config.addExtension("css", {
		outputFileExtension: "css",
		useLayouts: false,
		compile: async function (content, inputPath) {
			const parsed = path.parse(inputPath);
			if (parsed.base.startsWith("_")) return;

			return async () => {
				if (!content || !content.trim()) return content;
				return processCSS(content, this, { inputDir });
			};
		},
		compileOptions: {
			permalink: function (_, inputPath) {
				// Mirror compile's guard for underscore-prefixed partials.
				if (path.parse(inputPath).base.startsWith("_")) return false;
				return () => path.join(config.directoryAssignments.css, path.basename(inputPath));
			},
		},
	});
}
