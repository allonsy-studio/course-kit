import { MODES, TARGET_MIN, VIEWPORTS } from "../support/config.js";

/** Layout details of the kit's own pages that a reader of any kind depends on: the source order of the document layout, the footer link's name, the hero menu. */
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

	it("shows the contents beside the page on a wide screen and above it on a narrow one", () => {
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
			expect($rail[0].getBoundingClientRect().bottom, "rail above the page").to.be.at.most(page.top + 1);
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

describe("the hero menu", () => {
	const SIX = "/components/frames/site/nav-links/hero-menu/";
	const EIGHT = "/components/frames/site/nav-links/hero-menu-eight-pages/";

	it("stacks up to six links in one column", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(SIX);
		cy.get("nav[data-context=hero] li").then(($items) => {
			const lefts = new Set([...$items].map((item) => Math.round(item.getBoundingClientRect().left)));
			expect(lefts.size, "columns").to.equal(1);
		});
	});

	it("folds more than six into two columns, down the first and then the second, each link a 44px target", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.emulateMedia(MODES.light);
		cy.visit(EIGHT);
		cy.get("nav[data-context=hero] li").then(($items) => {
			const boxes = [...$items].map((item) => item.getBoundingClientRect());
			expect(new Set(boxes.map((box) => Math.round(box.left))).size, "columns").to.equal(2);
			expect(boxes[1].top, "second under first").to.be.greaterThan(boxes[0].top);
			expect(Math.round(boxes[4].left), "the fifth starts the second column").to.be.greaterThan(Math.round(boxes[3].left));
			expect(Math.round(boxes[4].top), "at the top").to.equal(Math.round(boxes[0].top));
		});
		cy.get("nav[data-context=hero] a").each(($link) => expect($link[0].getBoundingClientRect().height, "height").to.be.at.least(TARGET_MIN));
	});

	it("is a wrapping row on a phone, however many links", () => {
		cy.viewport(...VIEWPORTS.mobile);
		cy.visit(EIGHT);
		cy.get("nav[data-context=hero] ul").should(($list) => expect(style($list[0]).display, "display").to.equal("flex"));
		cy.checkReflow();
	});
});
