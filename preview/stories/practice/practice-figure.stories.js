import { question } from "../../lib/sample-worksheet.js";

export default { title: "Practice worksheets/practice-figure" };

export const Default = { args: { q: { ...question("1.1"), figure: '<svg viewBox="0 0 120 40" role="img" aria-label="A box"><rect x="2" y="2" width="116" height="36" fill="none" stroke="currentColor"/></svg>' } } };
