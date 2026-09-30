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
import { pathToFileURL } from "node:url";

/**
 * The course and term behind the PDF footer: the options win, else the
 * course's own data files are read when the PDF is about to be written.
 * @param {{ course?: object, term?: object, dataDir: string }} options
 * @returns {Promise<{ course: object, term: object }>}
 */
const loadFooterData = async ({ course, term, dataDir }) => ({
	course: course ?? JSON.parse(await readFile(join(dataDir, "course.json"), "utf8")),
	term: term ?? (await import(pathToFileURL(resolve(dataDir, "term.js")).href)).default,
});

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
 * The output directory Eleventy reports on `eleventy.after` is its own default
 * ("_site"), not what `setOutputDirectory()` was given, so it is passed in.
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
		const { default: puppeteer } = await import("puppeteer");

		const server = servePublic(root, pathPrefix);
		await new Promise((done) => server.listen(0, "127.0.0.1", done));
		const { port } = server.address();

		const generated = new Date().toISOString().slice(0, 10);
		const version = (process.env.GITHUB_SHA ?? process.env.COMMIT_REF ?? "local").slice(0, 7);
		const outputDir = join(root, "resources");
		const outputPath = join(outputDir, "syllabus.pdf");
		const footerData = await loadFooterData({ course, term, dataDir });

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
