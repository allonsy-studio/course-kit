import { createRequire } from "node:module";

import { HtmlBasePlugin, InputPathToUrlTransformPlugin, RenderPlugin } from "@11ty/eleventy";
import pluginWebc from "@11ty/eleventy-plugin-webc";
import pluginTOC from "eleventy-plugin-toc";
import navigation from "@11ty/eleventy-navigation";

import { componentFiles } from "./components.js";

// createRequire, not import: the CJS Prism loader needs a real `require.cache`.
const syntaxHighlight = createRequire(import.meta.url)("@11ty/eleventy-plugin-syntaxhighlight");

/**
 * Register the third-party Eleventy plugins the sites are built on.
 * @param {import('@11ty/eleventy').UserConfig} config
 * @param {{ components?: string[], includesDir?: string }} [options] extra component globs; the course's component directory
 */
export default function registerPlugins(config, { components = [], includesDir = "_includes" } = {}) {
	config.addPlugin(InputPathToUrlTransformPlugin);
	// Rewrites root-relative URLs under a path prefix (GitHub Pages project sites).
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
