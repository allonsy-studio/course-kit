import { A11Y_MODES, MODES, VIEWPORTS } from "../support/config.js";

/**
 * The components that change after load, scanned in the state a reader leaves them in: axe in light, dark & forced-colors at the
 * desktop and mobile widths, then the keyboard (Tab reaches every control, each with a visible focus indicator).
 */
const WORKSHEET = "/components/frames/practice/practice-worksheet/default/";
const GLOSSARY = "/components/frames/site/glossary-panel/default/";
const SCHEDULE = "/components/frames/site/schedule-weeks/default/";
const CODE = "/components/frames/ui/code-block/default/";
const CANVAS = "/components/components/ui/arrow-link/";

/** Visit `url` and run `arrange` in each viewport and mode, then axe. */
function scanStates(name, url, arrange) {
	describe(name, () => {
		Object.entries(VIEWPORTS).forEach(([view, [width, height]]) => {
			A11Y_MODES.forEach((mode) => {
				it(`${view}, ${mode}`, () => {
					cy.viewport(width, height);
					cy.emulateMedia(MODES[mode]);
					cy.visit(url);
					arrange();
					cy.checkPageA11y({ contrast: mode !== "forced-colors" });
				});
			});
		});
	});
}

describe("interactive states", () => {
	scanStates("worksheet after See results", WORKSHEET, () => {
		cy.get("[data-worksheet] input[type=radio]").first().click({ force: true });
		cy.contains("button", "See results").click();
		cy.get("[data-results], [data-worksheet] [role=status]").should("exist");
	});

	scanStates("worksheet with a restored answer", WORKSHEET, () => {
		cy.get("[data-worksheet] input[type=radio]").first().click({ force: true });
		cy.reload();
		cy.get("[data-worksheet] input[type=radio]:checked").should("exist");
	});

	scanStates("glossary with a filter applied", GLOSSARY, () => {
		cy.get("input[type=search]").type("a");
		cy.contains("summary", "Filter by").click();
		cy.get(".chip").first().click();
	});

	["az", "test", "chapter", "meeting"].forEach((by) => {
		scanStates(`glossary grouped by ${by}`, GLOSSARY, () => {
			cy.get(`input[name=glossary-by][value=${by}]`).check({ force: true });
		});
	});

	scanStates("glossary Flashcards tab", GLOSSARY, () => {
		cy.get("[data-mode=study]").click();
		cy.get("#glossary-panel-study").should("be.visible");
	});

	scanStates("schedule with Hide past weeks pressed", SCHEDULE, () => {
		cy.get("body").then(($body) => {
			if ($body.find("[data-hide-past]:visible").length) cy.get("[data-hide-past]").click().should("have.attr", "aria-pressed", "true");
		});
	});

	scanStates("code block with its copy button", CODE, () => {
		cy.get(".code-copy").first().focus();
	});

	scanStates("preview canvas with its segmented controls", CANVAS, () => {
		cy.get("norn-segmented-control input[value=dark]").first().check({ force: true });
	});
});

describe("keyboard", () => {
	[
		["worksheet", WORKSHEET, "[data-worksheet]"],
		["glossary", GLOSSARY, "main"],
		["schedule", SCHEDULE, "main"],
		["code block", CODE, "main"],
		["preview canvas", CANVAS, "[data-canvas]"],
	].forEach(([name, url, scope]) => {
		it(`Tab reaches every control in the ${name}, each with a visible focus indicator`, () => {
			cy.viewport(...VIEWPORTS.desktop);
			cy.emulateMedia(MODES.light);
			cy.visit(url);
			cy.checkKeyboard(scope);
		});
	});
});
