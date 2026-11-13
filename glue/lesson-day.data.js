import { fill } from "../lib/copy.js";
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
		title: (data) => fill(data.copy.lessonDay.weekDayLesson, { week: data.lesson.week, day: data.lesson.day }),
		lessonDecks,
		lessonMaterials,
	},
};
