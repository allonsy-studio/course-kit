export default { title: "Site sections/glossary-entry" };

export const Default = {
	args: {
		entry: {
			term: "landmark",
			definition: "A page region with a role and a name, such as <code>header</code> or <code>nav</code>.",
			example: "<code>&lt;nav aria-label=\"Site\"&gt;</code>",
			tags: { test: [{ label: "Test 1" }], chapter: [], meeting: [{ label: "Week 1" }], topic: [] },
			taught: [{ href: "/slides/week-1-day-1/", week: 1, weekday: "Tuesday", slide: 2 }],
		},
	},
};
