export default { title: "Building blocks/link-section" };

export const Default = {
	args: {
		title: "Read before class",
		items: [
			{ title: "MDN: How the web works", href: "https://developer.mozilla.org/docs/Learn_web_development/Getting_started/Web_standards/How_the_Web_works" },
			{ title: "Chapter 1", note: "pages 1–20" },
			{ title: "The HTML spec", href: "https://html.spec.whatwg.org/", extra: { text: "section 4", href: "https://html.spec.whatwg.org/#semantics", after: "(skim)" } },
		],
	},
};

export const Empty = { args: { empty: "Nothing to read this week.", items: [] } };
