/**
 * Checks a built syllabus PDF: it has no more than a bound of pages, no text lies over the page footer or outside the margins, and every page
 * footer sits wholly in the bottom margin. Needs `pdftotext` (poppler). Usage: `node scripts/check-pdf.js public/resources/syllabus.pdf [--max-pages 3]`.
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { PDF_MARGIN } from "../lib/pdf.js";

const points = (inches) => Number.parseFloat(inches) * 72;
const decode = (text) => text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/**
 * @param {string} file the PDF
 * @param {{ maxPages?: number }} [options]
 * @returns {{ pages: number, problems: string[] }}
 */
export function checkPdf(file, { maxPages = 3 } = {}) {
	const html = execFileSync("pdftotext", ["-bbox", file, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	const problems = [];
	const pages = [...html.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)];
	if (pages.length > maxPages) problems.push(`${pages.length} pages, more than the ${maxPages} allowed`);
	pages.forEach((page, index) => {
		const [, width, height, body] = page;
		const bottom = Number(height) - points(PDF_MARGIN.bottom);
		const words = [...body.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g)].map((word) => ({ x0: +word[1], y0: +word[2], x1: +word[3], y1: +word[4], text: decode(word[5]) }));
		for (const word of words) {
			const where = `page ${index + 1}, "${word.text}"`;
			if (word.y1 > bottom + 0.5 && word.y0 < bottom - 0.5) problems.push(`${where} straddles the bottom margin, where the footer prints`);
			else if (word.y0 < points(PDF_MARGIN.top) - 4) problems.push(`${where} is in the top margin`);
			if (word.x0 < points(PDF_MARGIN.left) - 1 || word.x1 > Number(width) - points(PDF_MARGIN.right) + 1) problems.push(`${where} is outside the side margins`);
		}
		const inMargin = words.filter((word) => word.y0 >= bottom - 0.5);
		// The footer is one line; anything else in the margin is body text that ran into it.
		if (inMargin.length && new Set(inMargin.map((word) => Math.round(word.y0))).size > 1) problems.push(`page ${index + 1} has more than one line of text in the bottom margin`);
	});
	return { pages: pages.length, problems };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const [file, ...rest] = process.argv.slice(2);
	if (!file) throw new Error("Usage: node scripts/check-pdf.js <file.pdf> [--max-pages 3]");
	const limit = rest.indexOf("--max-pages");
	const { pages, problems } = checkPdf(file, limit >= 0 ? { maxPages: Number(rest[limit + 1]) } : {});
	if (problems.length) {
		process.stderr.write(`${file}: ${problems.join("\n")}\n`);
		process.exit(1);
	}
	process.stdout.write(`${file}: ${pages} pages, no text over the footer or outside the margins\n`);
}
