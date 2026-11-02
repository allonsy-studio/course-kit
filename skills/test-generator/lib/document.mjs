/**
 * Assemble a whole test, or its key, from sections.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { esc } from "./items.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/** @returns {string} the shared stylesheet */
export const baseCss = () => readFileSync(join(here, "styles.css"), "utf8");

/**
 * @typedef {object} Meta
 * @property {string} course e.g. "CS 101 · Intro to Programming"
 * @property {string} school e.g. "Example College · Fall 2026"
 * @property {string} title e.g. "Test 2: Loops"
 * @property {string} subtitle date, length and points, e.g. "Friday, Oct 2 · 50 minutes · 100 points"
 * @property {string} footer printed in every page footer, e.g. "CS 101 · Test 2"
 * @property {string} file output file stem, e.g. "cs101-test2"
 * @property {string[]} [instructions] paragraphs for the cover's "Before you start"
 * @property {number} [total] points the sections must add up to (default 100)
 */

/**
 * Check that the sections add up. A test that does not total its points is a printing error.
 * @param {{ n: number, title: string, points: number }[]} sections
 * @param {number} [expected]
 * @returns {number} the total
 */
export function checkPoints(sections, expected = 100) {
	const total = sections.reduce((sum, s) => sum + s.points, 0);
	if (total !== expected) throw new Error(`Points total ${total}, expected ${expected}: ${sections.map((s) => `${s.n}=${s.points}`).join(", ")}`);
	return total;
}

const defaultInstructions = [
	"<b>Closed book. No notes, no computer, no phone.</b> Write all answers on this paper.",
	"There are no trick questions. Read each one once and answer it.",
	"<b>Showing your work can earn partial credit.</b> If you are not sure of a final answer, write your reasoning next to it.",
];

/**
 * The cover page: masthead, name line, points table, instructions.
 * @param {Meta} meta
 * @param {{ n: number, title: string, points: number }[]} sections
 * @param {boolean} key
 */
export function cover(meta, sections, key) {
	const total = checkPoints(sections, meta.total);
	const rows = sections.map((s) => `<tr><td>${s.n} · ${esc(s.title)}</td><td>${s.points}</td><td></td></tr>`).join("");
	const paras = (meta.instructions ?? defaultInstructions).map((p) => `<p>${p}</p>`).join("");
	return `<section class="cover">
		<div class="masthead"><span>${esc(meta.course)}</span><span>${esc(meta.school)}</span></div>
		<h1>${esc(meta.title)}${key ? ' <span class="keytag">Answer key</span>' : ""}</h1>
		<p class="sub">${esc(meta.subtitle)}</p>
		<p class="name">Name: <span class="name-line"></span></p>
		<table class="points">
			<thead><tr><th>Section</th><th>Points</th><th>Score</th></tr></thead>
			<tbody>${rows}</tbody>
			<tfoot><tr><td>Total</td><td>${total}</td><td></td></tr></tfoot>
		</table>
		<h2 class="plain">Before you start</h2>
		${paras}
	</section>`;
}

/**
 * Wrap sections in a complete HTML document.
 * @param {Meta} meta
 * @param {{ n: number, title: string, points: number, html: string }[]} sections `html` comes from `section()`
 * @param {{ key: boolean, extraCss?: string }} opts
 * @returns {string}
 */
export function buildDocument(meta, sections, { key, extraCss = "" }) {
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(meta.title)}${key ? " · Key" : ""}</title>
<style>${baseCss()}${extraCss}</style></head>
<body class="${key ? "key" : ""}">
${cover(meta, sections, key)}
${sections.map((s) => s.html).join("\n")}
</body></html>`;
}
