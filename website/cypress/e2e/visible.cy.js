import { MODES, VIEWPORTS } from "../support/config.js";

/**
 * A story's frame shows the component, or it is documentation that shows nothing. A frame with an empty body, or only display:none
 * content, fails unless its story says it is meant to be empty (`empty: "reason"`, rendered as `<template data-story-empty>`).
 */
const pages = (Cypress.env("pages") || []).filter((url) => url.startsWith("/components/frames/"));
const REPLACED = new Set(["IMG", "SVG", "INPUT", "SELECT", "TEXTAREA", "BUTTON", "CANVAS", "VIDEO", "IFRAME", "HR", "METER", "PROGRESS"]);

describe("every story frame shows something", () => {
	pages.forEach((url) => {
		it(url, () => {
			cy.viewport(...VIEWPORTS.desktop);
			cy.emulateMedia(MODES.light);
			cy.visit(url);
			cy.document().then((doc) => {
				if (doc.querySelector("[data-story-empty]")) return;
				const win = doc.defaultView;
				const visible = [...doc.querySelectorAll("main *")].filter((el) => {
					if (el.closest("template, script, style, h1.sr-only")) return false;
					const style = win.getComputedStyle(el);
					const box = el.getBoundingClientRect();
					if (style.display === "none" || style.visibility === "hidden" || box.width === 0 || box.height === 0) return false;
					const ownText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
					return ownText || REPLACED.has(el.tagName.toUpperCase());
				});
				expect(visible.length, `${url} renders no visible text or control; give the story the page context it needs, or mark it \`empty\``).to.be.greaterThan(0);
			});
		});
	});
});
