export default {
	title: "Building blocks/card-list",
	argTypes: { items: { description: "Pages, each with `data` (`code`, `name`, `description`) and `page.url`." } },
};

export const Default = {
	args: {
		items: [
			{ data: { code: "CS101", name: "Introduction to Web Publishing", description: "HTML, CSS and a first look at JavaScript." }, page: { url: "/" } },
			{ data: { code: "CS201", name: "Web Programming", description: "Scripting the page and talking to a server." }, page: { url: "/" } },
		],
	},
};

/** The cards written as a `<ul>` in the `cards` slot. */
export const CardsInSlot = {
	name: "Cards in the slot",
	args: { items: undefined, cards: '<ul>\n\t<li><a href="#"></a><p class="eyebrow">CS101</p><h3>Introduction to Web Publishing</h3><p>HTML, CSS and a first look at JavaScript.</p></li>\n</ul>' },
};

/** An empty `items` array falls back to the `cards` slot. */
export const EmptyItemsFallback = {
	name: "Empty items falls back to the slot",
	args: { items: [], cards: "<ul>\n\t<li><h3>From the slot</h3></li>\n</ul>" },
};
