import { COPY_DEFAULTS } from "../../../lib/copy.js";

export default { title: "Building blocks/assigned-list" };

const { schedule } = COPY_DEFAULTS;
const kinds = { test: schedule.dueKindTest, graded: schedule.dueKindGraded, reading: schedule.dueKindReading, practice: schedule.dueKindPractice };

export const Default = {
	args: {
		label: "Read before class",
		dueOn: schedule.dueOn,
		kinds,
		items: [
			{ title: "Chapter 1", href: "#", kind: "reading", check: "Answer the review questions", dueLabel: "Tue, Sep 1" },
			{ title: "MDN: HTML basics", href: "#", kind: "practice" },
			{ title: "Course syllabus", kind: "graded" },
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

/** The list written as a `<dl>` in the default slot: it reads well with no styles. */
export const DefinitionList = {
	name: "Definition list",
	args: {
		label: schedule.due,
		items: undefined,
		default: `<dl>
	<dt data-kind="test"><span class="due-chip" data-kind="test">${schedule.dueKindTest}</span> Test 1</dt>
	<dd>Tue, Sep 29, 10:00AM</dd>
	<dt data-kind="graded"><span class="due-chip" data-kind="graded">${schedule.dueKindGraded}</span> <a href="#">Lab 2</a></dt>
	<dd>Thu, Oct 1, 11:59PM</dd>
	<dt>Worksheet</dt>
</dl>`,
	},
};

/** A long title wraps under its chip, and an item with no link or detail is plain text. */
export const LongTitle = {
	name: "Long title",
	args: {
		label: schedule.due,
		chips: true,
		kinds,
		items: [
			{ title: "Chapter 12: Putting everything together, a very long reading title that has to wrap onto a second and a third line on a phone", href: "#", kind: "reading", check: "Answer the review questions at the end of the chapter before class", dueLabel: "Thu, Oct 1, 11:59PM" },
			{ title: "Plain item with no kind", dueLabel: "Fri, Oct 2" },
		],
	},
};

/** An empty `items` array falls back to the slot's `<dl>`, so the list still shows when the data does not load. */
export const EmptyItemsFallback = {
	name: "Empty items falls back to the slot",
	args: {
		label: schedule.due,
		items: [],
		default: `<dl>
	<dt>Chapter 1</dt>
	<dd>Tue, Sep 1</dd>
</dl>`,
	},
};
