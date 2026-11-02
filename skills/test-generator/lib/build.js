/**
 * Build a test, its answer key and the question list the practice worksheet is checked against.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildDocument, checkPoints } from "./document.js";
import { assertPrivate, MARKER, resolveOutDir } from "./guard.js";
import { recordedStems, resetStems, section } from "./items.js";
import { renderPdf } from "./render.js";

/**
 * @typedef {object} Built
 * @property {string[]} files the paths written
 * @property {string[]} stems the wording of every question, for `guard.js overlap`
 */

/**
 * Write `<file>.pdf` and `<file>-key.pdf`, always outside the repository.
 *
 * Environment: `KEY=1` builds only the key, `HTML=1` also writes the HTML, `HTML_ONLY=1` skips the PDFs.
 *
 * @param {object} options
 * @param {import("./document.js").Meta & { slug: string }} options.meta `slug` names the course folder, e.g. "cs101"
 * @param {((key: boolean) => { n: number, title: string, points: number, blurb?: string, body: string, flow?: boolean })[]} options.sections one function per section, returning its number, title, points, blurb and body
 * @param {string} [options.css] extra CSS for this test
 * @param {string} [options.outDir] a folder; default is the course's folder under `$COURSE_TESTS_DIR`
 * @param {NodeJS.ProcessEnv} [options.env]
 * @returns {Promise<Built>}
 */
export async function buildTest({ meta, sections, css = "", outDir, env = process.env }) {
	const dir = resolveOutDir(meta.slug, outDir);
	assertPrivate(dir);
	mkdirSync(dir, { recursive: true });

	const make = (key) => {
		resetStems();
		const built = sections.map((fn) => fn(key));
		checkPoints(built, meta.total);
		return buildDocument(meta, built.map((entry) => ({ n: entry.n, title: entry.title, points: entry.points, html: section(entry) })), { key, extraCss: css });
	};

	const variants = [...(env.KEY ? [] : [["", false]]), ["-key", true]];
	const files = [];
	let stems = [];
	for (const [suffix, key] of variants) {
		const html = make(key).replace("<!doctype html>", `<!doctype html>\n<!-- ${MARKER} -->`);
		if (!stems.length) stems = recordedStems();
		const stem = path.join(dir, `${meta.file}${suffix}`);
		if (env.HTML || env.HTML_ONLY) {
			writeFileSync(`${stem}.html`, html);
			files.push(`${stem}.html`);
		}
		if (!env.HTML_ONLY) {
			await renderPdf(html, `${stem}.pdf`, `${meta.footer}${key ? " · Answer key" : ""}`);
			files.push(`${stem}.pdf`);
		}
	}
	writeFileSync(path.join(dir, `${meta.file}-stems.json`), `${JSON.stringify(stems, null, 2)}\n`);
	files.push(path.join(dir, `${meta.file}-stems.json`));
	return { files, stems };
}
