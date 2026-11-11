import { MODES, VIEWPORTS } from "../support/config.js";

/** Each callout type has its own edge and wash, different from the default and from each other. */
const MATRIX = "/components/frames/ui/callout/matrix/";
const DEFAULT = "/components/frames/ui/callout/default/";

["light", "dark"].forEach((mode) => {
	describe(`callout colors, ${mode}`, () => {
		it("gives success, warn and error their own edge and wash", () => {
			cy.viewport(...VIEWPORTS.desktop);
			cy.emulateMedia(MODES[mode]);
			cy.visit(DEFAULT);
			cy.document().then((fallback) => {
				cy.wrap(fallback.defaultView.getComputedStyle(fallback.querySelector(".callout")), { log: false }).then((style) => {
					cy.wrap(`${style.borderInlineStartColor} / ${style.backgroundColor}`, { log: false }).as("default");
				});
			});
			cy.visit(MATRIX);
			cy.document().then((doc) => {
				const win = doc.defaultView;
				const look = (selector) => {
					const el = doc.querySelector(selector);
					expect(el, selector).to.not.equal(null);
					const style = win.getComputedStyle(el);
					return `${style.borderInlineStartColor} / ${style.backgroundColor}`;
				};
				const looks = {
					default: undefined,
					success: look(".callout.success"),
					warn: look(".callout.warn"),
					error: look(".callout.error"),
				};
				cy.get("@default").then((standard) => {
					looks.default = standard;
					expect(new Set(Object.values(looks)).size, JSON.stringify(looks)).to.equal(4);
				});
			});
		});
	});
});
