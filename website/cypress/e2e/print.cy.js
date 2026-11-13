import { VIEWPORTS } from "../support/config.js";

/** Print is the page without its controls: every control that needs a pointer or a script is hidden, and the content stays. */
const PAGES = [
	"/components/frames/practice/practice-worksheet/default/",
	"/components/frames/site/glossary-panel/default/",
	"/components/frames/site/schedule-weeks/default/",
	"/components/frames/site/course-now/default/",
	"/components/frames/ui/code-block/default/",
	"/components/frames/ui/today-link/default/",
];

/** Controls that make no sense on paper. */
const CONTROLS = [".code-copy", ".prompt-copy", "[data-check]", "[data-reset]", "[data-retry]", "[data-check-one]", "[data-hide-past]", ".today-link", "[data-schedule-tools]", "[data-course-now]", ".practice-summary", ".restore-note", ".switch", ".clear-search"];

describe("print", () => {
	PAGES.forEach((url) => {
		it(`${url} hides its controls`, () => {
			cy.viewport(...VIEWPORTS.desktop);
			cy.visit(url);
			// Let the page's script show its controls first, so print has something to hide.
			cy.get("main").should("exist");
			cy.wait(300);
			cy.emulatePrint();
			cy.document().then((doc) => {
				const win = doc.defaultView;
				const shown = [];
				for (const selector of CONTROLS) {
					for (const el of doc.querySelectorAll(selector)) {
						const box = el.getBoundingClientRect();
						if (win.getComputedStyle(el).display !== "none" && (box.width > 0 || box.height > 0)) shown.push(`${selector}: ${el.outerHTML.slice(0, 70)}`);
					}
				}
				expect(shown, "controls still showing in print").to.deep.equal([]);
			});
		});
	});
});
