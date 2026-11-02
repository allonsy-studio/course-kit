import { createRequire } from "node:module";

import { HtmlBasePlugin } from "@11ty/eleventy";

import { patterns } from "@allons-y/webc-patterns";
import { codeBlock, tokenRanges } from "@allons-y/webc-code-sample";

import courseKit from "../index.js";

import { TOKENS } from "../lib/theme.js";

import { buildCatalog } from "./lib/catalog.js";
import { worksheet } from "./lib/sample-worksheet.js";

const axe = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

/**
 * The component preview: the kit's own plugin and the starter's data, plus a page per component and a frame per story.
 * Run from the repo root: `yarn preview`.
 */
export default async function (config) {
	courseKit(config, {
		inputDir: "preview/content",
		outputDir: "preview/_site",
		dataDir: "preview/_data",
		// The Norn components from npm: the kit owns the one WebC registration, so they join its list.
		components: ["preview/_includes/*.webc", patterns(), codeBlock],
		institution: { name: "Example College", timezone: "America/New_York" },
		pdf: false,
	});

	// The helpers the Norn components call. The English strings are their defaults.
	config.addJavaScriptFunction("nornComponentStrings", () => undefined);
	config.addJavaScriptFunction("nornTokenRanges", tokenRanges);
	config.addJavaScriptFunction("nornIcons", () => []);

	// Pages serves the preview under a path (`/course-kit/`, `/course-kit/preview/12/`); the plugin adds it to every link and asset URL.
	config.addPlugin(HtmlBasePlugin);

	// The preview's own layouts sit outside the kit's layouts folder.
	config.addLayoutAlias("shell", "../preview/_layouts/shell.webc");
	config.addLayoutAlias("frame", "../preview/_layouts/frame.webc");

	// One page per component, and one frame per story, from the catalog.
	config.addTemplate("components/component.webc", '<preview-component :@entry="component"></preview-component>', {
		layout: "shell",
		pagination: { data: "catalog.components", size: 1, alias: "component" },
		eleventyComputed: { permalink: (data) => `${data.component.url}index.html`, title: (data) => data.component.tag, description: (data) => data.component.summary },
	});
	config.addTemplate("frames/frame.webc", '<template webc:nokeep @html="frame.source"></template>', {
		layout: "frame",
		pagination: { data: "catalog.frames", size: 1, alias: "frame" },
		eleventyComputed: { permalink: (data) => `${data.frame.url}index.html`, title: (data) => data.frame.title },
	});

	config.addPassthroughCopy({ "preview/content/assets": "preview-assets" });
	config.addPassthroughCopy({ [axe]: "preview-assets/axe.min.js" });
	// The practice components read a worksheet from the page data, as a worksheet page supplies it.
	config.addGlobalData("worksheet", () => worksheet);
	config.addGlobalData("catalog", () => buildCatalog());
	config.addGlobalData("themeTokens", () => TOKENS.map(({ key, role, site }) => ({ name: `--color-${key}`, role, defined: Boolean(site) })));
	config.addWatchTarget("components/**");
	config.addWatchTarget("preview/stories/**");
	config.addWatchTarget("lib/theme.js");

	return { pathPrefix: process.env.PATH_PREFIX || "/" };
}
