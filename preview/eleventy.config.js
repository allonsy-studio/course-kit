import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { HtmlBasePlugin } from "@11ty/eleventy";

import { patterns } from "@allons-y/webc-patterns";
import { buildSite } from "@allons-y/webc-patterns/project";
import { components as ossComponents, tokens as ossTokens, brand as ossBrand, fonts as ossFonts, ossProps } from "@allons-y/webc-oss-site";
import { codeBlock, tokenRanges } from "@allons-y/webc-code-sample";

import courseKit from "../index.js";

import { minifyInline } from "../lib/minify.js";
import { TOKENS } from "../lib/theme.js";

import { withPreview } from "../website/lib/chrome.js";

import { buildCatalog } from "./lib/catalog.js";
import { worksheet } from "./lib/sample-worksheet.js";

const axe = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const here = import.meta.dirname;

/** The landing's facts and copy, so the preview's header and footer match it. */
const site = buildSite({ packagePath: path.join(here, "../package.json"), projectPath: path.join(here, "../website/_data/project.json") });
const project = JSON.parse(fs.readFileSync(path.join(here, "../website/_data/project.json"), "utf8"));

/**
 * The shared header and footer for a preview page, with every link relative so Pages prefixes can't break them.
 * @param {string} url the page's URL inside the preview, such as `/button/`
 */
function chromeFor(url) {
	const depth = url.split("/").filter(Boolean).length;
	const up = (n) => "../".repeat(n) || "./";
	const landing = up(depth + 1);
	const props = withPreview(ossProps(site, project, { anchors: true }), { components: up(depth), theme: `${up(depth)}theme/` });
	const rel = (href) => (href.startsWith("#") ? `${landing}${href}` : href);
	const links = (list) => list.map((link) => ({ ...link, href: rel(link.href), current: link.href === (url === "/theme/" ? `${up(depth)}theme/` : null) }));
	return {
		name: props.name,
		home: landing,
		nav: links(props.nav),
		footer: { ...props.footer, groups: props.footer.groups.map((group) => ({ ...group, links: links(group.links) })) },
	};
}

/**
 * The component preview: the kit's own plugin and the starter's data, plus a page per component and a frame per story.
 * Run from the repo root: `yarn preview`.
 */
export default async function (config) {
	courseKit(config, {
		inputDir: "preview/content",
		outputDir: process.env.PREVIEW_OUTPUT ?? "preview/_site",
		dataDir: "preview/_data",
		// The Norn components from npm: the kit owns the one WebC registration, so they join its list.
		components: ["preview/_includes/*.webc", patterns(), codeBlock, ossComponents],
		institution: { name: "Example College", timezone: "America/New_York" },
		pdf: false,
	});

	// The helpers the Norn components call. The English strings are their defaults.
	config.addJavaScriptFunction("nornComponentStrings", () => undefined);
	config.addJavaScriptFunction("nornTokenRanges", tokenRanges);
	config.addJavaScriptFunction("nornIcons", () => []);
	config.addJavaScriptFunction("chromeFor", chromeFor);
	config.addJavaScriptFunction("brandCss", () => [ossTokens, ossBrand].map((file) => fs.readFileSync(file, "utf8")).join("\n"));

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
	// oss-head's font URLs are relative to a bundle file; inline in a page they need the fonts' real path.
	config.addTransform("oss-fonts", function (content) {
		return typeof this.page.outputPath === "string" && this.page.outputPath.endsWith(".html") ? content.replaceAll('url("../assets/fonts/', `url("${process.env.PATH_PREFIX || "/"}assets/fonts/`) : content;
	});
	config.addPassthroughCopy({ [ossFonts]: "assets/fonts" });
	config.addPassthroughCopy({ [axe]: "preview-assets/axe.min.js" });
	// The practice components read a worksheet from the page data, as a worksheet page supplies it.
	config.addGlobalData("worksheet", () => worksheet);
	config.addGlobalData("catalog", () => buildCatalog());
	config.addGlobalData("themeTokens", () => TOKENS.map(({ key, role, site }) => ({ name: `--color-${key}`, role, defined: Boolean(site) })));
	config.addWatchTarget("components/**");
	config.addWatchTarget("preview/stories/**");
	config.addWatchTarget("lib/theme.js");
	// MINIFY=1 builds the preview as a course that minifies its inline code would: the audit then runs against that output.
	if (process.env.MINIFY && process.env.MINIFY !== "0") config.addTransform("minify-inline", minifyInline({ production: false }));

	return { pathPrefix: process.env.PATH_PREFIX || "/" };
}
