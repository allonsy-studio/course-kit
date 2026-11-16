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

const eightPages = [
	{ url: "/", title: "Home" },
	{ url: "/#syllabus", title: "Syllabus" },
	{ url: "/schedule/", title: "Schedule" },
	{ url: "/slides/", title: "Slides" },
	{ url: "/practice/", title: "Practice" },
	{ url: "/glossary/", title: "Glossary" },
	{ url: "/projects/", title: "Projects" },
	{ url: "/demos/", title: "Demos" },
];

/** The hero writes the tag with a plain `column` attribute, which a story's args cannot set, so each frame writes it in `wrap`. */
const hero = (pages) => `<nav-links column context="hero" aria-label="Site" :@navigation='${JSON.stringify(pages)}'></nav-links>\n{story}`;

/** The hero's menu: up to six links stack in one column. */
export const HeroMenu = { name: "Hero menu, six pages", wrap: hero(eightPages.slice(0, 6)), args: { navigation: [] } };

/** More than six links fill two columns on a wide screen, down the first and then the second, so the header does not keep growing. */
export const HeroMenuEightPages = { name: "Hero menu, eight pages", wrap: hero(eightPages), args: { navigation: [] } };
