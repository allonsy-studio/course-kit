import { createRequire } from "node:module";

import { HtmlBasePlugin, InputPathToUrlTransformPlugin, RenderPlugin } from "@11ty/eleventy";
import pluginWebc from "@11ty/eleventy-plugin-webc";
import pluginTOC from "eleventy-plugin-toc";
import navigation from "@11ty/eleventy-navigation";

import { componentFiles } from "./components.js";

// `createRequire`, never ESM import: the plugin's CJS Prism loader needs a
// real `require.cache`.
const syntaxHighlight = createRequire(import.meta.url)("@11ty/eleventy-plugin-syntaxhighlight");

/**
 * Register the third-party Eleventy plugins the sites are built on.
 * @param {import('@11ty/eleventy').UserConfig} config
 * @param {{ components?: string[], includesDir?: string }} [options] extra component globs; the course's component directory
 */
export default function registerPlugins(config, { components = [], includesDir = "_includes" } = {}) {
	config.addPlugin(InputPathToUrlTransformPlugin);
	/* Rewrites root-relative URLs in HTML when a path prefix is set
	   (`--pathprefix`, used by the GitHub Pages release workflow; project
	   sites serve under /<repo>/). A no-op at the default "/" prefix. CSS
	   url() references are stylesheet-relative for the same reason. */
	config.addPlugin(HtmlBasePlugin);
	config.addPlugin(syntaxHighlight, {
		alwaysWrapLineHighlights: true,
		preAttributes: { tabindex: 0 },
	});
	config.addPlugin(pluginTOC, { ul: false });
	config.addPlugin(navigation);
	config.addPlugin(RenderPlugin, {
		accessGlobalData: true,
	});
	config.addPlugin(pluginWebc, {
		components: [...componentFiles(includesDir), ...components],
	});
}
