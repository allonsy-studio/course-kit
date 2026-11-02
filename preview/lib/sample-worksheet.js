import { readFileSync } from "node:fs";
import path from "node:path";

import { parseWorksheet, prepareWorksheet } from "../../lib/worksheets.js";

const file = path.join(import.meta.dirname, "..", "stories", "practice", "sample.worksheet.md");

/** The sample worksheet, prepared as a course's `.11tydata.js` would. */
export const { worksheet } = prepareWorksheet(parseWorksheet(readFileSync(file, "utf8"), file));

/**
 * @param {string} id a question id, e.g. "2.1"
 * @returns {object} that prepared question
 */
export const question = (id) => worksheet.sections.flatMap((section) => section.questions).find((q) => q.id === id);
