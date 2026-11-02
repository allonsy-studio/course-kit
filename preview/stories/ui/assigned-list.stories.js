export default { title: "Building blocks/assigned-list" };

export const Default = {
	args: {
		label: "Read before class",
		prefix: "due ",
		items: [
			{ title: "Chapter 1", href: "#", check: "Answer the review questions", dueLabel: "Tue, Sep 1" },
			{ title: "MDN: HTML basics", href: "#" },
			{ title: "Course syllabus" },
		],
	},
};
