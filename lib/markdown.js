import { createRequire } from "node:module";

import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";

const slugify = (str) =>
	encodeURIComponent(
		String(str)
			.toLowerCase()
			?.replace(/[.)([\]?!\s]/g, "-")
			?.replace(/[^a-z0-9]+/g, "-")
			?.replace(/-+/g, "-")
			?.replace(/^-+|-+$/g, "")
			?.replace(/-+/g, "-"),
	);

const { escapeHtml } = markdownIt().utils;

/** Prism highlighter. `createRequire`, never ESM import: Prism's component loader is CommonJS. */
const prismHighlight = createRequire(import.meta.url)("@11ty/eleventy-plugin-syntaxhighlight/src/markdownSyntaxHighlightOptions.js")({
	alwaysWrapLineHighlights: true,
	preAttributes: { tabindex: 0 },
});

/**
 * Escapes ```text fences, which the plugin passes through as raw HTML.
 * @param {string} str
 * @param {string} language
 * @returns {string}
 */
const highlight = (str, language) => prismHighlight(language.split("/")[0] === "text" ? escapeHtml(str) : str, language);

const SLIDE_KINDS = new Set(["title", "section", "checkpoint", "vocab", "api"]);
const SLIDE_MARKER = ">";
const CONTAINER_MARKER = ":";
const MIN_MARKERS = 3;
const CONTAINER_CLASS = /^[a-z][a-z0-9-]*$/;

/**
 * Where a markdown-it StateCore is in a file, for an error message. Eleventy
 * stamps `env.file`/`env.page.inputPath` on the render env; fall back to
 * "deck" so this still works when called outside that (e.g. tests).
 */
const fileOf = (env) => env?.file ?? env?.page?.inputPath ?? "deck";

class DeckError extends Error {}

const fail = (env, line, message) => {
	throw new DeckError(`${fileOf(env)}:${line + 1}: ${message}`);
};

/**
 * A single-line-per-marker block rule: a line of `markerChar` repeated
 * `>= 3` times plus info text opens a container of `tokenType`; the bare
 * marker closes the most recently opened one. Deliberately not
 * markdown-it-container's forward-scan approach: that closes the outer
 * container when same-marker containers nest.
 * @param {string} markerChar
 * @param {string} tokenType
 * @param {(info: string, env: object, line: number) => string} [validateOpen] validates the open line's info text, returning the value to store on the token (throws on an invalid open)
 */
const markerContainerRule =
	(markerChar, tokenType, validateOpen) =>
		(state, startLine, _endLine, silent) => {
			if (state.sCount[startLine] - state.blkIndent >= 4) return false;
			const start = state.bMarks[startLine] + state.tShift[startLine];
			const max = state.eMarks[startLine];
			const src = state.src.slice(start, max);

			let pos = 0;
			while (pos < src.length && src[pos] === markerChar) pos += 1;
			if (pos < MIN_MARKERS) return false;
			const info = src.slice(pos).trim();
			if (silent) return true;

			const normalized = info && validateOpen ? validateOpen(info, state.env, startLine) : info;
			const token = state.push(info ? `${tokenType}_open` : `${tokenType}_close`, "div", info ? 1 : -1);
			token.markup = markerChar.repeat(MIN_MARKERS);
			token.info = normalized;
			token.map = [startLine, startLine + 1];
			token.attrSet("data-line", String(startLine + 1));
			state.line = startLine + 1;
			return true;
		};

/**
 * After parsing, confirm every `openType`/`closeType` pair is balanced —
 * fails the build naming the file and line rather than silently autoclosing
 * (markdown-it-container's behavior) and losing a slide.
 */
const checkBalanced = (openType, closeType, label) => (state) => {
	let depth = 0;
	let openedAt = null;
	for (const token of state.tokens) {
		if (token.type === openType) {
			if (depth === 0) openedAt = token;
			depth += 1;
		} else if (token.type === closeType) {
			depth -= 1;
			if (depth < 0) fail(state.env, Number(token.attrGet("data-line") ?? 1) - 1, `a bare marker closes ${label} that was never opened`);
		}
	}
	if (depth > 0) fail(state.env, Number(openedAt.attrGet("data-line") ?? 1) - 1, `${label} is never closed`);
};

/** Class list for a generic `::: name` container. `cols-2`/`cols-3` imply `cols`. */
const containerClasses = (info, env, line) => {
	const names = info.split(/\s+/).filter(Boolean);
	for (const name of names) {
		if (!CONTAINER_CLASS.test(name)) fail(env, line, `"${name}" is not a valid container name in \`::: ${info}\``);
	}
	if (names.some((name) => /^cols-\d$/.test(name)) && !names.includes("cols")) names.unshift("cols");
	return names.join(" ");
};

/** `notes Label (0:00–0:05)` split into its label and timing, if present. */
const noteInfo = (info) => {
	const [, label = "", timing = ""] = /^(.*?)(?:\(([^)]*)\))?$/.exec(info.trim().replace(/^notes\b/, "").trim());
	return { label: label.trim(), timing: timing.trim() };
};

const baseOptions = { html: true, xhtmlOut: true, typographer: true, breaks: false, linkify: true, slugify, highlight };

/**
 * markdown-it-anchor's permalink option, skipped inside a slide. Scans
 * backward for an unclosed `container_slide_open` rather than an env flag:
 * this plugin's own core rule runs after the per-render env is reset.
 */
const insideSlide = (state, idx) => {
	let depth = 0;
	for (let i = idx - 1; i >= 0; i -= 1) {
		if (state.tokens[i].type === "container_slide_close") depth += 1;
		else if (state.tokens[i].type === "container_slide_open") {
			if (depth === 0) return true;
			depth -= 1;
		}
	}
	return false;
};

const anchorPermalink = markdownItAnchor.permalink.linkInsideHeader({
	placement: "before",
	space: " ",
	symbol: "#",
	ariaLabel: "Permalink to this heading",
});

const anchorOptions = {
	level: [2],
	permalink: (slug, opts, state, idx) => {
		if (insideSlide(state, idx)) return;
		anchorPermalink(slug, opts, state, idx);
	},
};

/*
 * Speaker notes and slide typography — the deck-specific pass, run once
 * after parsing (a core rule). Removes every `::: notes` block from the
 * deck in both flavors; when `env.notesSheet` is set, collects them per
 * slide for the instructor notes sheet instead (see `deckNotes`). Drops
 * `::: tags` (glossary overrides) the same way. Collapses
 * `::: eyebrow` into dot-separated `<span>`s; every other `::: name`
 * becomes `<div class="name">`. See docs/writing-content.md.
 */
const deckContainerRule = (state) => {
	const tokens = state.tokens;
	const notesOut = [];

	for (let i = tokens.length - 1; i >= 0; i -= 1) {
		const open = tokens[i];
		if (open.type !== "container_container_open") continue;

		let depth = 1;
		let end = i + 1;
		while (end < tokens.length && depth > 0) {
			if (tokens[end].type === "container_container_open") depth += 1;
			else if (tokens[end].type === "container_container_close") depth -= 1;
			end += 1;
		}
		const line = Number(open.attrGet("data-line") ?? 1) - 1;
		const isNotes = /^notes\b/.test(open.info);
		const isEyebrow = /^eyebrow\s*$/.test(open.info);
		const isTags = /^tags\s*$/.test(open.info);

		// Glossary tag overrides: read from the source by the glossary data, never rendered.
		if (isTags) {
			tokens.splice(i, end - i);
			continue;
		}

		if (isNotes) {
			const children = tokens.slice(i + 1, end - 1);
			tokens.splice(i, end - i);
			if (!state.env.notesSheet) continue;
			// The owning slide is the next `container_slide_close`, matched by
			// object reference: later splices only touch positions after `i`.
			const closeToken = tokens.slice(i).find((token) => token.type === "container_slide_close");
			notesOut.push({ closeToken, ...noteInfo(open.info), html: state.md.renderer.render(children, state.md.options, {}) });
			continue;
		}

		if (isEyebrow) {
			const items = tokens
				.slice(i + 1, end - 1)
				.filter((t) => t.type === "inline")
				.map((t) => `<span>${state.md.renderer.renderInline(t.children, state.md.options, state.env)}</span>`)
				.join("");
			const html = new state.Token("html_block", "", 0);
			html.content = `<div class="eyebrow separators">${items}</div>\n`;
			html.block = true;
			tokens.splice(i, end - i, html);
			continue;
		}

		const openHtml = new state.Token("html_block", "", 0);
		openHtml.block = true;
		openHtml.content = `<div class="${containerClasses(open.info, state.env, line)}">\n`;
		const closeHtml = new state.Token("html_block", "", 0);
		closeHtml.block = true;
		closeHtml.content = "</div>\n";
		tokens[i] = openHtml;
		tokens[end - 1] = closeHtml;
	}

	if (state.env.notesSheet) state.env.notesSheet.slides = sheetSlides(state, notesOut.reverse());
};

/**
 * One entry per slide for the notes sheet: its number (matching the deck's
 * `#sN`), kind, first heading, and notes in source order.
 * @returns {{ number: number, kind: string, title: string, notes: { label: string, timing: string, html: string }[] }[]}
 */
const sheetSlides = (state, notes) => {
	const slides = [];
	let current = null;
	state.tokens.forEach((token, index) => {
		if (token.type === "container_slide_open") {
			current = { number: slides.length + 1, kind: token.info, title: "", notes: [] };
			slides.push(current);
		} else if (token.type === "container_slide_close" && current) {
			current.notes = notes.filter((note) => note.closeToken === token).map(({ label, timing, html }) => ({ label, timing, html }));
			current = null;
		} else if (current && !current.title && token.type === "heading_open") {
			current.title = state.md.renderer.renderInline(state.tokens[index + 1].children, state.md.options, {});
		}
	});
	return slides;
};

/**
 * Parse a deck's markdown (front matter already stripped) for its speaker
 * notes, without rendering the deck. Feeds the notes sheet.
 * @param {string} source
 * @param {string} [file] for build errors
 */
export const deckNotes = (source, file) => {
	const env = { file, notesSheet: {} };
	markdown.parse(source ?? "", env);
	return env.notesSheet.slides ?? [];
};

/*
 * Slide typography (blockquote -> `.lede`, top-level prose -> `.tight`,
 * `-`/`1.` lists -> `.bullets`/`.steps`, right-aligned table cells -> `.num`)
 * is gated on `env.slideDepth` because these classes are wrong or inert
 * outside a slide.
 */
const inSlideProse = (env) => env.slideDepth > 0;

const installSlideTypography = (md) => {
	md.renderer.rules.container_slide_open = (tokens, idx, _options, env) => {
		env.slideDepth = (env.slideDepth ?? 0) + 1;
		env.slideBaseLevel = tokens[idx].level;
		const kind = tokens[idx].info.trim();
		const number = (env.slideNumber = (env.slideNumber ?? 0) + 1);
		return `<section class="slide" id="s${number}"${kind ? ` data-kind="${kind}"` : ""} aria-label="Slide ${number}"><div class="slide-body">\n`;
	};
	md.renderer.rules.container_slide_close = (_tokens, _idx, _options, env) => {
		env.slideDepth = Math.max(0, (env.slideDepth ?? 1) - 1);
		return "</div></section>\n";
	};

	md.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
		if (!inSlideProse(env)) return self.renderToken(tokens, idx, options);
		env.quoteDepth = (env.quoteDepth ?? 0) + 1;
		return "";
	};
	md.renderer.rules.blockquote_close = (tokens, idx, options, env, self) => {
		if (!inSlideProse(env)) return self.renderToken(tokens, idx, options);
		env.quoteDepth = Math.max(0, (env.quoteDepth ?? 1) - 1);
		return "";
	};
	md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
		if (inSlideProse(env)) {
			if (env.quoteDepth > 0) tokens[idx].attrJoin("class", "lede");
			else if (tokens[idx].level === (env.slideBaseLevel ?? 0) + 1) tokens[idx].attrJoin("class", "tight");
		}
		return self.renderToken(tokens, idx, options);
	};
	md.renderer.rules.bullet_list_open = (tokens, idx, options, env, self) => {
		if (inSlideProse(env)) tokens[idx].attrJoin("class", "bullets");
		return self.renderToken(tokens, idx, options);
	};
	md.renderer.rules.ordered_list_open = (tokens, idx, options, env, self) => {
		if (inSlideProse(env)) tokens[idx].attrJoin("class", "steps");
		return self.renderToken(tokens, idx, options);
	};
	const numericCell = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		/* An empty header cell is announced as an empty header; write it as a plain cell. */
		if (token.type === "th_open" && !tokens[idx + 1]?.content?.trim()) {
			token.tag = "td";
			if (tokens[idx + 2]?.type === "th_close") tokens[idx + 2].tag = "td";
		}
		if (inSlideProse(env) && /text-align:\s*right/.test(token.attrGet("style") ?? "")) {
			token.attrs = token.attrs.filter(([name]) => name !== "style");
			token.attrJoin("class", "num");
		}
		return self.renderToken(tokens, idx, options);
	};
	md.renderer.rules.th_open = numericCell;
	md.renderer.rules.td_open = numericCell;
};

/**
 * Slide line budget — the cheap, Chromium-free overflow warning, estimating
 * each slide's rendered line count and warning (never failing) past this
 * value. A heuristic that under-counts dense code; `CHECK_FIT` (lib/fit.js)
 * is the real measurement.
 */
export const SLIDE_LINE_BUDGET = 17.5;

// Characters of slide-size prose per line across the full slide width.
const CHARS_PER_LINE = 88;
// Rendered line height as a share of one prose line, per block kind.
const COST = { h1: 3, h2: 2.2, h3: 1.2, lede: 1.5, code: 0.9, row: 1.15, gap: 0.35, item: 0.2, step: 0.45, card: 1.6, callout: 1.2 };
// Prose inside a card is set smaller than slide prose: more characters per
// line, less height per line.
const CARD_SCALE = 0.8;

const plainText = (inline) => inline.replace(/[`*_]/g, "");
const wrapped = (text, width) => Math.max(1, Math.ceil(plainText(text).length / width));

/** Lines an `html_block` renders to: an SVG scales to the column width. */
const htmlLines = (content, width) => {
	const viewBox = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(content);
	if (viewBox) {
		const pixels = (width / CHARS_PER_LINE) * 1160 * (Number(viewBox[2]) / Number(viewBox[1]));
		return pixels / 36;
	}
	return content.split("\n").filter(Boolean).length / 2;
};

/** Index just past the block that opens at `tokens[i]` (a container or a nested block pair). */
const blockEnd = (tokens, i, to) => {
	if (tokens[i].nesting !== 1) return i + 1;
	const open = tokens[i].type;
	const close = open.replace(/_open$/, "_close");
	let depth = 0;
	let end = i;
	do {
		if (tokens[end].type === open) depth += 1;
		else if (tokens[end].type === close) depth -= 1;
		end += 1;
	} while (end < to && depth > 0);
	return end;
};

/** Lines for one `::: name` container, `tokens[i]` being its open token. */
const measureContainer = (tokens, i, end, width) => {
	const names = tokens[i].info.split(/\s+/);
	const cols = /^cols-(\d)$/.exec(names[0])?.[1];
	if (names[0] === "notes") return 0;
	if (names[0] === "eyebrow") return 1 + COST.gap;
	if (cols) return measureColumns(tokens, i + 1, end - 1, width / Number(cols) - 3, Number(cols)) + COST.gap;
	const card = names.includes("card");
	const scale = (names.includes("big") ? 1.4 : 1) * (card ? CARD_SCALE : 1);
	const inner = measureSpan(tokens, i + 1, end - 1, card ? (width - 6) / CARD_SCALE : width) * scale;
	return inner + (card ? COST.card : names.includes("callout") ? COST.callout : 0) + COST.gap;
};

/** Lines for the table row opening at `tokens[i]`: its longest cell, wrapped at half the width. */
const measureRow = (tokens, i, end, width) => {
	let tallest = 1;
	for (let j = i; j < end; j += 1) {
		if (tokens[j].type === "inline") tallest = Math.max(tallest, wrapped(tokens[j].content, width * 0.5));
	}
	return tallest * COST.row;
};

/**
 * Lines for `tokens[from, to)`, one nesting level: containers recurse with
 * the column width they impose.
 */
const measureSpan = (tokens, from, to, width) => {
	let lines = 0;
	let i = from;
	while (i < to) {
		const token = tokens[i];
		if (token.type === "container_container_open") {
			const end = blockEnd(tokens, i, to);
			lines += measureContainer(tokens, i, end, width);
			i = end;
		} else if (token.type === "heading_open") {
			lines += (COST[token.tag] ?? 1) * wrapped(tokens[i + 1].content, width * (token.tag === "h3" ? 1 : 0.6)) + COST.gap;
			i += 3;
		} else if (token.type === "paragraph_open") {
			const lede = tokens[i - 1]?.type === "blockquote_open";
			const item = token.hidden ? (tokens[i - 1]?.info ? COST.step : COST.item) : COST.gap;
			lines += (lede ? COST.lede : 1) * wrapped(tokens[i + 1].content, lede ? width * 0.65 : token.hidden ? width - 4 : width) + item;
			i += 3;
		} else if (token.type === "fence") {
			lines += token.content.trimEnd().split("\n").length * COST.code + 1 + COST.gap;
			i += 1;
		} else if (token.type === "html_block") {
			lines += htmlLines(token.content, width) + COST.gap;
			i += 1;
		} else if (token.type === "tr_open") {
			const end = blockEnd(tokens, i, to);
			lines += measureRow(tokens, i, end, width);
			i = end;
		} else {
			i += 1;
		}
	}
	return lines;
};

/**
 * `cols-N`: every direct child (a `::: card`, or a loose block) is one grid
 * cell, N cells per row, so the height is the sum over rows of each row's
 * tallest cell.
 */
const measureColumns = (tokens, from, to, width, columns) => {
	const cells = [];
	let i = from;
	while (i < to) {
		const end = blockEnd(tokens, i, to);
		cells.push(measureSpan(tokens, i, end, width));
		i = end;
	}
	let lines = 0;
	for (let row = 0; row < cells.length; row += columns) lines += Math.max(...cells.slice(row, row + columns));
	return lines;
};

const slideBudgetRule = (state) => {
	if (state.env.notesSheet) return;
	const tokens = state.tokens;
	const estimates = (state.env.slideEstimates = []);
	let number = 0;
	for (let i = 0; i < tokens.length; i += 1) {
		if (tokens[i].type !== "container_slide_open") continue;
		number += 1;
		let end = i + 1;
		while (end < tokens.length && tokens[end].type !== "container_slide_close") end += 1;
		const lines = Math.round(measureSpan(tokens, i + 1, end, CHARS_PER_LINE) * 10) / 10;
		const line = Number(tokens[i].attrGet("data-line") ?? 1);
		estimates.push({ slide: number, line, lines });
		if (lines > SLIDE_LINE_BUDGET) {
			process.stderr.write(`[slide-budget] ${fileOf(state.env)}:${line}: slide #s${number} estimates ${lines} lines against a budget of ${SLIDE_LINE_BUDGET} — likely to overflow at 1280×720\n`);
		}
		i = end;
	}
};

/**
 * The one markdown-it instance every page, decks included, renders through.
 * @type {import("markdown-it").MarkdownIt}
 */
export const markdown = markdownIt(baseOptions).use(markdownItAnchor, anchorOptions).use(markdownItFootnote);

markdown.block.ruler.before(
	"fence",
	"deck_slide",
	markerContainerRule(SLIDE_MARKER, "container_slide", (info, env, line) => {
		const match = /^slide(?:\s+(\S+))?$/.exec(info);
		if (!match) fail(env, line, `\`>>> ${info}\` doesn't open a slide — expected \`>>> slide\` or \`>>> slide <kind>\``);
		const [, kind = ""] = match;
		if (kind && !SLIDE_KINDS.has(kind)) {
			fail(env, line, `slide kind "${kind}" is not one of ${[...SLIDE_KINDS].join(", ")}`);
		}
		return kind;
	}),
	{ alt: ["paragraph", "reference", "blockquote", "list"] },
);

markdown.block.ruler.before("fence", "deck_container", markerContainerRule(CONTAINER_MARKER, "container_container"), {
	alt: ["paragraph", "reference", "blockquote", "list"],
});

markdown.core.ruler.push("deck_slide_balance", checkBalanced("container_slide_open", "container_slide_close", "a slide"));
markdown.core.ruler.push("deck_container_balance", checkBalanced("container_container_open", "container_container_close", "a `:::` container"));
markdown.core.ruler.push("deck_slide_budget", slideBudgetRule);
markdown.core.ruler.push("deck_containers", deckContainerRule);

installSlideTypography(markdown);


/* ```prompt fences render as prose figures, not code; ```prompt-avoid is the
   same but without the copy control. See docs/writing-content.md. */
const defaultFence = markdown.renderer.rules.fence;
markdown.renderer.rules.fence = (tokens, idx, options, env, self) => {
	const info = (tokens[idx].info || "").trim();
	if (info !== "prompt" && info !== "prompt-avoid") {
		return defaultFence(tokens, idx, options, env, self);
	}
	const paragraphs = tokens[idx].content
		.trim()
		.split(/\n{2,}/)
		.map((part) => `<p>${markdown.utils.escapeHtml(part.replace(/\n/g, " "))}</p>`)
		.join("\n");
	const avoid = info === "prompt-avoid";
	return `<figure class="prompt${avoid ? " prompt-avoid" : ""}"${avoid ? "" : " data-copyable"}>\n${paragraphs}\n</figure>\n`;
};
