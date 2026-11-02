/*
 * The syllabus PDF: the built landing page, printed with headless Chromium
 * straight after the site build (`eleventy.after`), to `public/resources/
 * syllabus.pdf`. Puppeteer is imported lazily, inside the handler, so a
 * dev/watch build never pays the Chromium launch — only a production build,
 * or a dev build with BUILD_PDF=1 set by hand, actually runs this.
 */
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

import { readCourseData } from "./data/read.js";
import { resolveTerm } from "./data/term.js";

/**
 * @param {{ course?: object, term?: object, dataDir: string }} options
 * @returns {{ course: object, term: object }} the options, else resolved from the course's data files
 */
const loadFooterData = ({ course, term, dataDir }) => {
	const data = course && term ? null : readCourseData(dataDir);
	return { course: course ?? data.course, term: term ?? resolveTerm(data) };
};

const MIME = {
	".css": "text/css",
	".html": "text/html; charset=utf-8",
	".ico": "image/x-icon",
	".jpg": "image/jpeg",
	".js": "text/javascript",
	".png": "image/png",
	".svg": "image/svg+xml",
	".txt": "text/plain",
	".woff2": "font/woff2",
	".xml": "application/xml",
};

/**
 * Serve `root` over loopback HTTP so Chromium resolves root-relative assets.
 * Strips a leading PATH_PREFIX segment. Shared with fit.js.
 */
export function servePublic(root, pathPrefix) {
	return createServer(async (request, response) => {
		try {
			const url = new URL(request.url, "http://localhost");
			let pathname = url.pathname;
			if (pathPrefix && pathPrefix !== "/" && pathname.startsWith(pathPrefix)) {
				pathname = pathname.slice(pathPrefix.length - 1) || "/";
			}
			let path = join(root, pathname);
			if (path !== root && !path.startsWith(root + sep)) throw new Error("traversal");
			if (!extname(path)) path = join(path, "index.html");
			const body = await readFile(path);
			response.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
			response.end(body);
		} catch {
			response.writeHead(404);
			response.end("not found");
		}
	});
}

/**
 * Register the `eleventy.after` handler that generates the syllabus PDF.
 * `outputDir` is passed in because Eleventy reports its default on `eleventy.after` (docs/internals.md).
 * @param {import('@11ty/eleventy').TemplateConfig} config
 * @param {{ isProduction: boolean, outputDir?: string, dataDir?: string, course?: object, term?: object }} options
 */
export default function registerSyllabusPdf(config, { isProduction, outputDir: output = "public", dataDir = "_data", course, term }) {
	config.on("eleventy.after", async ({ runMode, results }) => {
		if (runMode !== "build") return;
		if (!(isProduction || process.env.BUILD_PDF === "1")) return;
		if (!results?.length) return;

		const root = resolve(output);
		if (!existsSync(join(root, "index.html"))) {
			process.stderr.write("[syllabus-pdf] public/index.html is missing — skipping.\n");
			return;
		}

		const pathPrefix = config.pathPrefix ?? "/";
		let puppeteer;
		try {
			({ default: puppeteer } = await import("puppeteer"));
		} catch {
			throw new Error(
				"A production build writes the syllabus as a PDF with headless Chrome, and the `puppeteer` package is not installed. " +
					"Install it (yarn add puppeteer), or turn the PDF off by passing `pdf: false` to courseKit.",
			);
		}

		const server = servePublic(root, pathPrefix);
		await new Promise((done) => server.listen(0, "127.0.0.1", done));
		const { port } = server.address();

		const generated = new Date().toISOString().slice(0, 10);
		const version = (process.env.GITHUB_SHA ?? process.env.COMMIT_REF ?? "local").slice(0, 7);
		const outputDir = join(root, "resources");
		const outputPath = join(outputDir, "syllabus.pdf");
		const footerData = loadFooterData({ course, term, dataDir });

		const browser = await puppeteer.launch({
			args: process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
		});

		try {
			await mkdir(outputDir, { recursive: true });
			const page = await browser.newPage();
			await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
			await page.goto(`http://127.0.0.1:${port}${pathPrefix === "/" ? "/" : pathPrefix}`, { waitUntil: "networkidle0" });
			await page.$$eval("details", (elements) => {
				for (const details of elements) details.open = true;
			});
			await page.evaluateHandle("document.fonts.ready");
			await page.pdf({
				path: outputPath,
				format: "letter",
				// No `scale` — Chromium bleeds the margins when one is set.
				tagged: true, // Accessible PDF structure for screen readers.
				printBackground: true,
				displayHeaderFooter: true,
				headerTemplate: "<span></span>",
				footerTemplate: `<div style="width: 100%; font-size: 7px; text-align: center; color: #666;">${footerData.course.code}: ${footerData.course.name} — ${footerData.term.label} syllabus · Generated ${generated} (${version}) · Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
				margin: { top: "0.4in", bottom: "0.45in", left: "0.5in", right: "0.5in" },
			});
			await page.close();
			process.stdout.write(`[syllabus-pdf] wrote ${outputPath.replace(root, "")}\n`);
		} finally {
			await browser.close();
			server.close();
		}
	});
}
