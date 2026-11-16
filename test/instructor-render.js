import path from "node:path";

import { WebC } from "@11ty/webc";

import { resolveCopy } from "../lib/copy.js";
import { encodeEmail } from "../lib/filters.js";
import { fill } from "../lib/copy.js";
import { packageRoot } from "../lib/paths.js";

/** Contact details a case may use: every method, one at a time, and none. */
export const PEOPLE = {
	all: { name: "Dr. Sam Example", office: "SMB 251", hours: ["by appointment"], email: "sam.example@example.edu", contact: "/contact/", blog: "https://sam.example.edu/blog/", photo: "/images/sam.webp", note: "I reply within a day." },
	email: { name: "Dr. Sam Example", office: "SMB 251", hours: ["by appointment"], email: "sam.example@example.edu" },
	message: { name: "Dr. Sam Example", office: "SMB 251", hours: ["by appointment"], email: "sam.example@example.edu", contact: "/contact/" },
	blog: { name: "Dr. Sam Example", office: "SMB 251", hours: ["by appointment"], email: "sam.example@example.edu", blog: "https://sam.example.edu" },
};

/**
 * Render `<instructor>` with a person and optional markup attributes, as a page would.
 * @param {object} instructor the `instructor` data
 * @param {string} [attrs] attributes on the tag, such as `@variant="card"`
 * @returns {Promise<string>} the section's HTML
 */
export async function renderInstructor(instructor, attrs = "") {
	const page = new WebC();
	page.defineComponents(path.join(packageRoot, "components", "site", "instructor.webc"));
	page.setHelper("encodeEmail", encodeEmail);
	page.setHelper("fill", fill);
	page.setContent(`<instructor ${attrs}></instructor>`);
	return (await page.compile({ data: { instructor, copy: resolveCopy() } })).html;
}
