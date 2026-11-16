import { MODES, TARGET_MIN, VIEWPORTS } from "../support/config.js";

/** Operable targets in component UI are 44 x 44 CSS px or larger (WCAG 2.5.5); axe does not measure this to AAA. */
const pages = (Cypress.env("pages") || []).filter((url) => url.startsWith("/components/frames/"));

describe("target size", () => {
	pages.forEach((url) => {
		Object.entries(VIEWPORTS).forEach(([name, [width, height]]) => {
			it(`${url} at ${name} width`, () => {
				cy.viewport(width, height);
				cy.emulateMedia(MODES.light);
				cy.visit(url);
				cy.checkTargetSize(TARGET_MIN, "main", url);
			});
		});
	});
});

/**
 * Whole pages as a course ships them, not a component alone: the home page with its band, the document layout's contents rail, the practice index (a `.table-light` table of links), and the lesson plans
 * with their rail, outline and day navigation. Their links are in lists and navs, so no inline-in-text exemption applies.
 */
const LAYOUT_PAGES = [
	"/components/examples/home/",
	"/components/examples/document/",
	"/components/examples/practice-index/",
	"/components/lessons/",
	"/components/lessons/week-1/day-1/",
	"/components/lessons/week-1/day-2/",
];

describe("target size on whole pages", () => {
	LAYOUT_PAGES.forEach((url) => {
		Object.entries(VIEWPORTS).forEach(([name, [width, height]]) => {
			it(`${url} at ${name} width`, () => {
				cy.viewport(width, height);
				cy.emulateMedia(MODES.light);
				// The home band lists what is due soon only while the term runs: fix the date inside the starter's term so its links are there to measure.
				if (url.endsWith("/home/")) cy.clock(new Date("2026-09-02T16:00:00Z").getTime(), ["Date"]);
				cy.visit(url);
				if (url.endsWith("/home/")) cy.get("[data-coming-list] a.what").should("have.length.greaterThan", 0);
				cy.checkTargetSize(TARGET_MIN, "main", url);
			});
		});
	});
});

describe("the preview canvas's segmented controls", () => {
	it("every option is a 44px square with its icon centered", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit("/components/components/ui/arrow-link/");
		cy.get("[data-canvas] norn-segmented-control label").each(($label) => {
			const box = $label[0].getBoundingClientRect();
			expect(Math.round(box.width), "width").to.equal(TARGET_MIN);
			expect(Math.round(box.height), "height").to.equal(TARGET_MIN);
			const icon = $label[0].querySelector("svg").getBoundingClientRect();
			expect(Math.abs(icon.top - box.top - (box.bottom - icon.bottom)), "vertical offset difference").to.be.at.most(1);
			expect(Math.abs(icon.left - box.left - (box.right - icon.right)), "horizontal offset difference").to.be.at.most(1);
		});
	});
});
