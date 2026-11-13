export default {
	title: "Building blocks/week-block",
	argTypes: { level: { options: [2, 3] } },
	// Each matrix cell is its own week, so each section has its own name.
	matrixCell: (args, index) => ({ ...args, number: 3 + index, label: `Week ${3 + index}` }),
};

const H2 = "<h2>Schedule</h2>\n{story}";

export const Default = { args: { number: 3, label: "Week 3", dates: "Sep 14 – Sep 18", default: "<p>The week's meetings go here.</p>" }, wrap: H2 };

/** A long label and date range wrap beside each other on a phone. */
export const LongLabel = { args: { number: 12, label: "Week 12: Thanksgiving break and the final project work period", dates: "Nov 23 – Nov 27, with no class on Thursday", default: "<p>Nothing is scheduled.</p>" }, wrap: H2 };
