import path from "node:path";
import { createRequire } from "node:module";

import dotenv from "dotenv";
import dashly from "@allons-y/dashly";

import { registerAssets } from "./assets.js";
import registerBundles from "./bundles.js";
import registerExtensions from "./extensions.js";
import registerFilters from "./filters.js";
import registerSlideFitCheck from "./fit.js";
import { registerGlue } from "./glue.js";
import { markdown } from "./markdown.js";
import { packageRoot } from "./paths.js";
import { resolveTheme } from "./theme.js";
import registerSyllabusPdf from "./pdf.js";
import registerPlugins from "./plugins.js";

const PRISM = {
	theme: {
		light: "prism-coldark-cold",
		dark: "prism-coldark-dark",
	},
	plugins: ["toolbar", "copy-to-clipboard", "treeview", "command-line"],
};

/** Keep html-minifier-terser's defaults; add py-editor blocks, whose first-line indent PyScript needs. */
const PYSCRIPT_MINIFIER = {
	ignoreCustomFragments: [/<%[\s\S]*?%>/, /<\?[\s\S]*?\?>/, /<script type="py-editor"[\s\S]*?<\/script>/],
};

/**
 * The course-kit Eleventy plugin: directories, layouts, components, bundles,
 * filters, the PDF and fit hooks, the markdown dialect and every shared asset.
 * @param {import('@11ty/eleventy').UserConfig} config
 * @param {object} [options]
 * @param {string} [options.inputDir] the course's content directory
 * @param {string} [options.outputDir] where the site is written
 * @param {string[]} [options.components] extra WebC component globs
 * @param {{ runtime?: "none" | "codepen" | "pyscript", dir?: string }} [options.demos] how runnable demos are served
 * @param {{ decks?: string }} [options.slides] where the deck markdown lives, under the repo root
 * @param {{ course?: object, term?: object, dataDir?: string }} [options.pdf] the syllabus PDF footer data (read from the course's `_data` when omitted)
 * @param {{ theme: { light: string, dark: string }, plugins: string[] }} [options.prism] vendored Prism theme and plugin files to publish
 * @param {{ surface?: "white" | "paper", presets?: Record<string, { ui: string, text: string, on?: string }> }} [options.theme] page surface, and accent presets to add to the built-in five
 */
export default function courseKit(config, options = {}) {
	const { inputDir = "content", outputDir = "public", components = [], demos = {}, slides = {}, pdf = {}, prism = PRISM, theme } = options;
	const resolvedTheme = resolveTheme(theme);
	const { runtime = "none", dir: demosDir = `${inputDir}/demo` } = demos;
	const { decks: decksDir = `${inputDir}/slides` } = slides;

	dotenv.config({ path: ".env" });

	const env = process.env.ELEVENTY_ENV || "development";
	const isProduction = env === "production";
	/* Inlined in two files (here, the course's _data/audience.js); keep them in sync. */
	const audience = process.env.AUDIENCE ?? (isProduction ? "student" : "instructor");

	/* `draft: true` keeps a page out of the student build; see "Audience
	   flavors" in AGENTS.md. */
	config.addPreprocessor("drafts", "*", (data) => {
		if (data.draft && audience === "student") return false;
	});

	/* `instructorOnly: true`: same idea, for finished instructor material that
	   lives outside the lessons directory. */
	config.addPreprocessor("instructorOnly", "*", (data) => {
		if (data.instructorOnly && audience === "student") return false;
	});

	config.setDataFileBaseName("index");
	config.ignores.add("README.md");
	config.ignores.add("**/AGENTS.md");
	if (runtime === "codepen") {
		/* Demo sources are plain fragments, not templates. The course's demo
		   data reads them and paginates that roster into the downloadable
		   pages; left as templates they would publish themselves twice. */
		config.ignores.add(`${demosDir}/*.html`);
	}

	config.setInputDirectory(inputDir);
	config.setOutputDirectory(outputDir);

	// The student build never renders the lessons directory at all, not merely
	// unlinked. Path ignores do not reach virtual templates, so glue pages carry
	// `instructorOnly` as well.
	if (audience === "student") {
		config.ignores.add(`${inputDir}/lessons/**`);
	}

	// these are relative to input directory...
	config.setIncludesDirectory("../_includes");
	config.setLayoutsDirectory(path.relative(inputDir, path.join(packageRoot, "layouts")));
	config.setDataDirectory("../_data");

	config.directoryAssignments.css = "styles";
	config.directoryAssignments.js = "js";
	config.directoryAssignments.images = "images";
	config.directoryAssignments.fonts = "fonts";

	config.addLayoutAlias("base", "base.webc");
	config.addLayoutAlias("document", "document.webc");
	config.addLayoutAlias("lesson", "lesson.webc");
	config.addLayoutAlias("lesson-detail", "lesson-detail.webc");
	config.addLayoutAlias("deck", "deck.webc");
	config.addLayoutAlias("notes", "notes.webc");
	config.addLayoutAlias("worksheet", "worksheet.webc");

	registerPlugins(config, { components });
	registerBundles(config, { inputDir });
	registerFilters(config);
	registerAssets(config, { inputDir, exclude: runtime === "none" || runtime === "pyscript" ? ["styles/semantics.css"] : [] });
	registerGlue(config, { inputDir, pages: { "lesson-day": "lessons/lesson-day.webc" } });
	registerSyllabusPdf(config, { isProduction, outputDir, ...pdf });
	registerSlideFitCheck(config, { outputDir, decksDir });

	// 11tydata files belong to the data cascade, not the `js` template format.
	config.ignores.add(`${inputDir}/**/*.11tydata.js`);
	/* Worksheet content: a data source for its page, never a page itself. */
	config.ignores.add(`${inputDir}/practice/*.worksheet.md`);
	config.addWatchTarget(`${inputDir}/practice/*.worksheet.md`);

	registerExtensions(config, { isProduction, inputDir, theme: resolvedTheme });

	config.setLibrary("md", markdown);

	dashly(config, {
		tagsExclude: [],
		...(runtime === "pyscript" ? { transforms: { htmlmin: { minifier: PYSCRIPT_MINIFIER } } } : {}),
	});

	config.addFilter("length", (array) => {
		if (!array || !Array.isArray(array)) return 0;
		return array.length;
	});

	/**
	 * Resolve a vendor file and return its passthrough record. Never a
	 * hand-built node_modules path: that copies nothing, silently.
	 * @param {string} spec module specifier, e.g. "prism-themes/themes/prism-coldark-cold.css"
	 * @param {string} outputPath
	 * @returns {Record<string, string>}
	 */
	const requireResolve = createRequire(import.meta.url).resolve;
	function addVendorFile(spec, outputPath) {
		try {
			return { [requireResolve(spec)]: outputPath };
		} catch {
			return {};
		}
	}

	/* resources/* -> resources/* (handouts, starter code). */
	config.addPassthroughCopy(`${inputDir}/resources/*`);

	/* Copy assets directly to the publish directory */
	config.addPassthroughCopy({
		...addVendorFile(`prism-themes/themes/${prism.theme.light}${isProduction ? ".min" : ""}.css`, `${config.directoryAssignments.css}/prism-light.css`),
		...addVendorFile(`prism-themes/themes/${prism.theme.dark}${isProduction ? ".min" : ""}.css`, `${config.directoryAssignments.css}/prism-dark.css`),
		...prism.plugins.reduce((vendor, plugin) => {
			for (const ext of ["js", "css"]) {
				const spec = `prismjs/plugins/${plugin}/prism-${plugin}${isProduction ? ".min" : ""}.${ext}`;
				const outputPath = `${config.directoryAssignments[ext]}/prism-${plugin}.${ext}`;
				vendor = { ...vendor, ...addVendorFile(spec, outputPath) };
			}
			return vendor;
		}, {}),
		[`${config.directoryAssignments.input}/assets/favicon*`]: "/",
		[`${config.directoryAssignments.input}/assets/images/*`]: `/${config.directoryAssignments.images}/`,
		// Course-owned fonts; the package's own fonts are copied by registerAssets.
		[`${config.directoryAssignments.input}/fonts/*`]: `/${config.directoryAssignments.fonts}/`,
	});

	if (runtime === "pyscript") {
		/* Demo files publish verbatim; extension-specific so a bare
		   demos directory doesn't also copy the listing template. */
		config.addPassthroughCopy(`${demosDir}/**/*.py`);
	}
}
