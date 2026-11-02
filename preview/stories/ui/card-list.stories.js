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
