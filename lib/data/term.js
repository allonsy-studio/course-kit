import { dateRange, fullDate } from "../filters.js";

/**
 * The current academic term. Which term is data: `term` in course.json names a
 * year and season in dates.json.
 * @param {{ course: object, dates: object }} data
 * @returns {object} year, season, label, calendar, finalExamsDisplay, keyDates, instructorDates
 */
export function resolveTerm({ course, dates }) {
	if (!course || Object.keys(course).length === 0) {
		throw new Error("There is no course.json, or it is empty. Every course needs one in its data folder (_data): copy examples/starter/_data/course.json and edit it.");
	}
	if (!course.term?.year || !course.term?.season) {
		throw new Error('course.json needs a `term`, for example { "year": 2026, "season": "fall" }.');
	}
	const { year, season } = course.term;
	const calendar = dates[year]?.[season];
	if (!calendar) {
		const carried = Object.entries(dates)
			.filter(([key]) => /^\d{4}$/.test(key))
			.flatMap(([key, terms]) => Object.keys(terms).map((name) => `${key} ${name}`));
		throw new Error(
			`course.json says the term is ${year} ${season}, but dates.json has ${carried.length ? carried.join(", ") : "no terms"}. ` +
				"Match the year and season exactly; the season is lowercase (spring, summer or fall).",
		);
	}

	// "students" deadlines feed the syllabus, "faculty" ones the lesson pages.
	const deadlinesFor = (audience) =>
		Object.values(calendar.deadlines)
			.filter((deadline) => deadline.audience === audience)
			.map(({ date, label }) => ({ date, label, display: fullDate(date) }));

	const exams = calendar.finalExams;
	const finalExamsDisplay = dateRange(exams.start, exams.end);

	const holidayStart = (holiday) => (typeof holiday === "string" ? holiday : holiday.start);
	const readingDays = calendar.readingDays ?? (calendar.readingDay ? [calendar.readingDay] : []);
	const keyDates = [
		{ date: calendar.start, label: "Classes begin", display: fullDate(calendar.start) },
		...deadlinesFor("students"),
		...calendar.holidays.map((holiday) => ({
			date: holidayStart(holiday),
			label: dates.LABELS?.[holidayStart(holiday)] ?? "College holiday",
			display: typeof holiday === "string" ? fullDate(holiday) : dateRange(holiday.start, holiday.end),
		})),
		{ date: calendar.end, label: "Last day of classes", display: fullDate(calendar.end) },
		...(readingDays.length
			? [{
				date: readingDays[0],
				label: "Reading days (no classes or exams)",
				display: readingDays.length > 1 ? dateRange(readingDays[0], readingDays[readingDays.length - 1]) : fullDate(readingDays[0]),
			}]
			: []),
		{ date: exams.start, label: "Final examination period", display: finalExamsDisplay },
	].sort((a, b) => a.date.localeCompare(b.date));

	const instructorDates = [
		...deadlinesFor("faculty"),
		...(calendar.preRegistration
			? [{
				date: calendar.preRegistration,
				label: "Pre-registration for the next term opens",
				display: fullDate(calendar.preRegistration),
			}]
			: []),
	].sort((a, b) => a.date.localeCompare(b.date));

	return {
		year,
		season,
		label: `${season[0].toUpperCase()}${season.slice(1)} ${year}`,
		calendar,
		finalExamsDisplay,
		keyDates,
		instructorDates,
	};
}
