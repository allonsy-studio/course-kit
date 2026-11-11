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

export const Milestones = {
	args: {
		copy: COPY_DEFAULTS.tableRubric,
		caption: "Project milestones",
		criteria: [
			{ id: "M1", title: "Proposal", due: "Sep 15", points: 10, graded: "A one-page plan." },
			{ id: "M2", title: "Prototype", due: "Oct 6", points: 20, graded: "Working pages with real content." },
		],
	},
};
