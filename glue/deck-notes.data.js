import { fill } from "../lib/copy.js";
import { deckNotesUrl } from "../lib/filters.js";
import { deckNotes } from "../lib/markdown.js";

/**
 * The deck behind a notes sheet, or null while Eleventy scans for dependencies.
 * @param {object} data
 */
const deckOf = (data) => {
	const deck = data.notesDeck;
	return deck && typeof deck === "object" && typeof deck.data?.week === "number" ? deck : null;
};

/** Data for the virtual speaker-notes page: one sheet per deck. */
export default {
	layout: "notes",
	indexed: false,
	instructorOnly: true,
	eleventyExcludeFromCollections: true,
	// Only real decks: a page in the deck folder with no week and day (the slides index) gets no sheet.
	pagination: { data: "collections.deck", size: 1, alias: "notesDeck", before: (decks) => decks.filter((deck) => typeof deck.data?.week === "number") },
	eleventyComputed: {
		// Beside the meeting's lesson plan: /lessons/week-N/day-N/notes/, and /addendum/ after it for an addendum.
		permalink: (data) => {
			const deck = deckOf(data);
			return deck ? deckNotesUrl(deck.data.week, deck.data.day, deck.data.addendum === true) : data.permalink;
		},
		title: (data) => (deckOf(data) ? fill(data.copy.deckNotes.speakerNotesTitle, { title: deckOf(data).data.title }) : data.copy.deckNotes.speakerNotes),
		// One entry per slide, numbered to match the deck's `#sN`.
		notesSlides: (data) => {
			const deck = deckOf(data);
			return deck && typeof deck.rawInput === "string" ? deckNotes(deck.rawInput, deck.inputPath) : [];
		},
		// The meeting the deck is taught in, for the date line.
		notesLesson: (data) => {
			const deck = deckOf(data);
			if (!deck || !Array.isArray(data.lessons)) return null;
			return data.lessons.find((lesson) => lesson.week === deck.data.week && lesson.day === deck.data.day) ?? null;
		},
	},
};
