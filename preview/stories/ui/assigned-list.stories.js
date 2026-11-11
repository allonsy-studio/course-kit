import { COPY_DEFAULTS } from "../../../lib/copy.js";

export default { title: "Building blocks/assigned-list" };

const { schedule } = COPY_DEFAULTS;
const kinds = { test: schedule.dueKindTest, graded: schedule.dueKindGraded, reading: schedule.dueKindReading, practice: schedule.dueKindPractice };

export const Default = {
	args: {
		label: "Read before class",
		dueOn: schedule.dueOn,
		items: [
			{ title: "Chapter 1", href: "#", check: "Answer the review questions", dueLabel: "Tue, Sep 1" },
			{ title: "MDN: HTML basics", href: "#" },
			{ title: "Course syllabus" },
		],
	},
};

/** Each deadline carries a chip for its kind. */
export const Chips = {
	args: {
		label: schedule.due,
		chips: true,
		kinds,
		items: [
			{ title: "Test 1", kind: "test", dueLabel: "Tue, Sep 29, 10:00AM" },
			{ title: "Lab 2", href: "#", kind: "graded", dueLabel: "Thu, Oct 1, 11:59PM" },
			{ title: "Chapter 3 reading", kind: "reading", dueLabel: "Thu, Oct 1, 11:59PM" },
			{ title: "Worksheet", kind: "practice" },
		],
	},
};
