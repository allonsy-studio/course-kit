import { scheduleWeeks } from "../../../lib/filters.js";

export default { title: "Site sections/schedule-overview" };

/** Reads the course's data files, so it needs no props. The starter's three weeks span two months. */
export const Default = {};

/** A fall term of fifteen weeks, Tuesdays and Thursdays from August 25, 2020: five months of class meetings, all of them past, so the Hide past weeks toggle is always there. */
const lessons = [];
const WEEKDAYS = ["Tuesday", "Thursday"];
for (let week = 1; week <= 15; week++) {
	WEEKDAYS.forEach((weekday, index) => {
		const date = new Date(Date.UTC(2020, 7, 25 + (week - 1) * 7 + index * 2));
		const iso = date.toISOString().slice(0, 10);
		lessons.push({ week, day: index + 1, weekday, date: iso, display: iso, topics: [`Topic ${week}.${index + 1}`], time: "10:00AM–11:15AM" });
	});
}
const weeks = scheduleWeeks(lessons, []);

/** The page's header with its weeks under it, as the schedule page has them: the row of months and the toggle is pinned to the top as the page scrolls. */
const page = `<article class="content-column wide">\n{story}\n<schedule-weeks :@weeks='${JSON.stringify(weeks)}'></schedule-weeks>\n</article>`;

export const StickyRow = {
	name: "Sticky row, five months",
	note: "Scroll the frame: the row of months stays at the top, the month on screen is underlined, and Hide past weeks is at its end. Below 640px wide the row is not sticky.",
	wrap: page,
	args: { weeks },
};
