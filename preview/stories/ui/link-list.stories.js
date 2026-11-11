export default { title: "Building blocks/link-list" };

const items = [
	{ url: "/slides/week-1-day-1/", name: "Welcome", description: "What we build, and how the course runs." },
	{ url: "/slides/week-1-day-2/", name: "How the web works", description: "Requests, responses and the browser." },
	{ url: "/schedule/", name: "Schedule" },
];

export const Default = { args: { items } };

/** The list written as a `<ul>` of links in the slot. */
export const ListInSlot = {
	name: "List in the slot",
	args: { items: undefined, default: '<ul>\n\t<li><h4><a href="#">Welcome</a></h4><p>What we build, and how the course runs.</p></li>\n\t<li><h4><a href="#">Schedule</a></h4></li>\n</ul>' },
};

/** The list written as a `<dl>`: each `<dt>` is the link, each `<dd>` its description. */
export const DefinitionListInSlot = {
	name: "Definition list in the slot",
	args: { items: undefined, default: '<dl>\n\t<dt><a href="#">Welcome</a></dt>\n\t<dd>What we build, and how the course runs.</dd>\n\t<dt><a href="#">Schedule</a></dt>\n</dl>' },
};

/** An empty `items` array falls back to the slot. */
export const EmptyItemsFallback = {
	name: "Empty items falls back to the slot",
	args: { items: [], default: '<ul>\n\t<li><h4><a href="#">From the slot</a></h4></li>\n</ul>' },
};
