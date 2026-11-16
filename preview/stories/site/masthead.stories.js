export default { title: "Site sections/masthead" };

/** Reads the course's data files, so it needs no props. */
export const Default = {};

/** `"navColumns": 2` in `course.json`, or `nav-columns="2"` on the tag: the menu in two columns, for a long menu. */
export const TwoColumnMenu = { args: { navColumns: 2 } };
