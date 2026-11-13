export default { title: "Site sections/nav-links" };

const navigation = [
	{ url: "/", title: "Home" },
	{ url: "/schedule/", title: "Schedule" },
	{ url: "/slides/", title: "Slides" },
];

export const Default = { args: { navigation } };

export const Footer = { args: { navigation, context: "footer" } };

/** The links written as a `<ul>` in the slot. */
export const LinksInSlot = {
	name: "Links in the slot",
	args: { navigation: undefined, default: '<ul>\n\t<li><a href="#">Home</a></li>\n\t<li><a href="#">Schedule</a></li>\n</ul>' },
};

/** An empty `navigation` array falls back to the slot. */
export const EmptyNavigationFallback = {
	name: "Empty navigation falls back to the slot",
	args: { navigation: [], default: '<ul>\n\t<li><a href="#">From the slot</a></li>\n</ul>' },
};
