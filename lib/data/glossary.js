/**
 * The course glossary: every `vocab` and `api` slide as one term, tagged by
 * test, chapter and class meeting. Read from the decks, so a new slide
 * appears here on the next build. Nothing here depends on the date.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { dateFormat } from "@allons-y/dashly/filters/dates";
import matter from "gray-matter";
import markdownIt from "markdown-it";

import { COPY_DEFAULTS } from "../copy.js";
import { fullDate } from "../filters.js";

const DECK = /^week-(\d+)-day-(\d+)(?:-[\w-]+)?\.md$/;
const TEST = /^Test (\d+)$/;
const noChapter = (copy) => ({ key: "none", label: copy.glossary.slidesOnly, order: 9999 });
const MONTH_DAY = { month: "long", day: "numeric" };
const md = markdownIt({ html: true, typographer: true, linkify: true });

/**
 * @typedef {object} Tag
 * @property {string} key
 * @property {string} label
 * @property {number} order
 * @property {string} [date] ISO date (test, final exam, meeting)
 * @property {string} [when] the date for display
 * @property {string} [deck] deck title (meeting)
 */

/** @param {string} text */
const plain = (text) => text.replace(/[`*_]/g, "").trim();

/** @param {string} text */
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The sort key of a term: its letters and digits only, lowercased and without
 * accents, so `@supports` sorts beside `supports` and `::before` under B.
 * Empty for a term with no letter or digit (`=>`, `<?=`).
 * @param {string} text
 */
const sortKey = (text) => text.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The A to Z group a sort key belongs to: "0 to 9", a letter, or "Symbols".
 * @param {string} key
 * @returns {{ key: string, label: string }}
 */
const azGroupOf = (key, symbols = COPY_DEFAULTS.glossary.symbols) => {
	if (!key) return { key: "symbols", label: symbols };
	if (/^\d/.test(key)) return { key: "0-9", label: "0 to 9" };
	return { key: key[0], label: key[0].toUpperCase() };
};

/**
 * A to Z order: by sort key (symbols-only terms last), ties broken by the full term.
 * @param {{ key: string, plain: string }} a
 * @param {{ key: string, plain: string }} b
 */
const byAz = (a, b) => Number(!a.key) - Number(!b.key) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) || a.plain.localeCompare(b.plain, "en") || (a.plain < b.plain ? -1 : Number(a.plain > b.plain));

/**
 * Stable id for a term key: its slug, or the code points when the slug is
 * empty or already taken (symbol-only terms like `=>` and `<?=`).
 * @param {string} key
 * @param {Set<string>} taken ids already issued
 * @returns {string}
 */
const idFor = (key, taken) => {
	const hex = [...key].map((char) => char.codePointAt(0).toString(16)).join("-");
	const id = slug(key) && !taken.has(slug(key)) ? slug(key) : `${slug(key)}-${hex}`.replace(/^-/, "");
	taken.add(id);
	return id;
};

/**
 * Body of the first `::: name` container, or "".
 * @param {string} body
 * @param {string} name
 */
const block = (body, name) => body.match(new RegExp(`^::: ${name}[^\\n]*\\n([\\s\\S]*?)^:::\\s*$`, "m"))?.[1].trim() ?? "";

/** @param {string} text */
const inline = (text) => (text ? md.renderInline(text) : "");

/**
 * The tests, from the meetings whose topics hold the exact string "Test n",
 * plus the final exam that follows the last one.
 * @param {ReturnType<typeof lessons>} meetings
 * @returns {Tag[]}
 */
const testsFrom = (meetings) => {
	const tests = [];
	for (const meeting of meetings) {
		if (meeting.noClass) continue;
		const label = meeting.topics.find((topic) => TEST.test(topic));
		if (label) tests.push({ key: `test-${label.match(TEST)[1]}`, label, order: Number(label.match(TEST)[1]), date: meeting.date, when: fullDate(meeting.date) });
	}
	return tests.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * The tag a term gets when its meeting is on or before a test, else the final exam.
 * @param {Tag[]} tests
 * @param {string} date
 * @param {object} schedule for the final exam slot
 * @returns {Tag}
 */
const testFor = (tests, date, schedule, copy) => {
	const test = tests.find((candidate) => date <= candidate.date);
	if (test) return test;
	const exam = { key: "final", label: copy.glossary.finalExam, order: (tests.at(-1)?.order ?? 0) + 1 };
	return schedule.finalExam?.date ? { ...exam, date: schedule.finalExam.date, when: fullDate(schedule.finalExam.date) } : exam;
};

/**
 * Authoring override: `::: tags` lines like `test: 2, 3` and `topic: loops`.
 * @param {string} body
 * @param {string} where file and slide, for errors
 * @returns {{ test: string[], topic: string[] }}
 */
const overridesOf = (body, where) => {
	const out = { test: [], topic: [] };
	for (const line of block(body, "tags").split("\n").filter((l) => l.trim())) {
		const [, kind, values] = line.match(/^\s*(\w+)\s*:\s*(.+?)\s*$/) ?? [];
		if (!(kind in out)) throw new Error(`${where}: \`::: tags\` line "${line.trim()}" must be \`test:\` or \`topic:\``);
		out[kind].push(...values.split(",").map((value) => value.trim()).filter(Boolean));
	}
	return out;
};

/**
 * Build the glossary from the decks: every `vocab` and `api` slide as one
 * term, tagged by test, chapter and meeting.
 * @param {{ lessons: object[], schedule: object, course: object, slidesDir: string }} data `slidesDir` holds the `week-N-day-M*.md` decks
 * @returns {object | null} null when there is no deck folder
 */
export function buildGlossary({ lessons: meetings, schedule, course, slidesDir, copy = COPY_DEFAULTS }) {
	if (!existsSync(slidesDir)) return null;

	const tests = testsFrom(meetings);
	const finalTag = testFor(tests, "9999-12-31", schedule, copy);
	const testByNumber = new Map(tests.map((test) => [String(test.order), test]));
	testByNumber.set("final", finalTag);

	const chapterOrder = new Map();
	const chapterTag = (title) => {
		const number = title.match(/(\d+)/)?.[1];
		if (!chapterOrder.has(title)) chapterOrder.set(title, number ? Number(number) : 500 + chapterOrder.size);
		return { key: title, label: title, order: chapterOrder.get(title) };
	};

	const topicOrder = new Map();
	const topicTag = (label) => {
		const key = slug(label);
		if (!topicOrder.has(key)) topicOrder.set(key, topicOrder.size + 1);
		return { key, label, order: topicOrder.get(key) };
	};

	const decks = readdirSync(slidesDir)
		.map((file) => ({ file, match: file.match(DECK) }))
		.filter(({ match }) => match)
		.map(({ file, match }) => ({ file, week: Number(match[1]), day: Number(match[2]) }))
		.sort((a, b) => a.week - b.week || a.day - b.day || a.file.localeCompare(b.file));

	/** @type {Map<string, object>} */
	const terms = new Map();
	const ids = new Set();

	for (const deck of decks) {
		const meeting = meetings.find((lesson) => lesson.week === deck.week && lesson.day === deck.day);
		if (!meeting) throw new Error(`${deck.file}: week ${deck.week} day ${deck.day} is not a meeting in the lessons`);
		const { data, content } = matter(readFileSync(join(slidesDir, deck.file), "utf8"));
		const title = String(data.title ?? deck.file);
		// Chapter anchors are the week's readings; meeting-level readings stand in only
		// when the week has none (they can be dated assignments, not chapters).
		const readings = meeting.readings.length ? meeting.readings : meeting.meetingReadings;

		[...content.matchAll(/^>>> slide([^\n]*)\n([\s\S]*?)^>>>\s*$/gm)].forEach(([, info, raw], index) => {
			const kind = /\bapi\b/.test(info) ? "api" : /\bvocab\b/.test(info) ? "vocab" : null;
			if (!kind) return;

			const where = `${deck.file} slide ${index + 1}`;
			const body = raw.replace(/^::: notes[\s\S]*?^:::\s*$/gm, "");
			const heading = body.match(/^# (.+)$/m)?.[1].trim();
			if (!heading) throw new Error(`${where}: a ${kind} slide needs a "# term" heading`);

			const eyebrow = block(body, "eyebrow").replace(/^- /gm, "").split("\n")[0].trim();
			const group = eyebrow.replace(/^(?:API|Vocabulary)\s*(?:·\s*)?/, "").trim();
			const ref = block(body, "ref").match(/\[([^\]]+)\]\(([^)]+)\)/);
			const rest = body.replace(/^::: \w+[\s\S]*?^:::\s*$/gm, "").replace(/^# .+$/m, "").trim();
			const key = `${plain(heading)}|${group}`.toLowerCase();

			let term = terms.get(key);
			if (!term) {
				term = {
					id: idFor(key, ids),
					term: inline(heading),
					plain: plain(heading),
					kind,
					group,
					definition: inline(rest.split(/\n\s*\n/)[0]?.trim() ?? ""),
					example: inline(block(body, "example")),
					meta: inline(block(body, "meta")),
					sig: inline(block(body, "sig")),
					ref: ref ? { label: ref[1], href: ref[2] } : null,
					tags: { test: new Map(), chapter: new Map(), meeting: new Map(), topic: new Map() },
					taught: [],
				};
				terms.set(key, term);
			}

			const add = (kindOfTag, tag) => term.tags[kindOfTag].set(tag.key, tag);
			add("test", testFor(tests, meeting.date, schedule, copy));
			for (const reading of readings) add("chapter", chapterTag(reading.title));
			if (!readings.length) add("chapter", noChapter(copy));
			add("meeting", {
				key: `w${deck.week}d${deck.day}`,
				label: `Week ${deck.week} · ${meeting.weekday}`,
				order: deck.week * 100 + deck.day,
				date: meeting.date,
				when: dateFormat(meeting.date, MONTH_DAY),
				deck: title,
			});

			const overrides = overridesOf(body, where);
			for (const number of overrides.test) {
				if (!testByNumber.has(number)) throw new Error(`${where}: \`test: ${number}\` is not a Test n meeting in the schedule`);
				add("test", testByNumber.get(number));
			}
			for (const label of overrides.topic) add("topic", topicTag(label));

			term.taught.push({
				week: deck.week,
				day: deck.day,
				slide: index + 1,
				date: meeting.date,
				weekday: meeting.weekday,
				deck: title,
				href: `/slides/week-${deck.week}-day-${deck.day}/#s${index + 1}`,
			});
		});
	}

	const byOrder = (a, b) => a.order - b.order;
	const keyed = [...terms.values()].map((term) => ({
		...term,
		key: sortKey(term.plain),
		tags: Object.fromEntries(Object.entries(term.tags).map(([name, tags]) => [name, [...tags.values()].sort(byOrder)])),
	}));

	// The A to Z position is computed once, here; the page script only reads it.
	const azRank = new Map([...keyed].sort(byAz).map((term, index) => [term.id, index]));
	const first = (term) => term.taught[0];
	/** Course order (first deck, then slide); the A to Z rank breaks ties. */
	const list = keyed
		.map((term) => ({ ...term, azOrder: azRank.get(term.id), azGroup: azGroupOf(term.key, copy.glossary.symbols) }))
		.sort((a, b) => first(a).week - first(b).week || first(a).day - first(b).day || first(a).slide - first(b).slide || a.azOrder - b.azOrder);

	/** Every A to Z group in order, with its terms: the no-JavaScript list. */
	const az = [];
	for (const term of [...list].sort((a, b) => a.azOrder - b.azOrder)) {
		if (az.at(-1)?.key !== term.azGroup.key) az.push({ ...term.azGroup, terms: [] });
		az.at(-1).terms.push(term);
	}

	/** Every tag in use, per kind, in display order. */
	const tags = Object.fromEntries(
		["test", "chapter", "meeting", "topic"].map((name) => {
			const all = new Map(list.flatMap((term) => term.tags[name]).map((tag) => [tag.key, tag]));
			return [name, [...all.values()].sort(byOrder)];
		}),
	);

	/** "Chapter", "Reading", …: the noun the reading titles share, else "Reading". */
	const noun = ["chapter", "section", "unit", "module", "lesson"].find((word) =>
		tags.chapter.some((tag) => new RegExp(`\\b${word}\\b`, "i").test(tag.label)),
	);

	const readingLabel = noun ? copy.glossary[noun] : copy.glossary.reading;

	/** For the page script: each term lists tag keys, resolved against `tags`. */
	const payload = {
		code: course.code,
		readingLabel,
		tags,
		terms: list.map((term) => ({
			...term,
			tags: Object.fromEntries(Object.entries(term.tags).map(([name, all]) => [name, all.map((tag) => tag.key)])),
		})),
	};

	return {
		code: course.code,
		readingLabel,
		terms: list,
		tags,
		/** Page JSON; markup characters escaped so neither the script element nor the template engine touches it. */
		json: JSON.stringify(payload).replace(/[<>&]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`),
		az,
	};
}
