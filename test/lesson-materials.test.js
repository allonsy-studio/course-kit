import assert from "node:assert/strict";
import { test } from "node:test";

import { lessonDecks, lessonMaterials } from "../lib/lesson-materials.js";

const lesson = { week: 3, day: 2, date: "2026-09-10", readings: [{ title: "Ch 1", href: "/r/1" }], resources: [], meetingReadings: [], due: [] };
const base = {
	lesson,
	lessons: [lesson],
	collections: { deck: [{ url: "/slides/week-3-day-2/", data: { week: 3, day: 2, title: "Who's listening" } }], assignment: [] },
};

test("lessonDecks finds the decks for the page's meeting", () => {
	assert.deepEqual(lessonDecks(base).map((deck) => deck.title), ["Who's listening"]);
	assert.deepEqual(lessonDecks({ lesson, collections: {} }), []);
});

test("lessonMaterials lists only the sections that have something, in order", () => {
	const titles = lessonMaterials(base).map((section) => section.title);
	assert.deepEqual(titles, ["Slides for this meeting", "Assigned before this week", "Posted for the class"]);
});

test("a deck links to its speaker notes, and resources say so when there are none", () => {
	const [slides, , resources] = lessonMaterials(base);
	assert.deepEqual(slides.items[0], {
		title: "Who's listening",
		href: "/slides/week-3-day-2/",
		extra: { text: "speaker notes", href: "/lessons/week-3/day-2/notes/", after: "(printable)" },
	});
	assert.deepEqual(resources.items, []);
	assert.equal(resources.empty, "Nothing posted for this week yet.");
});

test("deadlines, per-meeting readings, exercises and demos carry a due note", () => {
	const detailed = {
		...base,
		lesson: {
			...lesson,
			readings: [],
			meetingReadings: [{ title: "MDN", href: "/m", check: "3 questions", due: "2026-09-10", dueTime: "11:59 pm" }],
			due: [{ title: "M1", href: "/p", due: "2026-09-10" }, { title: "No date" }],
		},
		lessonDemos: [{ slug: "grid", title: "Grid", description: "One declaration" }],
		collections: { deck: [], assignment: [{ url: "/assignment/css/", data: { title: "CSS", due: "2026-09-10" } }] },
	};
	detailed.lessons = [detailed.lesson];
	const byTitle = Object.fromEntries(lessonMaterials(detailed).map((section) => [section.title, section.items]));
	assert.deepEqual(byTitle["Demos from this meeting"], [{ title: "Grid", href: "/demo/grid/", note: "One declaration" }]);
	assert.equal(byTitle["Exercises due"][0].note, "Thu, Sep 10");
	assert.equal(byTitle["Reading for this meeting"][0].note, "3 questions, due Thu, Sep 10, 11:59PM");
	assert.deepEqual(byTitle["Deadlines to announce"].map((item) => item.note), ["due Thu, Sep 10", ""]);
	assert.ok(!("Assigned before this week" in byTitle));
});
