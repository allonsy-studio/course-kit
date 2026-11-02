export default { title: "Building blocks/link-list" };

const items = [
	{ url: "/slides/week-1-day-1/", name: "Welcome", description: "What we build, and how the course runs." },
	{ url: "/slides/week-1-day-2/", name: "How the web works", description: "Requests, responses and the browser." },
	{ url: "/schedule/", name: "Schedule" },
];

export const Default = { args: { items } };
