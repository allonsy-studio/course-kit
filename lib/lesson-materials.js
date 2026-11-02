import { assignmentsDue, decksFor, dueLabel } from "./filters.js";

/**
 * @typedef {object} LinkItem
 * @property {string} title
 * @property {string} [href] the item is plain text without one
 * @property {string} [note] muted text after the title
 * @property {{ text: string, href: string, after?: string }} [extra] a second link after the title
 */

/**
 * The speaker-notes decks for a lesson-day page's meeting.
 * @param {{ lesson: { week: number, day: number }, collections?: { deck?: object[] } }} data
 * @returns {{ title: string, url: string, notesUrl: string }[]}
 */
export const lessonDecks = (data) => decksFor(data.collections?.deck, data.lesson.week, data.lesson.day);

/**
 * The "Materials & links" sections of a lesson-day page, in order, each ready
 * for `<link-section>`. A section with nothing to list is left out, except
 * the resources one, which says so.
 * @param {object} data a lesson-day page's data: `lesson`, `lessons`, `lessonDemos`, `collections`
 * @returns {{ title: string, items: LinkItem[], empty?: string }[]}
 */
export function lessonMaterials(data) {
	const { lesson } = data;
	const note = (...parts) => parts.filter(Boolean).join(", ");
	const sections = [
		{
			title: "Slides for this meeting",
			items: lessonDecks(data).map((deck) => ({ title: deck.title, href: deck.url, extra: { text: "speaker notes", href: deck.notesUrl, after: "(printable)" } })),
		},
		{
			title: "Demos from this meeting",
			items: (data.lessonDemos ?? []).map((demo) => ({ title: demo.title, href: `/demo/${demo.slug}/`, note: demo.description })),
		},
		{
			title: "Exercises due",
			items: assignmentsDue(data.collections?.assignment, lesson, data.lessons).map((item) => ({ title: item.title, href: item.url, note: item.dueLabel })),
		},
		{
			title: "Reading for this meeting",
			items: (lesson.meetingReadings ?? []).map((reading) => ({
				title: reading.title,
				href: reading.href,
				note: note(reading.check, reading.due && `due ${dueLabel(reading)}`),
			})),
		},
		{
			title: "Deadlines to announce",
			items: (lesson.due ?? []).map((item) => ({ title: item.title, href: item.href, note: item.due ? `due ${dueLabel(item)}` : "" })),
		},
		{
			title: "Assigned before this week",
			items: (lesson.readings ?? []).map((reading) => ({ title: reading.title, href: reading.href })),
		},
		{
			title: lesson.readings?.length ? "Posted for the class" : "",
			items: (lesson.resources ?? []).map((resource) => ({ title: resource.title, href: resource.href })),
			empty: "Nothing posted for this week yet.",
		},
	];
	return sections.filter((section) => section.items.length || section.empty);
}
