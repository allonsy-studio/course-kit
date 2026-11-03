/**
 * Question and layout helpers for printed tests.
 * Every helper takes `key` last: false builds the student copy, true the answer key.
 * Each returns an HTML string; nothing here touches the disk.
 */

/**
 * @param {unknown} s
 * @returns {string} `s` with HTML special characters escaped
 */
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** @param {string} s @returns {string} `s` as inline code */
export const code = (s) => `<code>${esc(s)}</code>`;

const stems = [];

/** Remember a question's wording, so the practice worksheet can be checked against it. */
const note = (text) => {
	const plain = String(text).replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
	if (plain) stems.push(plain);
};

/** @returns {string[]} the wording of every question built since the last reset */
export const recordedStems = () => [...stems];

/** Forget the recorded wording. Build the test and the key from a clean slate. */
export const resetStems = () => void (stems.length = 0);

export const letters = "abcdefghijkl";
export const LETTERS = "ABCDEFGHIJKL";

/**
 * Build a syntax highlighter backed by Prism.
 * @param {object} Prism the loaded prismjs module
 * @param {string} lang a Prism language id, e.g. `markup`, `css`, `python`
 * @returns {{ hl: (src: string) => string, pre: (src: string | string[], opts?: { numbered?: boolean, bad?: number[], key?: boolean }) => string }}
 */
export function highlighter(Prism, lang) {
	const grammar = Prism.languages[lang];
	if (!grammar) throw new Error(`Prism has no "${lang}" grammar. Load it with require("prismjs/components/index.js")(["${lang}"]).`);
	const hl = (src) => Prism.highlight(src, grammar, lang);
	const pre = (src, { numbered = false, bad = [], key = false } = {}) => {
		const lines = Array.isArray(src) ? src : src.split("\n");
		const body = lines
			.map((line, i) => {
				const mark = key && bad.includes(i) ? " badline" : "";
				const gutter = numbered ? `<span class="ln">${i + 1}</span>` : "";
				return `<span class="cl${mark}">${gutter}${hl(line) || " "}</span>`;
			})
			.join("");
		return `<pre class="language-${lang}">${body}</pre>`;
	};
	return { hl, pre };
}

/** A box that shows its answer in the key. `w` is a width class: "wide" or "". */
export const box = (answer, key, w = "") => `<td class="box ${w}">${key ? `<span class="ans">${answer}</span>` : ""}</td>`;

/** A note that exists only in the key (marking guidance, partial credit). */
export const mark = (text, key) => (key ? `<p class="mark"><b>Marking:</b> ${text}</p>` : "");

/** An instruction line under a section heading, e.g. the points per item. */
export const how = (text) => `<p class="how">${text}</p>`;

/** A sub-question prompt inside a section. */
export const rubric = (text) => {
	note(text);
	return `<p class="rubric">${text}</p>`;
};

/**
 * Multiple choice. `answer` is the 0-based index of the right choice.
 * @param {number|string} n
 * @param {string} stem
 * @param {string[]} choices
 * @param {number} answer
 * @param {boolean} key
 * @param {{ aside?: string }} [opts] `aside` puts a code block beside the choices
 */
export function mc(n, stem, choices, answer, key, { aside = "" } = {}) {
	note(stem);
	const opts = choices.map((c, i) => `<li class="${key && i === answer ? "hit" : ""}"><span class="l">${letters[i]})</span> ${c}</li>`).join("");
	const main = `<div><p class="stem"><b>${n}.</b> ${stem}</p><ol class="choices">${opts}</ol></div>`;
	return `<div class="item mc">
		<div class="blank">${key ? `<span class="ans">${letters[answer]}</span>` : ""}</div>
		<div class="body${aside ? " aside-grid" : ""}">${main}${aside ? `<div class="aside">${aside}</div>` : ""}</div>
	</div>`;
}

/**
 * Short answer with writing lines. The key prints `answer` in red.
 * @param {{ lines?: number, aside?: string }} [opts] `aside` is a code block above the lines
 */
export function fill(n, stem, answer, key, { lines = 1, aside = "" } = {}) {
	note(stem);
	const rule = key ? `<p class="ans line">${answer}</p>` : Array.from({ length: lines }, () => "<p class=\"rule\"></p>").join("");
	return `<div class="item fill"><p class="stem"><b>${n}.</b> ${stem}</p>${aside}${rule}</div>`;
}

/**
 * Labelled short rules, e.g. "Term: ____".
 * @param {[string, string][]} rows `[label, answer]`
 */
export function labeledLines(rows, key) {
	return `<div class="labeled-lines">${rows
		.map(([label, answer]) => `<div><span>${label}</span>${key ? `<span class="ans">${answer}</span>` : "<span class=\"short-rule\"></span>"}</div>`)
		.join("")}</div>`;
}

/**
 * Matching with a shared lettered bank.
 * @param {{ bank: string[], rows: [string, number][], key: boolean }} p `rows` are `[label, bankIndex]`
 */
export function matching({ bank, rows, key }) {
	for (const [label] of rows) note(label);
	const bankHtml = bank.map((b, i) => `<span class="bank-item"><b>${LETTERS[i]}</b> ${b}</span>`).join("");
	const rowHtml = rows.map(([label, answer], i) => `<tr>${box(key ? LETTERS[answer] : "", key)}<td><b>${i + 1}.</b> ${label}</td></tr>`).join("");
	return `<div class="matching"><div class="bank">${bankHtml}</div><table class="match-table"><tbody>${rowHtml}</tbody></table></div>`;
}

/**
 * Term to definition matching: term and box on the left, lettered definitions on the right.
 * @param {{ terms: [string, number][], defs: string[], key: boolean }} p `terms` are `[term, defIndex]`
 */
export function termMatch({ terms, defs, key }) {
	for (const def of defs) note(def);
	const rows = terms.map(
		([term, answer], i) => `<tr>${box(key ? LETTERS[answer] : "", key)}<td class="term"><b>${i + 1}.</b> ${term}</td><td class="def"><b>${LETTERS[i]}.</b> ${defs[i]}</td></tr>`,
	);
	return `<table class="term-table"><tbody>${rows.join("")}</tbody></table>`;
}

/**
 * A row of circled options per statement; the key marks the right one.
 * @param {[string, number][]} rows `[statement, optionIndex]`
 * @param {string[]} options e.g. `["Works", "Doesn't work"]`
 */
export function circleTable(rows, options, key) {
	for (const [label] of rows) note(label);
	return `<table class="works"><tbody>${rows
		.map(([label, answer]) => `<tr><td>${label}</td>${options.map((o, i) => `<td class="opt ${key && i === answer ? "hit" : ""}">${o}</td>`).join("")}</tr>`)
		.join("")}</tbody></table>`;
}

/**
 * A snippet table: for each snippet pick a letter from a legend, and in the key mark the offending line.
 * @param {{ legend: string[], rows: { pre: (key: boolean) => string, answer: number }[], key: boolean }} p
 */
export function judgeTable({ legend, rows, key }) {
	const bank = `<div class="bank stacked">${legend.map((b, i) => `<span class="bank-item"><b>${LETTERS[i]}</b> ${b}</span>`).join("")}</div>`;
	const body = rows
		.map((r, i) => `<tr>${box(key ? LETTERS[r.answer] : "", key)}<td class="n"><b>${i + 1}.</b></td><td class="snip">${r.pre(key)}</td></tr>`)
		.join("");
	return `${bank}<table class="vc-table"><tbody>${body}</tbody></table>`;
}

/**
 * Table with blank cells to complete; the key fills them in.
 * @param {{ head: string[], rows: (string | { answer: string })[][], key: boolean }} p
 */
export function blankTable({ head, rows, key }) {
	const th = head.map((h) => `<th>${h}</th>`).join("");
	const tr = rows
		.map((row) => `<tr>${row.map((cell) => (typeof cell === "string" ? `<td>${cell}</td>` : `<td class="cell">${key ? `<span class="ans">${cell.answer}</span>` : ""}</td>`)).join("")}</tr>`)
		.join("");
	return `<table class="blank-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

/**
 * One test section. Set `flow` to let it share a page with the section before.
 * @param {{ n: number, title: string, points: number, blurb?: string, body: string, flow?: boolean }} s
 */
export function section({ n, title, points, blurb, body, flow }) {
	return `<section class="sec${flow ? " flow" : ""}">
		<h2><span>Section ${n} · ${esc(title)}</span><span class="pts">${points} points</span></h2>
		${blurb ? `<p class="blurb">${blurb}</p>` : ""}
		${body}
	</section>`;
}

/**
 * A write-in box inside an SVG figure; shows its answer in the key.
 * @param {{ size?: number }} [opts] answer font size
 */
export function svgBox(x, y, w, h, answer, key, { size = 12 } = {}) {
	const text = key ? `<text x="${x + w / 2}" y="${y + h / 2 + size * 0.36}" text-anchor="middle" font-size="${size}" class="svg-ans">${esc(answer)}</text>` : "";
	return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" class="write"/>${text}`;
}

/** A numbered dot for pointing at part of a figure. */
export const callout = (x, y, n) => `<g class="callout"><circle cx="${x}" cy="${y}" r="10"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700">${n}</text></g>`;
