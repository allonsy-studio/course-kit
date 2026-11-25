import { TARGET_MIN, VIEWPORTS } from "../support/config.js";

/** Layout details of the kit's own pages that a reader of any kind depends on: the source order of the document layout, the footer link's name. */
/** `Node.DOCUMENT_POSITION_FOLLOWING`: the other node comes later in the document. */
const FOLLOWING = 4;
const style = (el) => el.ownerDocument.defaultView.getComputedStyle(el);

describe("the document layout", () => {
	const DOCUMENT = "/components/examples/document/";

	it("puts the page's h1 before its contents list in the source", () => {
		cy.visit(DOCUMENT);
		cy.get("main").then(($main) => {
			const h1 = $main.find("h1")[0];
			const nav = $main.find(".doc-contents nav")[0];
			expect(h1.compareDocumentPosition(nav) & FOLLOWING, "the nav follows the h1").to.be.greaterThan(0);
		});
	});

	it("shows the contents beside the page on a wide screen and after it on a narrow one", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(DOCUMENT);
		cy.get(".doc-contents").then(($rail) => {
			const page = Cypress.$(".doc-layout > .content-column")[0].getBoundingClientRect();
			const rail = $rail[0].getBoundingClientRect();
			expect(rail.right, "rail left of the page").to.be.at.most(page.left + 1);
		});
		cy.viewport(...VIEWPORTS.mobile);
		cy.get(".doc-contents").then(($rail) => {
			const page = Cypress.$(".doc-layout > .content-column")[0].getBoundingClientRect();
			expect($rail[0].getBoundingClientRect().top, "contents after the page").to.be.at.least(page.bottom - 1);
		});
	});
});

describe("the footer's course name", () => {
	it("is one run of text for a reader: no break between the code, the colon and the name", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit("/components/examples/home/");
		cy.get("footer .course a").then(($link) => {
			expect($link[0].textContent.replace(/\s+/g, " ").trim(), "accessible name").to.equal("CS101: Introduction to Web Publishing");
			expect($link[0].innerText, "rendered text").to.not.match(/\n/);
			expect(style($link[0]).display, "display").to.equal("inline-block");
			expect($link[0].getBoundingClientRect().height, "target height").to.be.at.least(TARGET_MIN);
		});
	});
});
