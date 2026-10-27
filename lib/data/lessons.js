import { projectMilestones } from "./project.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const utc = (iso) => new Date(`${iso}T00:00:00Z`);
const iso = (date) => date.toISOString().slice(0, 10);
const display = new Intl.DateTimeFormat("en-US", {
	timeZone: "UTC",
	weekday: "long",
	month: "long",
	day: "numeric",
	year: "numeric",
});

/** Offset from the week's Monday, per weekday name. */
const WEEKDAY_OFFSETS = {
	Monday: 0,
	Tuesday: 1,
	Wednesday: 2,
	Thursday: 3,
	Friday: 4,
};

export const DEFAULT_DAYS = ["Tuesday", "Thursday"];

const CLOCK = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

const minutesOf = (time) => {
	const match = CLOCK.exec(String(time).trim());
	if (!match) return null;
	const [, hour, minutes, meridiem] = match;
	const base = (Number(hour) % 12) * 60 + Number(minutes);
	return meridiem.toUpperCase() === "PM" ? base + 12 * 60 : base;
};

/**
 * Class length from a meeting time: "9:00AM–9:50AM" is 50.
 * @param {string} [range]
 * @returns {number | null}
 */
const durationOf = (range) => {
	const [start, end] = String(range ?? "").split(/\s*[–—-]\s*/);
	const from = minutesOf(start);
	const to = minutesOf(end);
	return from != null && to != null && to > from ? to - from : null;
};

/** The lesson outline as shares of the meeting; the `absorbs` row takes the rounding. */
export const SEGMENTS = [
	{ share: 5 / 80, segment: "Welcome, recap the previous class, open questions", opening: "Welcome, introductions, how the course runs" },
	{ share: 25 / 80, segment: "Instruction: this week's topics (see above)" },
	{ share: 35 / 80, segment: "Guided practice / lab work", absorbs: true },
	{ share: 10 / 80, segment: "Wrap-up: recap, preview next class, assignment reminders" },
	{ share: 5 / 80, segment: "Buffer" },
];

const outlineFor = (minutes, firstMeeting, segments) => {
	if (!minutes) return [];
	const rows = segments.map((row) => ({
		minutes: Math.max(5, Math.round((minutes * row.share) / 5) * 5),
		segment: firstMeeting && row.opening ? row.opening : row.segment,
		absorbs: row.absorbs,
	}));
	const drift = minutes - rows.reduce((total, row) => total + row.minutes, 0);
	const sink = rows.find((row) => row.absorbs);
	if (sink) sink.minutes += drift;
	return rows.map(({ minutes: length, segment }) => ({ minutes: length, segment }));
};

/**
 * Place each project milestone on the last class meeting on or before its due
 * date, after any hand-authored `due[]`. A milestone with no such meeting is
 * dropped.
 * @param {object[]} lessons
 * @param {object} [project] `_data/project.json`
 * @returns {object[]} lessons, with `due` extended
 */
const withProjectDeadlines = (lessons, project) => {
	const meetings = lessons.filter((lesson) => !lesson.noClass);
	const milestones = projectMilestones(project);
	return lessons.map((lesson) => {
		const placed = milestones.filter((milestone) => meetings.findLast((meeting) => meeting.date <= milestone.due) === lesson);
		if (!placed.length) return lesson;
		const due = placed.map(({ title, due: date, dueTime }) => ({ title, href: project.url, due: date, dueTime }));
		return { ...lesson, due: [...lesson.due, ...due] };
	});
};

/**
 * Per-meeting lesson plans, flattened into one array for pagination.
 * @param {{ course: object, dates: object, schedule: object, project?: object, term: { calendar: object }, segments?: typeof SEGMENTS, defaultDays?: string[] }} data
 * @returns {object[]}
 */
export function buildLessons({ course, dates, schedule, project, term, segments = SEGMENTS, defaultDays = DEFAULT_DAYS }) {
	if (!Array.isArray(schedule.weeks)) return [];

	const calendar = term.calendar;
	const termStart = utc(calendar.start);
	const termEnd = utc(calendar.end);
	// Monday of the week containing the term start, whatever weekday it is.
	const weekOneMonday = new Date(termStart.getTime() - ((termStart.getUTCDay() + 6) % 7) * DAY_MS);

	const holidayFor = (date) => {
		for (const holiday of calendar.holidays) {
			const start = typeof holiday === "string" ? holiday : holiday.start;
			const end = typeof holiday === "string" ? holiday : holiday.end;
			if (date >= utc(start) && date <= utc(end)) {
				return dates.LABELS?.[start] ?? "College holiday";
			}
		}
		return null;
	};

	// College-wide days that run a different weekday's class schedule.
	const substitutionFor = (date) => calendar.substitutions?.[iso(date)] ?? null;

	const meetingDays = schedule.meetings?.days ?? defaultDays;
	const slots = meetingDays.map((weekday, index) => ({
		day: index + 1,
		weekday,
		offset: WEEKDAY_OFFSETS[weekday] ?? 1,
	}));

	const lessons = [];
	let meeting = 0;
	schedule.weeks.forEach((week, weekIndex) => {
		const weekNumber = weekIndex + 1;
		const monday = new Date(weekOneMonday.getTime() + (weekNumber - 1) * 7 * DAY_MS);
		for (const slot of slots) {
			const date = new Date(monday.getTime() + slot.offset * DAY_MS);
			if (date < termStart || date > termEnd) continue;

			const noClass = holidayFor(date);
			const classDaysThisWeek = lessons.filter((l) => l.week === weekNumber && !l.noClass).length;
			// `week.days[]` entries are keyed by meeting slot (1 = first meeting of the week), not weekday.
			const override = week.days?.find((d) => d.day === slot.day);
			const topics = override?.topics ?? week.topics;
			const meetingNumber = noClass ? null : meeting + 1;
			lessons.push({
				code: course?.code,
				week: weekNumber,
				day: slot.day,
				weekday: slot.weekday,
				date: iso(date),
				display: display.format(date),
				time: schedule.meetings?.time ?? "TBD",
				minutes: durationOf(schedule.meetings?.time),
				outline: outlineFor(durationOf(schedule.meetings?.time), meetingNumber === 1, segments),
				topics,
				readings: week.readings ?? [],
				meetingReadings: override?.readings ?? [],
				due: override?.due ?? [],
				resources: week.resources,
				testWeek: topics.some((topic) => /^Test \d+$/.test(topic)),
				noClass,
				substitution: substitutionFor(date),
				meeting: noClass ? null : ++meeting,
				focus: noClass
					? null
					: classDaysThisWeek === 0
						? "Introduce this week's material"
						: "Continue, practice, and lab work",
			});
		}
	});
	return withProjectDeadlines(lessons, project);
}
