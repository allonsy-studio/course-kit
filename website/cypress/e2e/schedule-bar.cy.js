import { MODES, REFLOW_WIDTH, TARGET_MIN, VIEWPORTS } from "../support/config.js";

/**
 * The schedule's sticky row: one link per month with the Hide past weeks toggle at its end. The month on screen is underlined and
 * `aria-current="location"` as the page scrolls; the row stays pinned from 40em wide; an anchor lands below it.
 */
const FRAME = "/components/frames/site/schedule-overview/sticky-row/";
const style = (el) => el.ownerDocument.defaultView.getComputedStyle(el);
const current = () => cy.get(".schedule-jump a[aria-current]");

/** The sample term is in 2020, so every week is past whenever this runs and the toggle always has something to hide. */
const visit = (width = 1280, height = 800) => {
	cy.viewport(width, height);
	cy.emulateMedia(MODES.light);
	cy.visit(FRAME);
};

/** Scroll so a week's block is a little below the row, clear of the next one. */
const showWeek = (n) =>
	cy.get(`#week-${n}`).then(($week) => {
		const win = $week[0].ownerDocument.defaultView;
		const bar = win.document.querySelector("[data-schedule-bar]").getBoundingClientRect();
		win.scrollTo(0, win.scrollY + $week[0].getBoundingClientRect().top - Math.max(0, bar.bottom) - 20);
	});

describe("the schedule's row of months", () => {
	it("has no Today link, one link per month and the toggle in the same row", () => {
		visit();
		cy.get("[data-schedule-bar] .today-link, [data-schedule-bar] today-link").should("not.exist");
		cy.get(".schedule-jump a").then(($links) => expect([...$links].map((link) => link.textContent.trim())).to.deep.equal(["August", "September", "October", "November", "December"]));
		cy.get("[data-hide-past]").should("be.visible");
		cy.get("[data-schedule-bar]").then(($bar) => {
			const bar = $bar[0].getBoundingClientRect();
			const button = Cypress.$("[data-hide-past]")[0].getBoundingClientRect();
			const first = Cypress.$(".schedule-jump a")[0].getBoundingClientRect();
			expect(button.top, "the button is inside the row").to.be.at.least(bar.top);
			expect(button.bottom, "the button is inside the row").to.be.at.most(bar.bottom + 1);
			expect(Math.abs(button.top + button.height / 2 - (first.top + first.height / 2)), "the button and the first month share a line").to.be.below(first.height);
			expect(button.right, "the toggle is at the inline end").to.be.greaterThan(first.right);
		});
	});

	it("keeps every month link and the toggle a 44px target", () => {
		visit();
		cy.get("[data-schedule-bar] a, [data-hide-past]").each(($el) => {
			const box = $el[0].getBoundingClientRect();
			expect(Math.round(box.height), "height").to.be.at.least(TARGET_MIN);
			expect(Math.round(box.width), "width").to.be.at.least(TARGET_MIN);
		});
	});

	it("underlines and marks the month on screen as the page scrolls, and nothing moves when it does", () => {
		visit();
		current().should("have.length", 1).and("contain.text", "August").and("have.attr", "aria-current", "location");
		let before;
		cy.get("[data-schedule-bar]").then(($bar) => {
			before = Math.round($bar[0].getBoundingClientRect().height);
		});
		showWeek(9);
		current().should("have.length", 1).and("contain.text", "October");
		current().should(($link) => {
			expect(style($link[0]).textDecorationLine, "underline").to.contain("underline");
			expect(Number.parseFloat(style($link[0]).textDecorationThickness), "thick").to.be.greaterThan(2);
		});
		cy.get("[data-schedule-bar]").should(($bar) => expect(Math.round($bar[0].getBoundingClientRect().height), "row height").to.equal(before));
		showWeek(15);
		current().should("contain.text", "December");
		cy.scrollTo("bottom");
		current().should("contain.text", "December");
		cy.scrollTo("top");
		current().should("contain.text", "August");
	});

	it("stays pinned to the top while the weeks scroll", () => {
		visit();
		cy.scrollTo(0, 3000);
		cy.get("[data-schedule-bar]").should(($bar) => {
			expect(style($bar[0]).position, "position").to.equal("sticky");
			expect(Math.round($bar[0].getBoundingClientRect().top), "top").to.be.within(0, 1);
			expect(style($bar[0]).backgroundColor, "a solid ground").to.not.equal("rgba(0, 0, 0, 0)");
		});
	});

	it("takes a month link to its week, which lands below the row", () => {
		visit();
		cy.get(".schedule-jump a", { timeout: 4000 }).contains("November").click();
		cy.location("hash").should("match", /^#week-\d+$/);
		cy.get("[data-schedule-bar]").then(($bar) => {
			const bottom = $bar[0].getBoundingClientRect().bottom;
			cy.location("hash").then((hash) => {
				cy.get(hash).should(($week) => expect($week[0].getBoundingClientRect().top, "the week starts below the row").to.be.at.least(bottom - 1));
			});
		});
		current().should("contain.text", "November");
	});

	it("moves the scroll padding with the row, and keeps a focused control out from under it", () => {
		visit();
		cy.get("html").should(($html) => expect(Number.parseFloat(style($html[0]).scrollPaddingTop), "scroll padding").to.be.at.least(Math.ceil(Cypress.$("[data-schedule-bar]")[0].getBoundingClientRect().height)));
	});

	it("hides the past weeks with the toggle in the row, and says how many", () => {
		visit();
		cy.get("[data-hide-past]").should("have.attr", "aria-pressed", "false");
		cy.get("[data-schedule-status]").should("contain.text", "15");
		cy.get("[data-hide-past]").click().should("have.attr", "aria-pressed", "true");
		cy.get("[data-schedule-status]").should("contain.text", "hidden");
		cy.get(".week[data-past]").each(($week) => expect($week[0].hidden, "a past week is hidden").to.equal(true));
		cy.get("[data-hide-past]").click().should("have.attr", "aria-pressed", "false");
		cy.get(".week[data-past]").each(($week) => expect($week[0].hidden).to.equal(false));
	});

	it("is a plain row on a phone, not sticky, and still announces the count", () => {
		visit(...VIEWPORTS.mobile);
		cy.get("[data-schedule-bar]").should(($bar) => expect(style($bar[0]).position).to.equal("static"));
		cy.get("[data-schedule-status]").should(($status) => {
			expect($status.attr("role")).to.equal("status");
			expect($status[0].getBoundingClientRect().width, "visually hidden").to.be.at.most(1);
			expect($status.text().trim(), "announced").to.not.equal("");
		});
		cy.checkReflow();
	});

	it("reflows at 320px", () => {
		visit(REFLOW_WIDTH, 640);
		cy.checkReflow();
		cy.get("[data-schedule-bar]").then(($bar) => expect($bar[0].getBoundingClientRect().height, "the row at 320px, static").to.be.greaterThan(0));
	});

	it("is hidden in print", () => {
		visit();
		cy.emulatePrint();
		cy.get("[data-schedule-bar]").should("not.be.visible");
	});

	it("marks the month with a system color in forced colors", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.emulateMedia(MODES["forced-colors"]);
		cy.visit(FRAME);
		current().should(($link) => expect(style($link[0]).textDecorationLine).to.contain("underline"));
	});
});
