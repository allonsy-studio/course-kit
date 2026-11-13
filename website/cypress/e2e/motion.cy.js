import { MODES, VIEWPORTS } from "../support/config.js";

/** With prefers-reduced-motion: reduce, no element animates or transitions for longer than the 0.01ms the base styles allow (WCAG 2.3.3). */
const PAGES = [
	"/components/frames/site/glossary-panel/default/",
	"/components/frames/ui/code-block/default/",
	"/components/frames/site/schedule-weeks/default/",
	"/components/frames/practice/practice-worksheet/default/",
	"/components/components/ui/arrow-link/",
];
const MAX_SECONDS = 0.00001 + 1e-9;

const seconds = (list) => list.split(",").map((value) => (value.trim().endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value)));

describe("reduced motion", () => {
	PAGES.forEach((url) => {
		it(`${url} has no transition or animation`, () => {
			cy.viewport(...VIEWPORTS.desktop);
			cy.emulateMedia([...MODES.light, { name: "prefers-reduced-motion", value: "reduce" }]);
			cy.visit(url);
			cy.document().then((doc) => {
				const win = doc.defaultView;
				const slow = [...doc.querySelectorAll("*")]
					.filter((el) => {
						const style = win.getComputedStyle(el);
						return [style.transitionDuration, style.animationDuration].some((value) => seconds(value).some((duration) => duration > MAX_SECONDS));
					})
					.map((el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : ""}`);
				expect(slow, "elements that still move").to.deep.equal([]);
			});
		});
	});
});
