import { KNOWN_REFLOW } from "../support/known.js";
import { A11Y_MODES, MODES, REFLOW_WIDTH, VIEWPORTS } from "../support/config.js";

/** axe-core (WCAG 2.2 AAA plus best practices) against every built page, in light, dark & forced-colors, at the desktop and mobile widths. */
const pages = Cypress.env("pages") || [];

describe("accessibility", () => {
	pages.forEach((url) => {
		describe(url, () => {
			Object.entries(VIEWPORTS).forEach(([name, [width, height]]) => {
				A11Y_MODES.forEach((mode) => {
					it(`${name}, ${mode}`, () => {
						cy.viewport(width, height);
						cy.emulateMedia(MODES[mode]);
						cy.visit(url);
						cy.checkPageA11y({ contrast: mode !== "forced-colors" });
					});
				});
			});

			it(`reflows at ${REFLOW_WIDTH}px with no sideways scroll`, () => {
				cy.viewport(REFLOW_WIDTH, 640);
				cy.emulateMedia(MODES.light);
				cy.visit(url);
				cy.checkReflow(KNOWN_REFLOW.some((known) => known.url === url));
			});
		});
	});
});
