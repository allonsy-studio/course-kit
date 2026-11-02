// test-generator:private
/**
 * __COURSE__ · __TEST__ content. `node __FILE__.mjs` writes the test and its key next to this file.
 * KEY=1 builds only the key. HTML=1 also writes the HTML.
 */
import { buildTest } from "../lib/build.mjs";
import { code, circleTable, fill, how, highlighter, matching, mc, mark, termMatch } from "../lib/items.mjs";
import { load } from "../lib/render.mjs";

const Prism = load("prismjs");
const { pre } = highlighter(Prism, "markup");

const meta = {
	slug: "__SLUG__",
	file: "__FILE__",
	course: "__COURSE__",
	school: "__SCHOOL__",
	title: "__TEST__",
	subtitle: "__DATE__ · __MINUTES__ minutes · 100 points",
	footer: "__COURSE__ · __TEST__",
};

/** One function per section; each takes `key` (true builds the answer key). */
const sections = [
	(key) => ({
		n: 1,
		title: "Multiple Choice",
		points: 40,
		blurb: "What the first weeks covered.",
		body: `
		${how("Multiple choice · 4 points each · Write the letter of the one best answer in the box.")}
		${mc(1, "Which element holds the page's main content?", ["The " + code("<div>"), "The " + code("<main>"), "The " + code("<section>"), "The " + code("<body>")], 1, key)}
		${mc(2, "What does the browser build from the page's tags?", ["A screenshot", "The DOM tree", "A CSS file", "A server"], 1, key, { aside: pre(["<ul>", "  <li>One</li>", "</ul>"]) })}
		${mark("2 points for naming the tree without the word DOM.", key)}
		`,
	}),
	(key) => ({
		n: 2,
		title: "Short Answer and Circle",
		points: 30,
		body: `
		${fill(1, "Write the tag that makes a list item. <i>5 points</i>", code("<li>"), key)}
		${fill(2, "Name the one attribute that links a " + code("<label>") + " to its input. <i>5 points</i>", code("for"), key, { lines: 2 })}
		${circleTable([["It works with the keyboard", 0], ["It is announced as a button", 1]], ["Works", "Doesn't work"], key)}
		`,
	}),
	(key) => ({
		n: 3,
		title: "Match the Term",
		points: 30,
		blurb: "3 points each. Write the definition's letter in the box.",
		body:
			matching({
				key,
				bank: ["A page region with a role", "An element with no closing tag", "The set of children an element may have"],
				rows: [["landmark", 0], ["void element", 1], ["content model", 2]],
			}) +
			termMatch({
				key,
				terms: [["DOM", 0], ["ARIA", 1]],
				defs: ["The browser's tree of the page.", "Attributes that change what a screen reader says."],
			}),
	}),
];

const { files } = await buildTest({ meta, sections, outDir: import.meta.dirname });
console.log(files.map((file) => `wrote ${file}`).join("\n"));
