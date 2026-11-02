import { lessonDecks, lessonMaterials } from "../lib/lesson-materials.js";

/** Data for the virtual lesson-day page: one page per entry in `lessons`. */
export default {
	layout: "lesson-detail",
	indexed: false,
	instructorOnly: true,
	eleventyExcludeFromCollections: true,
	pagination: { data: "lessons", size: 1, alias: "lesson" },
	eleventyComputed: {
		permalink: (data) => `/lessons/week-${data.lesson.week}/day-${data.lesson.day}/`,
		title: (data) => `Week ${data.lesson.week}, Day ${data.lesson.day} — Lesson Plan`,
		lessonDecks,
		lessonMaterials,
	},
};
