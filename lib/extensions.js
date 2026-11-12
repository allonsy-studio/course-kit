import { existsSync } from "node:fs";
import path from "node:path";

import esbuild from "esbuild";

import { assetPath } from "./assets.js";
import { processCSS } from "./postcss.js";
import { applyTokens, resolveTheme } from "./theme.js";

/**
 * Build `.js` under a `scripts` directory with esbuild and `.css` with PostCSS, each written flat to `/js` and `/styles`. See docs/internals.md.
 * @param {import('@11ty/eleventy').UserConfig} config
 * @param {{ isProduction: boolean, inputDir?: string, theme?: () => ReturnType<typeof resolveTheme> }} options `theme` is read per compile, so a saved theme.json shows under --watch
 */
export default function registerExtensions(config, { isProduction, inputDir = "content", theme = () => resolveTheme() }) {
	config.addTemplateFormats("js");
	config.addExtension("js", {
		outputFileExtension: "js",
		useLayouts: false,
		async compile(content, inputPath) {
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
			permalink(_, inputPath) {
				// Same guard as compile, or every .js file collides on its permalink.
				if (!path.parse(inputPath).dir.endsWith("scripts")) return false;
				return () => path.join(config.directoryAssignments.js, path.basename(inputPath));
			},
		},
	});

	config.addTemplateFormats("css");
	config.addExtension("css", {
		outputFileExtension: "css",
		useLayouts: false,
		async compile(content, inputPath) {
			const parsed = path.parse(inputPath);
			if (parsed.base.startsWith("_")) return;

			return async () => {
				if (!content || !content.trim()) return content;
				return processCSS(applyTokens(content, theme()), this, { inputDir });
			};
		},
		compileOptions: {
			permalink(_, inputPath) {
				// Same guard as compile.
				if (path.parse(inputPath).base.startsWith("_")) return false;
				return () => path.join(config.directoryAssignments.css, path.basename(inputPath));
			},
		},
	});
}
