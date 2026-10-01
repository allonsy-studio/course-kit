/* Turns a parsed worksheet into the data its page renders. The parser is in worksheet-dialect.js. */
export { parseWorksheet } from "./worksheet-dialect.js";

/* ---- Practice worksheets ---------------------------------------------- */

/** Option letters, in order. Eight is the most any bank has needed. */
const LETTERS = "abcdefgh";

/**
 * Absolute form of a site path, so a link survives the page being uploaded
 * somewhere else. Anything already absolute is left alone.
 * @param {string} path
 * @returns {string}
 */
const onSite = (path, hostname) => (path.startsWith("/") ? `${hostname}${path}` : path);

/**
 * Resolve a citation to a URL. A source may name a slide by week/day/number,
 * which keeps deck URLs out of the authored data, or carry its own `href` for
 * anything else (a reading, a guide, an external page). Site paths come back
 * absolute: a worksheet is a single file students download, and a
 * root-relative citation resolves against whatever host opened it.
 * @param {{href?: string, week?: number, day?: number, slide?: number}} source
 * @returns {string|undefined}
 */
const sourceHref = (source, hostname) => {
	if (!source) return undefined;
	if (source.href) return onSite(source.href, hostname);
	if (typeof source.week !== "number" || typeof source.day !== "number") return undefined;
	const anchor = typeof source.slide === "number" ? `#s${source.slide}` : "";
	return onSite(`/slides/week-${source.week}-day-${source.day}/${anchor}`, hostname);
};

const withHref = (source, hostname) => (source ? { ...source, href: sourceHref(source, hostname) } : source);

/**
 * The subset of a question's key the client script grades against. Derived
 * from the authored answer so there is never a second copy to keep in step.
 * @param {object} question
 * @returns {object}
 */
const answersFor = (question) => {
	switch (question.kind) {
		case "choice":
			return { answer: question.answer };
		case "match":
			return { items: question.items.map((item) => item.answer) };
		case "fill":
		case "tree":
			return { blanks: question.blanks.map((blank) => blank.accept) };
		case "grid":
			return { rows: question.rows.map((row) => row.answer) };
		case "judge":
			return { answer: question.answer, lines: question.lineAnswers ?? [] };
		default:
			return {};
	}
};

/**
 * Flatten one authored question into render-ready rows.
 *
 * WebC evaluates a `webc:for` element's own attributes in a scope holding only
 * that loop's variables, so a nested loop cannot reach the enclosing one. Every
 * field a looped element needs — the input `name` above all — is therefore
 * folded into the row it loops over, here. Indexes become strings because WebC
 * drops a dynamic attribute whose value is `0`.
 * @param {object} question
 * @param {object} section the question's section, for the judge verdict legend
 * @returns {object}
 */
const prepareQuestion = (question, section, hostname) => {
	const id = question.id;
	const draggable = question.dragDrop ? "true" : undefined;
	const prepared = {
		...question,
		answers: answersFor(question),
		sources: (question.sources ?? []).map((source) => withHref(source, hostname)),
	};

	if (question.kind === "choice") {
		prepared.choices = question.options.map((text, index) => ({
			text,
			letter: LETTERS[index],
			name: `${id}-choice`,
			value: String(index),
		}));
	}

	if (question.kind === "match") {
		prepared.bank = question.bank.map((entry) => ({ ...entry, draggable }));
		prepared.items = question.items.map((item, index) => ({
			...item,
			source: withHref(item.source, hostname),
			bank: prepared.bank,
			drop: draggable,
			name: `${id}-match-${index}`,
			index: String(index),
		}));
	}

	if (question.kind === "fill") {
		if (Array.isArray(question.bank)) {
			prepared.bank = question.bank.map((word) => ({ text: word, draggable }));
		}
		prepared.blanks = question.blanks.map((blank, index) => ({
			...blank,
			drop: draggable,
			name: `${id}-blank-${index}`,
			hint: blank.hint ?? "",
			index: String(index),
		}));
	}

	if (question.kind === "tree") {
		prepared.nodes = question.nodes.map((node) => {
			if (node.label !== undefined) return { ...node, depth: String(node.depth) };
			const blank = question.blanks[node.blank];
			return {
				...node,
				depth: String(node.depth),
				blank: String(node.blank),
				name: `${id}-blank-${node.blank}`,
				blankLabel: blank.label,
				display: blank.display,
			};
		});
	}

	if (question.kind === "grid") {
		prepared.rows = question.rows.map((row, rowIndex) => ({
			...row,
			display: question.columns[row.answer],
			index: String(rowIndex),
			cells: question.columns.map((column, columnIndex) => ({
				column,
				name: `${id}-row-${rowIndex}`,
				value: String(columnIndex),
			})),
		}));
	}

	if (question.kind === "judge") {
		prepared.codeLines = question.lines.map((line, index) => ({
			line,
			name: `${id}-line`,
			value: String(index),
		}));
		prepared.lineName = `${id}-line`;
		prepared.verdicts = (section.legend ?? []).map((entry, index) => ({
			...entry,
			name: `${id}-choice`,
			value: String(index),
		}));
	}

	return prepared;
};

/**
 * Every user-facing string the worksheet components render that is not
 * authored content. A worksheet overrides any of them under a `copy:` key in
 * its front matter; nothing here names a course, a test or a slide.
 */
const COPY = {
	notice: "Nothing here is recorded or submitted.",
	noticeBody: "Your answers stay in this browser tab and go nowhere. Checking an answer shows you the reasoning and the source it came from.",
	termsHeading: "Terms to know",
	termsHint: "Select a term for its definition, and a link to the source it comes from.",
	termSource: "",
	citeHeading: "Where this comes from",
	citeLabel: "Where this comes from, question",
	chooseOne: "Choose one answer",
	checkAll: "Check every section",
	resetAll: "Clear my answers",
	checkSection: "Check section",
	resetSection: "Clear section",
	section: "Section",
	wordBank: "Word bank",
	answer: "Answer:",
	showAnswer: "Show the answer",
	checkYourself: "Check yourself",
	verdict: "Verdict",
	judgeLine: "Select the line that causes the problem",
	judgeNoLine: "No line — it is fine as written",
	selfMarked: "self-marked",
};

/**
 * Turn an authored worksheet (see `schemas/worksheet.schema.json`) into the
 * data cascade `<practice-worksheet>` renders. One call is the whole of a
 * worksheet's `.11tydata.js`.
 * @param {object} authored the parsed worksheet JSON
 * @param {{ hostname?: string }} [options] the site's origin, which makes site paths absolute
 * @returns {object} `{ layout, title, description, indexed, worksheet }`
 */
export const prepareWorksheet = (authored, { hostname = "" } = {}) => {
	const { $schema, title, description, indexed, ...worksheet } = authored;
	return {
		layout: "worksheet",
		title,
		description,
		indexed: indexed ?? true,
		worksheet: {
			...worksheet,
			copy: { ...COPY, ...(worksheet.copy ?? {}) },
			footer: worksheet.footer ?? [],
			links: (worksheet.links ?? []).map((link) => withHref(link, hostname)),
			terms: (worksheet.terms ?? []).map((entry, index) => ({
				...entry,
				id: `term-${index + 1}`,
				source: withHref(entry.source, hostname),
			})),
			sections: (worksheet.sections ?? []).map((section) => ({
				...section,
				questions: section.questions.map((question) => prepareQuestion(question, section, hostname)),
			})),
		},
	};
};

