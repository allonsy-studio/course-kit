/** Data for the virtual lesson-plans index page: every meeting's plan, for the instructor. */
export default {
	layout: "lesson",
	permalink: "/lessons/index.html",
	indexed: false,
	instructorOnly: true,
	tags: ["lesson-plans"],
	eleventyComputed: {
		title: (data) => data.copy.lessonPlans.lessonPlans,
		// Instructor-only: in the footer, never the top menu.
		eleventyNavigation: (data) => ({ title: data.copy.lessonPlans.navTitle, order: 9, menu: false }),
	},
};
