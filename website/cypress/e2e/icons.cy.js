import { MODES, VIEWPORTS } from "../support/config.js";

/** An icon inside a control or a line of text is never stretched: no svg in a link, button, summary or label renders larger than 2.5em, or loses its `fill="none"`. */
const pages = (Cypress.env("pages") || []).filter((url) => url.startsWith("/components/frames/"));

describe("icons", () => {
	pages.forEach((url) => {
		it(`${url} keeps its icons their size`, () => {
			cy.viewport(...VIEWPORTS.desktop);
			cy.emulateMedia(MODES.light);
			cy.visit(url);
			cy.document().then((doc) => {
				const win = doc.defaultView;
				const stretched = [...doc.querySelectorAll("a svg, button svg, summary svg, label svg")]
					.map((svg) => {
						const box = svg.getBoundingClientRect();
						const limit = 2.5 * Number.parseFloat(win.getComputedStyle(svg).fontSize);
						const filled = svg.getAttribute("fill") === "none" && win.getComputedStyle(svg).fill !== "none";
						return { svg, box, limit, filled };
					})
					.filter(({ box, limit, filled }) => box.width > limit + 0.5 || box.height > limit + 0.5 || filled)
					.map(({ svg, box, filled }) => `${svg.parentElement.tagName.toLowerCase()} > svg ${Math.round(box.width)}x${Math.round(box.height)}${filled ? " (filled)" : ""}`);
				expect(stretched, "icons larger than 2.5em or filled").to.deep.equal([]);
			});
		});
	});
});
