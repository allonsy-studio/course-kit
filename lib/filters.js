/**
 * Site-specific date filters, layered on dashly's `dateFormat`. Data files
 * import the named functions directly; templates get them as universal
 * filters.
 */
import { dateFormat, longDate, shortDate } from "@allons-y/dashly/filters/dates";

const FULL = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
const MONTH_DAY = { month: "long", day: "numeric" };

/** "Monday, August 19, 2026" */
export const fullDate = (iso) => dateFormat(iso, FULL);

/**
 * Format an ISO date span: "October 17–20, 2026" within one month,
 * "November 30 – December 4, 2026" with both months spelled out otherwise.
 */
export const dateRange = (start, end) =>
	start.slice(0, 7) === end.slice(0, 7)
		? `${dateFormat(start, MONTH_DAY)}–${Number(end.slice(8, 10))}, ${end.slice(0, 4)}`
		: `${dateFormat(start, MONTH_DAY)} – ${dateFormat(end, MONTH_DAY)}, ${end.slice(0, 4)}`;

/**
 * Display string for a course's exam slot ({ date, start, end }):
 * "Tuesday, December 8, 2026, 9:00am–12:00pm".
 */
/**
 * Canonical clock time: `timeOfDay("11:59 pm")` -> "11:59PM". Normalizes
 * hand-authored times that drift into inconsistent shapes. Anything that
 * isn't a recognizable time (or range) passes through untouched.
 */
const CLOCK = /^(\d{1,2})(?::([0-5]\d))?\s*([ap])\.?m\.?$/i;

export const timeOfDay = (value) => {
	if (typeof value !== "string") return value;
	const parts = value.trim().split(/\s*[–—-]\s*/);
	if (parts.length > 2) return value;
	const normalized = parts.map((part) => {
		const match = CLOCK.exec(part.trim());
		if (!match) return null;
		const [, hour, minutes = "00", meridiem] = match;
		return `${Number(hour)}:${minutes}${meridiem.toUpperCase()}M`;
	});
	return normalized.every(Boolean) ? normalized.join("–") : value;
};

export const examSlot = (finalExam) =>
	finalExam
		? `${fullDate(finalExam.date)}, ${timeOfDay(finalExam.start)}–${timeOfDay(finalExam.end)}`
		: "";

/**
 * Display date of a section's last real class meeting (holidays skipped),
 * from the flat lessons array (`_data/lessons.js`): the term calendar's last
 * day of classes may itself be a holiday or otherwise unmet.
 */
export const lastMeeting = (lessons) => {
	const meetings = (lessons ?? []).filter((lesson) => !lesson.noClass);
	return meetings.length ? meetings[meetings.length - 1].display : "";
};

const SHORT_DATE = { month: "short", day: "numeric" };

/**
 * A week's date range from its meetings, for a week header: "Aug 20",
 * "Aug 25–27", or "Sep 29 – Oct 1".
 * @param {{date: string}[]} meetings in calendar order
 * @returns {string}
 */
const weekDates = (meetings) => {
	const first = meetings[0]?.date;
	const last = meetings.at(-1)?.date;
	if (!first) return "";
	const start = dateFormat(first, SHORT_DATE);
	if (!last || last === first) return start;
	return first.slice(0, 7) === last.slice(0, 7)
		? `${start}–${Number(last.slice(8, 10))}`
		: `${start} – ${dateFormat(last, SHORT_DATE)}`;
};

/**
 * The slide index as a timetable: one row per week, one cell per meeting
 * weekday (`schedule.meetings.days`), each cell carrying the meeting's date
 * and its deck when one exists. A cell is `missing` when the week has no
 * meeting on that weekday (the term's first week), `noClass` on a holiday,
 * and `deck: null` when the meeting has no deck yet. Every deck is listed as
 * soon as it publishes; the course no longer gates a deck behind its class
 * meeting (see "What students can and cannot see" in AGENTS.md).
 * @param {object[]} decks `collections.deck`
 * @param {object[]} lessons `_data/lessons.js`
 * @param {string[]} days `schedule.meetings.days`
 * @returns {{days: string[], weeks: object[]}}
 */
export const slideTimetable = (decks, lessons, days = []) => {
	const byWeek = new Map();
	for (const lesson of lessons ?? []) {
		if (!byWeek.has(lesson.week)) byWeek.set(lesson.week, []);
		byWeek.get(lesson.week).push(lesson);
	}
	const weeks = [...byWeek].map(([week, meetings]) => ({
		week,
		dates: weekDates(meetings),
		cells: days.map((weekday) => {
			const lesson = meetings.find((meeting) => meeting.weekday === weekday);
			if (!lesson) return { weekday, missing: true };
			const deck = (decks ?? []).find((item) => item.data.week === lesson.week && item.data.day === lesson.day);
			return {
				weekday,
				iso: lesson.date,
				date: dateFormat(lesson.date, SHORT_DATE),
				noClass: lesson.noClass,
				deck: deck
					? {
							title: deck.data.title,
							url: deck.url,
							draft: deck.data.draft === true,
							notesUrl: `/lessons/week-${lesson.week}/day-${lesson.day}/notes/`,
						}
					: null,
			};
		}),
	}));
	return { days, weeks };
};

/**
 * The public schedule, one group per week: the week's readings and
 * resources beside one entry per class meeting, each carrying its weekday,
 * short date and already-resolved topics. Sourced from `_data/lessons.js`
 * rather than re-deriving dates from `schedule.meetings.days`, since lessons
 * already accounts for holidays and schedule substitutions.
 * Each meeting also carries its own deck and demo links, matched by
 * week/day, so slides and demos never need a `resources[]` entry.
 * @param {object[]} lessons `_data/lessons.js`
 * @param {object[]} weeks `_data/schedule.json`'s `weeks`
 * @param {object[]} [decks] `collections.deck`
 * @param {object[]} [demos] `_data/demos.js`
 * @returns {object[]}
 */
export const scheduleWeeks = (lessons, weeks, decks = [], demos = []) => {
	const byWeek = new Map();
	for (const lesson of lessons ?? []) {
		if (!byWeek.has(lesson.week)) byWeek.set(lesson.week, []);
		byWeek.get(lesson.week).push(lesson);
	}
	return [...byWeek].map(([week, meetings]) => {
		const data = weeks?.[week - 1] ?? {};
		return {
			week,
			dates: weekDates(meetings),
			meetings: meetings.map((lesson) => ({
				weekday: lesson.weekday,
				iso: lesson.date,
				date: dateFormat(lesson.date, SHORT_DATE),
				display: lesson.display,
				noClass: lesson.noClass,
				substitution: lesson.substitution,
				topics: lesson.topics,
				slides: (decks ?? []).find((deck) => deck.data.week === lesson.week && deck.data.day === lesson.day)?.url,
				demos: (demos ?? [])
					.filter((demo) => (demo.lessons ?? []).some((at) => at.week === lesson.week && at.day === lesson.day))
					.map((demo) => ({ title: demo.title, url: `/demo/${demo.slug}/` })),
			})),
			readings: data.readings ?? [],
			resources: data.resources,
		};
	});
};

/**
 * The demo listing in the schedule's shape: one group per week that has a
 * demo, one entry per class meeting inside it, each meeting carrying its
 * deck link and the demos shown that day. A demo reused in a later class is
 * listed under every meeting it ran in, so the listing matches the schedule
 * meeting for meeting: in full the first time (`alsoOn` naming the later
 * dates), and as a one-line pointer after that (`firstShown`). Weeks and meetings with
 * no demo are left out; a lesson ref matching no meeting is dropped.
 * @param {object[]} demos `_data/demos.js`
 * @param {object[]} lessons `_data/lessons.js`
 * @param {object[]} [decks] `collections.deck`
 * @returns {object[]}
 */
export const demoWeeks = (demos, lessons, decks = []) => {
	const byWeek = new Map();
	for (const lesson of lessons ?? []) {
		if (!byWeek.has(lesson.week)) byWeek.set(lesson.week, []);
		byWeek.get(lesson.week).push(lesson);
	}
	const dateOf = (ref) => {
		const lesson = (lessons ?? []).find((item) => item.week === ref.week && item.day === ref.day);
		return lesson ? dateFormat(lesson.date, SHORT_DATE) : "";
	};
	return [...byWeek]
		.map(([week, meetings]) => ({
			week,
			dates: weekDates(meetings),
			meetings: meetings
				.map((lesson) => ({
					week: lesson.week,
					day: lesson.day,
					weekday: lesson.weekday,
					iso: lesson.date,
					date: dateFormat(lesson.date, SHORT_DATE),
					slides: (decks ?? []).find((deck) => deck.data.week === lesson.week && deck.data.day === lesson.day)?.url,
					demos: (demos ?? [])
						.filter((demo) => (demo.lessons ?? []).some((at) => at.week === lesson.week && at.day === lesson.day))
						.map((demo) => ({
							title: demo.title,
							description: demo.description,
							url: `/demo/${demo.slug}/`,
							download: demo.download,
							firstShown: (demo.lessons ?? [])
								.filter((at) => at.week < lesson.week || (at.week === lesson.week && at.day < lesson.day))
								.map(dateOf)
								.find(Boolean),
							alsoOn: (demo.lessons ?? [])
								.filter((at) => at.week > lesson.week || (at.week === lesson.week && at.day > lesson.day))
								.map(dateOf)
								.filter(Boolean),
						})),
				}))
				.filter((meeting) => meeting.demos.length),
		}))
		.filter((week) => week.meetings.length);
};

/**
 * The deck(s) tied to one class meeting, for the instructor lesson-plan
 * page. No availability gating here — the whole directory is
 * instructor-only already.
 * @param {object[]} decks `collections.deck`
 * @param {number} week
 * @param {number} day
 */
export const decksFor = (decks, week, day) =>
	(decks ?? [])
		.filter((deck) => deck.data.week === week && deck.data.day === day)
		.map((deck) => ({ title: deck.data.title, url: deck.url, notesUrl: `/lessons/week-${week}/day-${day}/notes/` }));

/**
 * The `data-prefill` payload for a CodePen prefill embed, as an attribute-safe
 * JSON string. The apostrophe escaping is load-bearing — see
 * content/demo/AGENTS.md.
 * @param {{title?: string, description?: string, tags?: string[]}} options
 * @returns {string}
 */
export const codepenPrefill = ({ title = "", description = "", tags = [] } = {}) =>
	JSON.stringify({ title, description, tags, stylesheets: [], scripts: [] }).replace(/'/g, "\\u0027");

/** @param {import('@11ty/eleventy').TemplateConfig} config */
export default function registerFilters(config) {
	config.addFilter("fullDate", fullDate);
	config.addFilter("dateRange", dateRange);
	config.addFilter("examSlot", examSlot);
	config.addFilter("timeOfDay", timeOfDay);
	config.addFilter("lastMeeting", lastMeeting);
	config.addFilter("slideTimetable", slideTimetable);
	config.addFilter("scheduleWeeks", scheduleWeeks);
	config.addFilter("demoWeeks", demoWeeks);
	config.addFilter("decksFor", decksFor);
	config.addFilter("longDate", longDate);
	config.addFilter("shortDate", shortDate);
	config.addFilter("codepenPrefill", codepenPrefill);
}
