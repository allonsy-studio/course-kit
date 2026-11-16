import { COPY_DEFAULTS } from "../../../lib/copy.js";

export default { title: "Building blocks/table-rubric" };

const levels = ["Exceeds", "Meets", "Not yet"];
const row = (title, texts, points) => ({ title, levels: texts.map((description, index) => ({ description, points: points[index] })) });

export const Levels = {
	name: "Performance levels",
	args: {
		copy: COPY_DEFAULTS.tableRubric,
		caption: "Project rubric",
		levels,
		total: 20,
		criteria: [row("Structure", ["Every page uses landmarks and headings correctly.", "Most pages are structured.", "Structure is missing."], [10, 7, 3]), row("Style", ["Consistent and responsive.", "Mostly consistent.", "Inconsistent."], [10, 7, 3])],
	},
};

const milestones = [
	{ id: "M1", title: "Proposal", due: "2026-09-15", dueTime: "11:59 pm", points: 10, description: "A one-page plan." },
	{ id: "M2", title: "Prototype", due: "2026-10-06", dueTime: "11:59 pm", points: 20, description: "Working pages with real content." },
	{ id: "M3", title: "Notes", points: 5, description: "A milestone with no due date leaves the cell empty." },
];

/** The Due column is the short form by default ("Tue, Sep 15, 11:59PM"), so it stays on two lines in a narrow column. */
export const Milestones = {
	args: { copy: COPY_DEFAULTS.tableRubric, caption: "Project milestones", total: 35, criteria: milestones },
};

/** `date-style="full"`: the long form ("Tuesday, September 15, 2026, 11:59PM"), for a table with room. */
export const MilestonesFullDates = {
	name: "Milestones, full dates",
	args: { copy: COPY_DEFAULTS.tableRubric, caption: "Project milestones", total: 35, criteria: milestones, dateStyle: "full" },
};
