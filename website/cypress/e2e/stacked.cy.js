import { A11Y_MODES, MODES, REFLOW_WIDTH } from "../support/config.js";

/** The four frames that once scrolled sideways at 320px: the instructor card, the course summary and both rubric tables. */
const FRAMES = [
	"/components/frames/site/course-summary/default/",
	"/components/frames/site/instructor/default/",
	"/components/frames/ui/table-rubric/levels/",
	"/components/frames/ui/table-rubric/milestones/",
];
const RUBRICS = FRAMES.filter((url) => url.includes("table-rubric"));

describe("narrow layouts", () => {
	FRAMES.forEach((url) => {
		describe(url, () => {
			it(`has no sideways scroll at ${REFLOW_WIDTH}px`, () => {
				cy.viewport(REFLOW_WIDTH, 640);
				cy.emulateMedia(MODES.light);
				cy.visit(url);
				cy.checkReflow();
			});

			A11Y_MODES.forEach((mode) => {
				it(`passes axe at ${REFLOW_WIDTH}px, ${mode}`, () => {
					cy.viewport(REFLOW_WIDTH, 640);
					cy.emulateMedia(MODES[mode]);
					cy.visit(url);
					cy.checkPageA11y({ contrast: mode !== "forced-colors" });
				});
			});
		});
	});

	RUBRICS.forEach((url) => {
		describe(`${url} stacked`, () => {
			beforeEach(() => {
				cy.viewport(REFLOW_WIDTH, 640);
				cy.visit(url);
			});

			it("shows each cell's column name as text, and keeps the table's roles", () => {
				cy.get("table").should("have.attr", "role", "table");
				cy.get("tbody td").each(($cell) => {
					const label = $cell.find(".cell-label");
					expect(label.length, "a label in the cell").to.equal(1);
					expect(label.text().trim(), "label text").to.not.equal("");
					expect(label.attr("aria-hidden"), "label is hidden from assistive technology").to.equal("true");
					expect(Cypress.$(label[0]).is(":visible"), "label is visible").to.equal(true);
				});
				cy.get("tr").each(($row) => expect($row.attr("role")).to.equal("row"));
			});

			it("shows no column label in the footer, where the total sits beside its own name", () => {
				cy.get("tfoot").then(($foot) => $foot.find(".cell-label").each((_, label) => expect(Cypress.$(label).is(":visible"), "footer label").to.equal(false)));
			});
		});
	});
});
