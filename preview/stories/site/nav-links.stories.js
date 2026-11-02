export default { title: "Site sections/nav-links" };

const navigation = [
	{ url: "/", title: "Home" },
	{ url: "/schedule/", title: "Schedule" },
	{ url: "/slides/", title: "Slides" },
];

export const Default = { args: { navigation } };

export const Footer = { args: { navigation, context: "footer" } };
