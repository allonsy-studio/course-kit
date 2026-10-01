/*
 * The worksheet markdown dialect: `content/practice/<name>.worksheet.md` in,
 * the object `prepareWorksheet` takes out.
 *
 * Worksheets are mostly prose — prompts, explanations, definitions, code
 * snippets — and prose does not belong in JSON. This is the same trade the
 * slide decks make: author in markdown with `:::` containers, and fail the
 * build naming the file and line when the shape is wrong, rather than
 * validate in the editor and render something quietly wrong.
 *
 * It is a block reader, not a markdown-it plugin, because what it produces is
 * data rather than HTML. Fences are consumed whole, so a `:::` or a `|` inside
 * one is content; containers nest by counting opens and closes, so a `::: bank`
 * inside a `::: match` closes the bank.
 *
 * `schemas/worksheet.schema.json` still describes the object this produces.
 */
import matter from "gray-matter";

const MARKER = /^:{3,}\s*(.*)$/;
const FENCE = /^(`{3,})\s*([\w-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const SECTION = /^(\d+)\.\s+(.+)$/;
/** `[label](target)`, the only link shape the dialect reads. */
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;
/** `1/2#s7` — week 1, day 2, slide 7. Anything else is used as an href. */
const SLIDE_REF = /^(\d+)\/(\d+)(?:#s(\d+))?$/;
const TASK = /^[-*]\s+\[([ xX])\]\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;
const FIELD = /^(why|source|hint|verdict)\s*:\s*(.*)$/;
/** A blank's answers: `` `shown` / `also accepted` ``. */
const ANSWERS = /`([^`]+)`/g;
const KINDS = ["choice", "match", "fill", "tree", "grid", "judge", "selfcheck"];

class WorksheetError extends Error {}

const fail = (file, line, message) => {
	throw new WorksheetError(`${file}:${line}: ${message}`);
};

/** Trim one level of list indentation so a nested block reads as its own. */
const dedent = (lines) => {
	const indents = lines.filter((l) => l.text.trim()).map((l) => l.text.match(/^\s*/)[0].length);
	const least = Math.min(...indents, Infinity);
	return Number.isFinite(least) ? lines.map((l) => ({ ...l, text: l.text.slice(least) })) : lines;
};

/**
 * Split lines into blocks: fences and containers whole, everything else as
 * paragraphs. Blocks carry their first line number so errors can point at it.
 * @param {{text: string, line: number}[]} lines
 * @param {string} file
 * @returns {object[]}
 */
function readBlocks(lines, file) {
	const blocks = [];
	let i = 0;
	while (i < lines.length) {
		const { text, line } = lines[i];
		if (!text.trim()) {
			i += 1;
			continue;
		}

		const fence = text.trim().match(FENCE);
		if (fence) {
			const close = lines.findIndex((l, j) => j > i && l.text.trim().startsWith(fence[1]));
			if (close === -1) fail(file, line, "a code fence is never closed");
			blocks.push({ type: "fence", lang: fence[2], code: lines.slice(i + 1, close).map((l) => l.text), line });
			i = close + 1;
			continue;
		}

		const marker = text.trim().match(MARKER);
		if (marker) {
			if (!marker[1]) fail(file, line, "a bare ::: closes a container that was never opened");
			let depth = 1;
			let j = i + 1;
			for (; j < lines.length && depth > 0; j += 1) {
				const inner = lines[j].text.trim();
				const innerFence = inner.match(FENCE);
				if (innerFence) {
					const end = lines.findIndex((l, k) => k > j && l.text.trim().startsWith(innerFence[1]));
					if (end === -1) fail(file, lines[j].line, "a code fence is never closed");
					j = end;
					continue;
				}
				const innerMarker = inner.match(MARKER);
				if (innerMarker) depth += innerMarker[1] ? 1 : -1;
			}
			if (depth > 0) fail(file, line, `::: ${marker[1]} is never closed`);
			const [name, ...rest] = marker[1].split(/\s+/);
			blocks.push({ type: "container", name, info: rest, body: dedent(lines.slice(i + 1, j - 1)), line });
			i = j;
			continue;
		}

		const heading = text.trim().match(HEADING);
		if (heading) {
			blocks.push({ type: "heading", depth: heading[1].length, text: heading[2].trim(), line });
			i += 1;
			continue;
		}

		let end = i;
		while (end < lines.length && lines[end].text.trim() && !lines[end].text.trim().match(MARKER) && !lines[end].text.trim().match(FENCE) && !lines[end].text.trim().match(HEADING)) end += 1;
		blocks.push({ type: "paragraph", lines: lines.slice(i, end), line });
		i = end;
	}
	return blocks;
}

/** `[label](1/2#s7)` or `[label](/a/path/)` -> a source object. */
function parseSource(text, file, line) {
	const link = text.trim().match(LINK);
	if (!link) fail(file, line, `a source must read [label](week/day#sN): ${text.trim()}`);
	const [, label, target] = link;
	const slide = target.match(SLIDE_REF);
	if (!slide) return { label, href: target };
	const source = { label, week: Number(slide[1]), day: Number(slide[2]) };
	if (slide[3]) source.slide = Number(slide[3]);
	return source;
}

/** Group a paragraph's lines into `key: value` fields and plain prose. */
function readParagraph(block) {
	const fields = [];
	const prose = [];
	for (const { text, line } of block.lines) {
		const trimmed = text.trim();
		const field = trimmed.match(FIELD);
		if (field) {
			fields.push({ key: field[1], value: field[2].trim(), quote: [], line });
		} else if (trimmed.startsWith(">") && fields.length) {
			fields.at(-1).quote.push(trimmed.replace(/^>\s?/, ""));
		} else if (fields.length) {
			fields.at(-1).value = `${fields.at(-1).value} ${trimmed}`.trim();
		} else {
			prose.push(trimmed);
		}
	}
	return { fields, prose: prose.join(" ") };
}

/** Bullet list items, each with any indented continuation lines. */
function listItems(lines, pattern = BULLET) {
	const items = [];
	for (const { text, line } of lines) {
		if (!text.trim()) continue;
		const match = text.trim().match(pattern);
		const indent = text.match(/^\s*/)[0].length;
		if (match && (items.length === 0 || indent <= items.at(-1).indent)) {
			items.push({ text: match[match.length - 1], extra: [], indent, line });
		} else if (items.length) {
			items.at(-1).extra.push({ text: text.trim(), line });
		}
	}
	return items;
}

/** The one container a question kind may nest, e.g. `bank` inside `match`. */
const nested = (blocks, name) => blocks.find((b) => b.type === "container" && b.name === name);

/**
 * Parse one `::: <kind> <id>` container into an authored question.
 * @param {object} block
 * @param {string} file
 * @returns {object}
 */
function parseQuestion(block, file) {
	const kind = block.name;
	const id = block.info[0];
	if (!id) fail(file, block.line, `::: ${kind} needs a question id, e.g. \`::: ${kind} 1.2\``);
	const question = { id, kind };
	const blocks = readBlocks(block.body, file);

	for (const child of blocks) {
		if (child.type !== "paragraph") continue;
		const { fields, prose } = readParagraph(child);
		if (prose && question.prompt === undefined) question.prompt = prose;
		else if (prose && !fields.length && !question.body) question.body = prose;
		for (const field of fields) {
			if (field.key === "why") question.why = field.value;
			else if (field.key === "hint") question.dragHint = field.value;
			else if (field.key === "verdict") question.verdict = field.value;
			else if (field.key === "source") {
				const source = parseSource(field.value, file, field.line);
				if (field.quote.length) source.quote = field.quote.join(" ");
				question.sources = [...(question.sources ?? []), source];
			}
		}
	}

	// An ```svg fence is the question's figure, whatever its kind; any other
	// fence is the snippet the kind below reads.
	const figure = blocks.find((b) => b.type === "fence" && b.lang === "svg");
	if (figure) question.figure = figure.code.join("\n");
	const fence = blocks.find((b) => b.type === "fence" && b.lang !== "svg");
	const lists = blocks.filter((b) => b.type === "paragraph" && b.lines.some((l) => l.text.trim().match(BULLET) || l.text.trim().match(ORDERED)));

	if (kind === "choice") {
		if (fence) question.code = fence.code.join("\n");
		const options = listItems(lists[0]?.lines ?? [], TASK);
		if (!options.length) fail(file, block.line, "a choice question needs a `- [ ]` list of options");
		question.options = options.map((o) => o.text);
		question.answer = options.findIndex((o, index) => lists[0].lines.filter((l) => l.text.trim().match(TASK))[index].text.trim().match(TASK)[1].toLowerCase() === "x");
		if (question.answer === -1) fail(file, block.line, "no option is marked `- [x]`");
	}

	if (kind === "match") {
		if (fence) question.code = fence.code.join("\n");
		const bank = nested(blocks, "bank");
		if (!bank) fail(file, block.line, "a match question needs a `::: bank` of lettered options");
		question.bank = listItems(bank.body).map((entry) => {
			const lettered = entry.text.match(/^([A-Z])[.)]\s+(.*)$/);
			if (!lettered) fail(file, entry.line, `a bank entry must read "A. text": ${entry.text}`);
			return { letter: lettered[1], text: lettered[2] };
		});
		if (bank.info.includes("drag")) question.dragDrop = true;
		const items = listItems(lists.find((l) => l.lines.some((x) => x.text.trim().match(ORDERED)))?.lines ?? [], ORDERED);
		if (!items.length) fail(file, block.line, "a match question needs a numbered list of items");
		question.items = items.map((item) => {
			const paired = item.text.match(/^(.*?)\s+—\s+([A-Z])$/);
			if (!paired) fail(file, item.line, `a match item must read "text — A": ${item.text}`);
			const parsed = { text: paired[1], answer: paired[2] };
			const source = item.extra.find((e) => e.text.startsWith("["));
			if (source) parsed.source = parseSource(source.text, file, source.line);
			return parsed;
		});
	}

	if (kind === "fill") {
		if (fence) question.code = fence.code.join("\n");
		const bank = nested(blocks, "bank");
		if (bank) {
			const words = bank.body.map((l) => l.text.trim()).filter(Boolean).join(" ");
			question.bank = words.split("·").map((w) => w.trim()).filter(Boolean);
			if (bank.info.includes("drag")) question.dragDrop = true;
		}
		question.blanks = listItems(lists.find((l) => l.lines.some((x) => x.text.trim().match(ORDERED)))?.lines ?? [], ORDERED).map((item) => parseBlank(item, file));
		if (!question.blanks.length) fail(file, block.line, "a fill question needs a numbered list of blanks");
	}

	if (kind === "tree") {
		if (fence) question.code = fence.code.join("\n");
		const tree = lists.find((l) => l.lines.some((x) => x.text.trim().match(BULLET)));
		if (!tree) fail(file, block.line, "a tree question needs a nested list of nodes");
		const { nodes, blanks } = parseTree(tree.lines, file);
		question.nodes = nodes;
		question.blanks = blanks;
	}

	if (kind === "grid") {
		if (fence) question.code = fence.code.join("\n");
		const table = blocks.find((b) => b.type === "paragraph" && b.lines[0].text.trim().startsWith("|"));
		if (!table) fail(file, block.line, "a grid question needs a table");
		const rows = table.lines.map((l) => ({ cells: l.text.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()), line: l.line }));
		question.rowHeader = rows[0].cells[0];
		question.columns = rows[0].cells.slice(1);
		question.rows = rows.slice(2).map((row) => {
			const answer = row.cells.slice(1).findIndex((c) => c.toLowerCase() === "x");
			if (answer === -1) fail(file, row.line, `no column is marked x: ${row.cells[0]}`);
			return { text: row.cells[0], answer };
		});
	}

	if (kind === "judge") {
		if (!fence) fail(file, block.line, "a judge question needs a fenced snippet");
		// Every line carries a two-column gutter so the snippet keeps its own
		// indentation: "  " normally, "! " on the line that causes the problem.
		for (const [index, text] of fence.code.entries()) {
			if (text.trim() && !/^(\s\s|! )/.test(text)) fail(file, fence.line + index + 1, `a judge snippet's lines need a two-space gutter, "! " on the offending one: ${text}`);
		}
		question.lines = fence.code.map((l) => l.slice(2));
		question.lineAnswers = fence.code.map((l, index) => (l.startsWith("!") ? index : -1)).filter((index) => index !== -1);
		if (!question.verdict) fail(file, block.line, "a judge question needs a `verdict:` letter from the section legend");
		question.verdictLetter = question.verdict;
		delete question.verdict;
	}

	if (kind === "selfcheck") {
		if (fence) question.code = fence.code.join("\n");
		const reveal = nested(blocks, "reveal");
		const check = nested(blocks, "check");
		if (!reveal) fail(file, block.line, "a selfcheck question needs a `::: reveal` list");
		question.reveal = listItems(reveal.body).map((i) => i.text);
		if (check) question.checkYourself = listItems(check.body).map((i) => i.text);
	}

	delete question.body;
	return question;
}

/** `Label _(hint)_ — `shown` / `also accepted`` -> a blank. */
function parseBlank(item, file) {
	const split = item.text.match(/^(.*?)\s+—\s+(.*)$/);
	if (!split) fail(file, item.line, `a blank must read "label — \`answer\`": ${item.text}`);
	const answers = split[2];
	let label = split[1];
	const blank = {};
	const hint = label.match(/\s*_\(([^)]+)\)_\s*$/);
	if (hint) {
		blank.hint = hint[1];
		label = label.slice(0, hint.index);
	}
	const accept = [...answers.matchAll(ANSWERS)].map((m) => m[1]);
	if (!accept.length) fail(file, item.line, `a blank's answers must be in backticks: ${item.text}`);
	return { label: label.trim(), ...blank, accept, display: accept[0] };
}

/** A nested list of element names; `?name` is a blank the student fills. */
function parseTree(lines, file) {
	const nodes = [];
	const blanks = [];
	const indents = [];
	for (const { text, line } of lines) {
		if (!text.trim()) continue;
		const bullet = text.trim().match(BULLET);
		if (!bullet) fail(file, line, `a tree node must be a list item: ${text.trim()}`);
		const indent = text.match(/^\s*/)[0].length;
		while (indents.length && indents.at(-1) >= indent) indents.pop();
		indents.push(indent);
		const depth = indents.length - 1;
		const [name, label] = bullet[1].split(/\s+—\s+/);
		if (!name.startsWith("?")) {
			nodes.push({ depth, label: name.trim() });
			continue;
		}
		const accept = [...name.matchAll(ANSWERS)].map((m) => m[1]);
		const display = accept.length ? accept[0] : name.slice(1).trim();
		nodes.push({ blank: blanks.length, depth });
		blanks.push({
			label: `Blank ${blanks.length + 1}${label ? ` — ${label.trim()}` : ""}`,
			accept: accept.length ? accept : [display],
			display,
		});
	}
	return { nodes, blanks };
}

/**
 * Parse a worksheet markdown file into the object `prepareWorksheet` takes.
 * @param {string} source the file's contents
 * @param {string} [file] path, for error messages
 * @returns {object} `{title, description, eyebrow, heading, lede, intro, terms, sections}`
 */
export function parseWorksheet(source, file = "worksheet") {
	const { data, content } = matter(source);
	const offset = source.slice(0, source.length - content.length).split("\n").length;
	const lines = content.split("\n").map((text, index) => ({ text, line: index + offset }));
	const blocks = readBlocks(lines, file);

	const worksheet = { ...data, intro: [], terms: [], sections: [] };
	let section = null;

	for (const block of blocks) {
		if (block.type === "heading") {
			const match = block.text.match(SECTION);
			if (block.depth !== 2 || !match) fail(file, block.line, `a section heading must read "## 1. Title": ${block.text}`);
			section = { n: Number(match[1]), title: match[2], questions: [] };
			worksheet.sections.push(section);
			continue;
		}

		if (block.type === "container" && block.name === "terms") {
			worksheet.terms = listItems(block.body).map((item) => {
				const parsed = item.text.match(/^\*\*(.+?)\*\*\s+—\s+(.*?)(\s*\[[^\]]+\]\([^)]+\))?$/);
				if (!parsed) fail(file, item.line, `a term must read "**term** — definition [label](week/day#sN)": ${item.text}`);
				const term = { term: parsed[1], definition: parsed[2].trim() };
				if (parsed[3]) term.source = parseSource(parsed[3].trim(), file, item.line);
				return term;
			});
			continue;
		}

		if (block.type === "container" && block.name === "legend") {
			if (!section) fail(file, block.line, "a legend belongs to a section, after its heading");
			section.legend = listItems(block.body).map((item) => {
				const lettered = item.text.match(/^([A-Z])[.)]\s+(.*)$/);
				if (!lettered) fail(file, item.line, `a legend entry must read "A. text": ${item.text}`);
				return { letter: lettered[1], text: lettered[2] };
			});
			continue;
		}

		if (block.type === "container" && KINDS.includes(block.name)) {
			if (!section) fail(file, block.line, `${block.name} ${block.info[0] ?? ""} comes before any "## 1. Title" section heading`);
			const question = parseQuestion(block, file);
			if (question.kind === "judge") {
				const letter = question.verdictLetter;
				question.answer = (section.legend ?? []).findIndex((entry) => entry.letter === letter);
				if (question.answer === -1) fail(file, block.line, `verdict: ${letter} is not a letter in this section's legend`);
				delete question.verdictLetter;
			}
			section.questions.push(question);
			continue;
		}

		if (block.type === "container") fail(file, block.line, `"${block.name}" is not a worksheet container`);

		if (block.type === "paragraph") {
			const { prose } = readParagraph(block);
			if (!prose) continue;
			if (section && section.questions.length === 0 && section.blurb === undefined) section.blurb = prose;
			else if (!section) worksheet.intro.push(prose);
		}
	}

	if (!worksheet.sections.length) fail(file, offset, "a worksheet needs at least one `## 1. Title` section");
	return worksheet;
}

export default parseWorksheet;
