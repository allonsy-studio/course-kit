import { fill, resolveCopy } from "./copy.js";
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
	const copy = (data.copy ?? resolveCopy()).lessonMaterials;
	const note = (...parts) => parts.filter(Boolean).join(", ");
	const sections = [
		{
			title: copy.slidesForThisMeeting,
			items: lessonDecks(data).map((deck) => ({ title: deck.title, href: deck.url, extra: { text: copy.speakerNotes, href: deck.notesUrl, after: copy.printable } })),
		},
		{
			title: copy.demosFromThisMeeting,
			items: (data.lessonDemos ?? []).map((demo) => ({ title: demo.title, href: `/demo/${demo.slug}/`, note: demo.description })),
		},
		{
			title: copy.exercisesDue,
			items: assignmentsDue(data.collections?.assignment, lesson, data.lessons).map((item) => ({ title: item.title, href: item.url, note: item.dueLabel })),
		},
		{
			title: copy.readingForThisMeeting,
			items: (lesson.meetingReadings ?? []).map((reading) => ({
				title: reading.title,
				href: reading.href,
				note: note(reading.check, reading.due && fill(copy.due, { when: dueLabel(reading) })),
			})),
		},
		{
			title: copy.deadlinesToAnnounce,
			items: (lesson.due ?? []).map((item) => ({ title: item.title, href: item.href, note: item.due ? fill(copy.due, { when: dueLabel(item) }) : "" })),
		},
		{
			title: copy.assignedBeforeThisWeek,
			items: (lesson.readings ?? []).map((reading) => ({ title: reading.title, href: reading.href })),
		},
		{
			title: lesson.readings?.length ? copy.postedForTheClass : "",
			items: (lesson.resources ?? []).map((resource) => ({ title: resource.title, href: resource.href })),
			empty: copy.nothingPostedForThis,
		},
	];
	return sections.filter((section) => section.items.length || section.empty);
}
