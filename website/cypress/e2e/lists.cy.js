import { MODES, VIEWPORTS } from "../support/config.js";

/** The list components keep their own styles in every form (data, slot, fallback): no bullets, and a card is a bordered, padded box. */
const frames = (Cypress.env("pages") || []).filter((url) => /^\/components\/frames\/(ui\/(card-list|link-list)|site\/nav-links)\//.test(url));

describe("lists", () => {
	frames.forEach((url) => {
		it(`${url} has no bullets, and cards keep their box`, () => {
			cy.viewport(...VIEWPORTS.desktop);
			cy.emulateMedia(MODES.light);
			cy.visit(url);
			cy.document().then((doc) => {
				const win = doc.defaultView;
				const bulleted = [...doc.querySelectorAll("main ul, main dl")].filter((list) => win.getComputedStyle(list).listStyleType !== "none" && list.tagName === "UL").map((list) => `${list.parentElement.className} > ul (${win.getComputedStyle(list).listStyleType})`);
				expect(bulleted, "lists that still show bullets").to.deep.equal([]);
				if (url.includes("/card-list/")) {
					const bare = [...doc.querySelectorAll("main li")].filter((item) => Number.parseFloat(win.getComputedStyle(item).borderTopWidth) === 0 || Number.parseFloat(win.getComputedStyle(item).paddingTop) < 4).length;
					expect(bare, "card items without a border and padding").to.equal(0);
				}
			});
		});
	});
});
