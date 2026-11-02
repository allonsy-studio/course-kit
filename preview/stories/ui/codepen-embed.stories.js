export default {
	title: "Building blocks/codepen-embed",
	height: 420,
	argTypes: { height: { description: "The embed's height in pixels." } },
};

export const Default = {
	args: {
		heading: "A first page",
		label: "A first page in HTML",
		summary: "Open the pen and change the heading.",
		height: 300,
		actions: '<a href="https://codepen.io/">Open in CodePen</a>',
		default: "<p>The embed loads when you click.</p>",
	},
};
