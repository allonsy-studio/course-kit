import { MODES, TARGET_MIN, VIEWPORTS } from "../support/config.js";

/**
 * The instructor's icon links (`contactLinks: "icons"`): each is a named 44px target around a 24px icon, shows a focus ring, keeps the address obfuscated
 * until the script decodes it, and prints as text with no icon.
 */
const ALL = "/components/frames/site/instructor/icon-links-all/";
const EMAIL_ONLY = "/components/frames/site/instructor/icon-links/";
const LONG = "/components/frames/site/instructor/icon-links-long-address/";
const ROWS = "/components/frames/site/instructor/default/";
/** An element's computed style, in the frame's own window. */
const style = (el) => el.ownerDocument.defaultView.getComputedStyle(el);
const FRAMES = [EMAIL_ONLY, ALL, "/components/frames/site/instructor/icon-links-photo/", "/components/frames/site/instructor/icon-links-all-no-photo/", "/components/frames/site/instructor/icon-links-message/", "/components/frames/site/instructor/icon-links-blog/", LONG];

describe("instructor icon links", () => {
	FRAMES.forEach((url) => {
		describe(url, () => {
			beforeEach(() => {
				cy.viewport(...VIEWPORTS.desktop);
				cy.emulateMedia(MODES.light);
				cy.visit(url);
			});

			it("names every link, sizes it as a target and keeps the icon at 24px", () => {
				cy.get("#instructor .icon-link").should("have.length.at.least", 1).each(($link) => {
					expect($link.attr("aria-label"), "an accessible name from aria-label").to.match(/\S/);
					const box = $link[0].getBoundingClientRect();
					expect(Math.round(box.width), "width").to.equal(TARGET_MIN);
					expect(Math.round(box.height), "height").to.equal(TARGET_MIN);
					const svg = $link.find("svg")[0];
					expect(svg.getAttribute("aria-hidden"), "the icon is decorative").to.equal("true");
					const icon = svg.getBoundingClientRect();
					expect(Math.round(icon.width), "icon width").to.equal(24);
					expect(Math.round(icon.height), "icon height").to.equal(24);
					expect(Math.abs(icon.top - box.top - (box.bottom - icon.bottom)), "icon centered vertically").to.be.at.most(1);
					expect(Math.abs(icon.left - box.left - (box.right - icon.right)), "icon centered horizontally").to.be.at.most(1);
				});
			});

			it("shows a focus ring of 2px or more on each link", () => {
				cy.get("#instructor .icon-link").each(($link) => {
					cy.wrap($link).focus();
					cy.wrap($link).then(($focused) => {
						const computed = style($focused[0]);
						expect(Number.parseFloat(computed.outlineWidth), "outline width").to.be.at.least(2);
						expect(computed.outlineStyle, "outline style").to.not.equal("none");
					});
				});
			});

			it("is found by text: the clipped label holds the address, the message or the host", () => {
				cy.get("#instructor .icon-link .link-text").each(($text) => expect($text.text().trim(), "text behind the icon").to.match(/\S/));
			});
		});
	});

	it("decodes the address into a mailto link, wrapping at its dots", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(LONG);
		cy.get("#instructor a[data-email]").should("have.attr", "href").and("match", /^mailto:samantha\.the\.very\.long\./);
		cy.get("#instructor a[data-email] [data-email-text] wbr").should("have.length.greaterThan", 3);
		cy.get("#instructor a[data-email] svg").should("have.length", 1);
		cy.get("#instructor a[data-email] [data-email-text]").invoke("text").should("equal", "samantha.the.very.long.example.address@mail.department.example-university.edu");
	});

	it("keeps the rows version free of icon links", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(ROWS);
		cy.get("#instructor .icon-link").should("not.exist");
		cy.get("#instructor dl a[data-email]").should("exist");
	});

	it("prints the address and the host as text, with no icon and no message link beside the address", () => {
		cy.viewport(...VIEWPORTS.desktop);
		cy.visit(ALL);
		cy.get("#instructor a[data-email] [data-email-text]").should("not.be.empty");
		cy.emulatePrint();
		cy.get("#instructor .icon-link svg").each(($svg) => expect(style($svg[0]).display, "icon in print").to.equal("none"));
		cy.get("#instructor .photo").should("not.be.visible");
		cy.get("#instructor .link-text").then(($texts) => {
			const shown = [...$texts].filter((text) => style(text).display !== "none" && text.closest("li") && style(text.closest("li")).display !== "none");
			const words = shown.map((text) => text.textContent.trim());
			expect(words, "text shown in print").to.deep.equal(["sam.example@example.edu", "sam.example.edu/blog"]);
			shown.forEach((text) => {
				const box = text.getBoundingClientRect();
				expect(box.width, "printed text is not clipped").to.be.greaterThan(20);
			});
		});
	});

	it("reflows at 320px, long address included", () => {
		cy.viewport(320, 640);
		cy.visit(LONG);
		cy.checkReflow();
		cy.emulatePrint();
		cy.checkReflow();
	});
});
