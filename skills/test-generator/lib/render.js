/**
 * HTML to PDF with a headless browser.
 */
import { createRequire } from "node:module";
import { join } from "node:path";

/**
 * Resolve a package from the course folder first, then from this kit.
 * @param {string} name
 * @param {string} [from] a directory to try first
 * @returns {unknown} the module, or null
 */
export function load(name, from = process.cwd()) {
	for (const base of [from, import.meta.dirname]) {
		try {
			return createRequire(join(base, "noop.js"))(name);
		} catch {
			/* try the next base */
		}
	}
	return null;
}

/**
 * Write `html` to a Letter-size PDF with a page-numbered footer.
 * @param {string} html
 * @param {string} pdfPath
 * @param {string} footer text for the page footer
 * @returns {Promise<void>}
 */
export async function renderPdf(html, pdfPath, footer) {
	const playwright = load("playwright");
	const puppeteer = playwright ? null : load("puppeteer");
	if (!playwright && !puppeteer) throw new Error("Install playwright or puppeteer (npm install playwright) to write PDFs, or set HTML_ONLY=1.");
	const launch = (opts) => (playwright ? playwright.chromium.launch(opts) : puppeteer.launch(opts));
	const browser = await launch().catch(() => launch({ executablePath: process.env.CHROME }));
	try {
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: "load" });
		await page.pdf({
			path: pdfPath,
			format: "Letter",
			printBackground: true,
			displayHeaderFooter: true,
			headerTemplate: "<span></span>",
			footerTemplate: `<div style="width:100%;text-align:center;font-family:Carlito,Calibri,sans-serif;font-size:8pt;color:#666;">${footer} · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
			margin: { top: "0.7in", right: "0.75in", bottom: "0.8in", left: "0.75in" },
		});
	} finally {
		await browser.close();
	}
}
