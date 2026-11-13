export default { title: "Site sections/course-documents" };

/** Lists `course.documents`; the story passes its own, since the starter course has none. */
export const Default = {
	args: {
		documents: [
			{ title: "Style guide", description: "How to format the code you hand in.", href: "https://example.edu/style-guide" },
			{ title: "Accessibility checklist", href: "https://example.edu/a11y" },
		],
	},
};
