import { MODES, VIEWPORTS } from "../support/config.js";

/** One worksheet, through every step a student takes: answer, check, save, reload, restore, retry, clear. */
const WORKSHEET = "/components/frames/practice/practice-worksheet/default/";

describe("worksheet behavior", () => {
	beforeEach(() => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.emulateMedia(MODES.light);
		cy.visit(WORKSHEET);
	});

	it("grades a choice, a blank and a match, then saves, restores, retries and clears", () => {
		// Answer: the right choice, a wrong blank, one match select.
		cy.get(".question[data-kind=choice]").first().within(() => {
			cy.get("input[type=radio]").each(($radio, index) => {
				if (index === 1) cy.wrap($radio).click({ force: true });
			});
		});
		cy.get(".question[data-kind=fill] input[type=text]").first().type("nonsense");
		cy.get(".question[data-kind=match] select").first().then(($select) => {
			cy.wrap($select).select($select.find("option").eq(1).val());
		});

		// Check: the results panel fills in with a tally.
		cy.contains("button", "See results").click();
		cy.get("[data-summary]").should("be.visible");
		cy.get("[data-tally]").first().invoke("text").should("match", /\d+ of \d+ correct/);
		cy.get(".question[data-kind=fill]").first().should("have.attr", "data-state", "wrong");

		// Save and restore: reload keeps every answer and shows the note.
		cy.reload();
		cy.get(".question[data-kind=fill] input[type=text]").first().should("have.value", "nonsense");
		cy.get(".question[data-kind=choice] input[type=radio]:checked").should("exist");
		cy.get(".question[data-kind=match] select").first().should("not.have.value", "");
		cy.get("[data-restore-note]").should("be.visible");

		// Retry: the missed questions are cleared and the right ones stay.
		cy.contains("button", "See results").click();
		cy.get("[data-retry]").should("be.visible").click();
		cy.get(".question[data-kind=fill] input[type=text]").first().should("have.value", "");

		// Clear: everything goes.
		cy.contains("button", "Clear my answers").click();
		cy.get("input[type=radio]:checked").should("not.exist");
		cy.get(".question[data-kind=match] select").first().should("have.value", "");
	});

	it("drops a bank entry onto a blank, and a lettered one onto a match item", () => {
		const drop = (chip, row) => {
			const data = new window.DataTransfer();
			cy.get(chip).first().trigger("dragstart", { dataTransfer: data });
			cy.get(row).first().trigger("dragover", { dataTransfer: data }).trigger("drop", { dataTransfer: data });
		};
		drop(".question[data-kind=fill] [data-word][draggable=true]", ".question[data-kind=fill] [data-drop]");
		cy.get(".question[data-kind=fill] [data-drop] input[type=text]").first().should("not.have.value", "");
		drop(".question[data-kind=match] [data-letter][draggable=true]", ".question[data-kind=match] [data-drop]");
		cy.get(".question[data-kind=match] [data-drop] select").first().should("not.have.value", "");
	});
});
