import { MODES, REFLOW_WIDTH, TARGET_MIN, VIEWPORTS } from "../support/config.js";

/**
 * The syllabus's contents list: a labelled nav of the parts that render, a row of 44px links below 1100px and a sticky column from 1100px,
 * with the part on screen marked `aria-current="location"` as the page scrolls. The script only moves the mark; the list never changes size.
 */
const DEFAULT = "/components/frames/site/syllabus/default/";
const PLAIN = "/components/frames/site/syllabus/without-contents/";
const EXTRA = "/components/frames/site/syllabus/with-additional-outcomes/";
const NO_GRADING = "/components/frames/site/syllabus/without-grading/";
const style = (el) => el.ownerDocument.defaultView.getComputedStyle(el);
/** Scroll so a heading sits a little below the top of the viewport, well above the line the script marks from (30% down) and clear of the next heading. */
const showAt = (id) =>
	cy.get(id).then(($heading) => {
		const win = $heading[0].ownerDocument.defaultView;
		win.scrollTo(0, win.scrollY + $heading[0].getBoundingClientRect().top - win.innerHeight * 0.15);
	});
const current = () => cy.get("#syllabus .syllabus-contents a[aria-current]");

describe("syllabus contents list", () => {
	it("is a nav named Contents whose links are the syllabus's own headings, in order", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(DEFAULT);
		cy.get("#syllabus > nav.syllabus-contents").should("have.attr", "aria-labelledby", "syllabus-contents-label");
		cy.get("#syllabus-contents-label").should("have.text", "Contents");
		cy.get("#syllabus .syllabus-contents a").then(($links) => {
			const ids = [...$links].map((link) => link.getAttribute("href").slice(1));
			const headings = [...Cypress.$("#syllabus > article > h3[id]")].map((heading) => heading.id);
			expect(ids, "links match the headings").to.deep.equal(headings);
			expect(ids.length).to.be.greaterThan(3);
		});
	});

	it("lists a part the course adds, and leaves out a part it omits", () => {
		cy.visit(EXTRA);
		cy.get('#syllabus .syllabus-contents a[href="#additional-outcomes"]').should("have.text", "Additional outcomes");
		cy.visit(NO_GRADING);
		cy.get('#syllabus .syllabus-contents a[href="#coursework"], #syllabus .syllabus-contents a[href="#grading"]').should("not.exist");
		cy.get("#coursework, #grading").should("not.exist");
	});

	it("is left out when the syllabus opts out, and the document is one column", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(PLAIN);
		cy.get(".syllabus-contents").should("not.exist");
		cy.get("#syllabus").should(($section) => expect(style($section[0]).gridTemplateColumns.split(" ").length, "grid columns").to.equal(1));
	});

	[VIEWPORTS.desktop, VIEWPORTS.mobile, [REFLOW_WIDTH, 640]].forEach(([width, height]) => {
		it(`every link is a 44px target at ${width}px`, () => {
			cy.viewport(width, height);
			cy.emulateMedia(MODES.light);
			cy.visit(DEFAULT);
			cy.get("#syllabus .syllabus-contents a").each(($link) => {
				const box = $link[0].getBoundingClientRect();
				expect(Math.round(box.height), "height").to.be.at.least(TARGET_MIN);
				expect(Math.round(box.width), "width").to.be.at.least(TARGET_MIN);
			});
		});
	});

	it("is a plain row above the syllabus at 1100px and a sticky column beside it at 1101px", () => {
		cy.viewport(1100, 800);
		cy.visit(DEFAULT);
		cy.get(".syllabus-contents").should(($nav) => expect(style($nav[0]).position, "position at 1100px").to.equal("static"));
		cy.get(".syllabus-contents ol").should(($list) => expect(style($list[0]).flexDirection, "direction at 1100px").to.equal("row"));
		cy.get(".syllabus-contents").then(($nav) => {
			const first = Cypress.$("#syllabus > article")[0].getBoundingClientRect();
			expect($nav[0].getBoundingClientRect().bottom, "above the first part").to.be.at.most(first.top + 1);
		});
		cy.viewport(1101, 800);
		cy.get(".syllabus-contents").should(($nav) => expect(style($nav[0]).position, "position at 1101px").to.equal("sticky"));
		cy.get(".syllabus-contents").then(($nav) => {
			const first = Cypress.$("#syllabus > article")[0].getBoundingClientRect();
			expect($nav[0].getBoundingClientRect().right, "beside the first part").to.be.at.most(first.left + 1);
		});
	});

	it("stays beside the syllabus while it scrolls", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(DEFAULT);
		cy.scrollTo(0, 900);
		cy.get(".syllabus-contents").should(($nav) => {
			const box = $nav[0].getBoundingClientRect();
			expect(box.top, "in view").to.be.at.least(0);
			expect(box.top, "near the top").to.be.below(200);
		});
	});

	[VIEWPORTS.desktop, VIEWPORTS.mobile].forEach(([width, height]) => {
		it(`marks the part on screen as the page scrolls, at ${width}px`, () => {
			cy.viewport(width, height);
			cy.visit(DEFAULT);
			showAt("#outcomes");
			current().should("have.length", 1).and("have.attr", "href", "#outcomes").and("have.attr", "aria-current", "location");
			showAt("#technology");
			current().should("have.length", 1).and("have.attr", "href", "#technology");
			// The last part is marked once the page reaches its foot, though its heading cannot reach the top.
			cy.scrollTo("bottom");
			current().should("have.length", 1).and("have.attr", "href", "#key-dates");
			showAt("#outcomes");
			current().should("have.attr", "href", "#outcomes");
		});
	});

	it("does not move or resize the list when the mark moves", () => {
		cy.viewport(...VIEWPORTS.mobile);
		cy.visit(DEFAULT);
		let before;
		const measure = (doc) => ({
			sizes: [...doc.querySelectorAll("#syllabus .syllabus-contents a")].map((link) => `${Math.round(link.getBoundingClientRect().width)}x${Math.round(link.getBoundingClientRect().height)}`),
			height: Math.round(doc.querySelector(".syllabus-contents").getBoundingClientRect().height),
		});
		cy.document().then((doc) => {
			before = measure(doc);
		});
		showAt("#technology");
		current().should("have.attr", "href", "#technology");
		cy.document().then((doc) => expect(measure(doc), "link sizes and list height").to.deep.equal(before));
	});

	it("takes a link to its heading, which is not hidden under anything", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(DEFAULT);
		cy.get('.syllabus-contents a[href="#grading"]').click();
		cy.location("hash").should("eq", "#grading");
		cy.get("#grading").should(($heading) => {
			const top = $heading[0].getBoundingClientRect().top;
			expect(top, "heading in view").to.be.at.least(0);
			expect(top, "heading near the top").to.be.below(400);
		});
	});

	it("does not animate the scroll when motion is reduced", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.emulateMedia([...MODES.light, { name: "prefers-reduced-motion", value: "reduce" }]);
		cy.visit(DEFAULT);
		cy.get("html").should(($html) => expect(style($html[0]).scrollBehavior, "scroll behavior").to.equal("auto"));
	});

	it("is hidden in print", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(DEFAULT);
		cy.emulatePrint();
		cy.get(".syllabus-contents").should("not.be.visible");
	});

	it("has no sideways scroll at 320px", () => {
		cy.viewport(REFLOW_WIDTH, 640);
		cy.visit(DEFAULT);
		cy.checkReflow();
	});

	it("marks the current part with a visible edge in forced colors", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.emulateMedia(MODES["forced-colors"]);
		cy.visit(DEFAULT);
		current().should(($link) => {
			const computed = style($link[0]);
			expect(Number.parseFloat(computed.borderInlineStartWidth), "edge width").to.be.at.least(1);
			expect(computed.borderInlineStartStyle, "edge style").to.equal("solid");
		});
	});
});
