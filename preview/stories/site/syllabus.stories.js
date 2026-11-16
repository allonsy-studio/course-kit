import course from "../../../examples/starter/_data/course.json" with { type: "json" };

export default {
	title: "Site sections/syllabus",
	argTypes: { contents: { control: "text" } },
};

/** Reads the course's data files. The contents list sits above the syllabus, and from 1100px beside it, sticky, marking the part on screen. */
export const Default = {};

/** `contents="false"`, or `"syllabusContents": false` in `course.json`: no list, and the syllabus is one column. */
export const WithoutContents = { name: "Without the contents list", args: { contents: "false" } };

/** A part the course has adds its link. The additional outcomes are listed after the outcomes. */
export const WithAdditionalOutcomes = {
	name: "With additional outcomes",
	data: { course: { ...course, additionalOutcomes: ["Compare two ways to structure a page and explain the trade-off."] } },
};

/** A part the course leaves out is not listed: with no grading there is no Coursework or Grading link. */
export const WithoutGrading = { name: "Without grading", data: { grading: false } };
