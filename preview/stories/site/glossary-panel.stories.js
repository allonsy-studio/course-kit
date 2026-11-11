export default { title: "Site sections/glossary-panel" };

/** The terms and tags the script reads, as `buildGlossary` writes them. */
const json = JSON.stringify({
	code: "WEB 101",
	readingLabel: "Reading",
	tags: {
		test: [{ key: "test-1", label: "Test 1", order: 1 }],
		chapter: [{ key: "html", label: "HTML basics", order: 1 }],
		meeting: [{ key: "w1d1", label: "Week 1 · Tuesday", order: 1, when: "Tuesday, September 1", deck: "How the web works" }],
		topic: [],
	},
	terms: [
		{
			id: "landmark",
			term: "landmark",
			plain: "landmark",
			key: "landmark",
			azOrder: 0,
			azGroup: { key: "l", label: "L" },
			group: "",
			definition: "A page region with a role and a name.",
			example: "",
			meta: "",
			sig: "",
			ref: null,
			tags: { test: ["test-1"], chapter: ["html"], meeting: ["w1d1"], topic: [] },
			taught: [{ week: 1, day: 1, slide: 3, weekday: "Tuesday", href: "/slides/week-1-day-1/#s3" }],
		},
	],
});

export const Default = { args: { json, default: "<dl><dt>landmark</dt><dd>A page region with a role and a name.</dd></dl>" } };
