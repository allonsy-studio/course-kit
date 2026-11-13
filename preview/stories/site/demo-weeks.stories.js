export default { title: "Site sections/demo-weeks" };

/** Builds from the course's demos and lessons; the story passes its own weeks, since the starter has no demos. */
export const Default = {
	args: {
		weeks: [
			{
				week: 1,
				dates: "Sep 1 – Sep 3",
				meetings: [
					{
						week: 1,
						day: 1,
						weekday: "Tuesday",
						iso: "2026-09-01",
						date: "Sep 1",
						slides: "/slides/week-1-day-1/",
						demos: [{ title: "A first page", description: "Headings, a paragraph and a link.", url: "/demo/first-page/", download: "/demo/first-page.html", alsoOn: ["Sep 3"] }],
					},
					{
						week: 1,
						day: 2,
						weekday: "Thursday",
						iso: "2026-09-03",
						date: "Sep 3",
						demos: [{ title: "A first page", url: "/demo/first-page/", download: "/demo/first-page.html", firstShown: "Sep 1" }],
					},
				],
			},
		],
	},
};
