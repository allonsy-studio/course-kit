import path from "node:path";
import { createRequire } from "node:module";

import dotenv from "dotenv";
import dashly from "@allons-y/dashly";

import { registerAssets } from "./assets.js";
import registerBundles from "./bundles.js";
import { checkOptions, courseWarnings } from "./check.js";
import { buildGlossary, buildLessons, courseDefines, inlineFontFaces, readCourseData, readPackage, resolveAudience, resolvePdf, resolveSite, resolveTerm } from "./data/index.js";
import { copyJson, fill, plural, resolveCopy } from "./copy.js";
import registerExtensions from "./extensions.js";
import registerFilters from "./filters.js";
import registerSlideFitCheck from "./fit.js";
import { registerGlue } from "./glue.js";
import { markdown } from "./markdown.js";
import { setWorksheetDefaults } from "./worksheets.js";
import { packageRoot } from "./paths.js";
import { resolveTheme } from "./theme.js";
import { themeMiddleware } from "./theme-server.js";
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
 * @param {string} [options.dataDir] the course's authored data files
 * @param {{ name?: string, timezone?: string }} [options.institution] the college's name, and the time zone "today" is judged in (default `"UTC"`)
 * @param {{ description?: string, keywords?: string, language?: string }} [options.site] site metadata, derived from the course when omitted
 * @param {{ segments?: object[], defaultDays?: string[] }} [options.lessons] the lesson outline and the meeting days used when the schedule names none
 * @param {{ checkMode?: "question" | "end" }} [options.worksheets] site-wide worksheet defaults: `checkMode` is `"end"` (only See results at the end, the default) or `"question"` (also a Check answer button on each question); a worksheet's own `checkMode` wins
 * @param {string[]} [options.components] extra WebC component globs
 * @param {{ runtime?: "none" | "codepen" | "pyscript", dir?: string }} [options.demos] how runnable demos are served
 * @param {{ decks?: string }} [options.slides] where the deck markdown lives, under the repo root
 * @param {false | { course?: object, term?: object, dataDir?: string }} [options.pdf] `false` skips the syllabus PDF; otherwise its footer data (read from the course's `_data` when omitted)
 * @param {{ theme: { light: string, dark: string }, plugins: string[] }} [options.prism] vendored Prism theme and plugin files to publish
 * @param {object} [options.theme] color overrides in the shape of `_data/theme.json`, which wins over them
 */
export default function courseKit(config, options = {}) {
	checkOptions(options);
	const { inputDir = "content", outputDir = "public", dataDir = "_data", components = [], demos = {}, slides = {}, pdf = {}, prism = PRISM, theme, institution = {}, site = {}, lessons = {}, worksheets = {} } = options;
	resolveTheme({ dataDir, theme }); // fail at startup on a bad theme
	resolveCopy({ dataDir }); // and on a bad `strings.json`
	setWorksheetDefaults(worksheets);
	const { runtime = "none", dir: demosDir = `${inputDir}/demo` } = demos;
	const { decks: decksDir = `${inputDir}/slides` } = slides;

	dotenv.config({ path: ".env" });

	const env = process.env.ELEVENTY_ENV || "development";
	const isProduction = env === "production";
	const audience = resolveAudience().value;

	// Drafts stay out of the student build.
	config.addPreprocessor("drafts", "*", (data) => {
		if (data.draft && audience === "student") return false;
	});

	// So does instructor-only material.
	config.addPreprocessor("instructorOnly", "*", (data) => {
		if (data.instructorOnly && audience === "student") return false;
	});

	config.setDataFileBaseName("index");
	config.ignores.add("README.md");
	config.ignores.add("**/AGENTS.md");
	if (runtime === "codepen") {
		// Demo fragments are published by the course's demo data, not as pages.
		config.ignores.add(`${demosDir}/*.html`);
	}

	config.setInputDirectory(inputDir);
	config.setOutputDirectory(outputDir);

	// Student builds skip the lessons directory; glue pages use instructorOnly (docs/internals.md).
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
	config.addFilter("copyJson", copyJson);
	config.addFilter("fill", fill);
	config.addFilter("plural", plural);
	registerAssets(config, {
		inputDir,
		exclude: [...(runtime === "none" || runtime === "pyscript" ? ["styles/semantics.css"] : []), ...(isProduction ? ["scripts/theme-panel.js"] : [])],
	});
	registerGlue(config, { inputDir, pages: { "lesson-day": "lessons/lesson-day.webc", "deck-notes": "lessons/deck-notes.webc", "lesson-plans": "lessons/lesson-plans.webc" } });
	if (pdf !== false) registerSyllabusPdf(config, { isProduction, outputDir, dataDir, timezone: institution.timezone || "UTC", ...pdf });
	registerSlideFitCheck(config, { outputDir, decksDir });

	// Derived data. Config global data outranks `_data` files, so a global is skipped when the course has its own.
	const globalData = (name, value) => {
		if (!courseDefines(name, dataDir)) config.addGlobalData(name, value);
	};
	globalData("audience", () => resolveAudience());
	globalData("pdf", () => (pdf === false ? { available: false } : resolvePdf()));
	globalData("term", () => resolveTerm(readCourseData(dataDir)));
	globalData("lessons", () => {
		const data = readCourseData(dataDir);
		return buildLessons({ ...data, term: resolveTerm(data), ...lessons });
	});
	globalData("glossary", () => {
		const data = readCourseData(dataDir);
		return buildGlossary({ ...data, lessons: buildLessons({ ...data, term: resolveTerm(data), ...lessons }), slidesDir: decksDir, copy: resolveCopy({ dataDir }) });
	});
	globalData("copy", () => resolveCopy({ dataDir }));
	globalData("site", () => resolveSite({ course: readCourseData(dataDir).course, pkg: readPackage(), institution, site }));
	globalData("fontFaces", () => inlineFontFaces(inputDir));

	// Say so, once per build, when the data would give a wrong page.
	config.on("eleventy.before", () => {
		for (const warning of courseWarnings(readCourseData(dataDir))) console.warn(`[course-kit] ${warning}`);
	});

	// The theme panel: development builds only, saving through the dev server (docs/theme-panel.md).
	config.addGlobalData("themePanel", !isProduction);
	if (!isProduction) config.setServerOptions({ middleware: [themeMiddleware({ dataDir })] });

	// 11tydata files belong to the data cascade, not the `js` template format.
	config.ignores.add(`${inputDir}/**/*.11tydata.js`);
	/* Worksheet content: a data source for its page, never a page itself. */
	config.ignores.add(`${inputDir}/practice/*.worksheet.md`);
	config.addWatchTarget(`${inputDir}/practice/*.worksheet.md`);

	registerExtensions(config, { isProduction, inputDir, theme: () => resolveTheme({ dataDir, theme }) });

	config.setLibrary("md", markdown);

	dashly(config, {
		tagsExclude: [],
		...(runtime === "pyscript" ? { transforms: { htmlmin: { minifier: PYSCRIPT_MINIFIER } } } : {}),
	});

	config.addFilter("length", (array) => {
		if (!array || !Array.isArray(array)) return 0;
		return array.length;
	});

	/** Passthrough record for a resolved vendor file (docs/internals.md). */
	const requireResolve = createRequire(import.meta.url).resolve;
	function addVendorFile(spec, outputPath) {
		try {
			return { [requireResolve(spec)]: outputPath };
		} catch {
			return {};
		}
	}

	// Handouts and starter code.
	config.addPassthroughCopy(`${inputDir}/resources/*`);

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
		// Course-owned fonts.
		[`${config.directoryAssignments.input}/fonts/*`]: `/${config.directoryAssignments.fonts}/`,
	});

	if (runtime === "pyscript") {
		// Only the .py files, not the listing template; `_answer.py` solutions never publish.
		config.addPassthroughCopy(`${demosDir}/**/!(*_answer).py`);

		// Self-hosted so the demo pages need no CDN. Both packages belong to the course, so they resolve from it, not from here.
		const fromCourse = createRequire(path.resolve("package.json")).resolve;
		const packageDir = (name) => {
			try {
				return path.dirname(fromCourse(`${name}/package.json`));
			} catch {
				throw new Error(`demos.runtime "pyscript" needs the \`${name}\` package in your course. Install it: yarn add @pyscript/core pyodide`);
			}
		};
		config.addPassthroughCopy({
			[`${packageDir("@pyscript/core")}/dist/!(*.map)`]: "/pyscript/",
			[`${packageDir("pyodide")}/{pyodide.mjs,pyodide.asm.mjs,pyodide.asm.wasm,python_stdlib.zip,pyodide-lock.json}`]: "/pyodide/",
		});
	}
}
