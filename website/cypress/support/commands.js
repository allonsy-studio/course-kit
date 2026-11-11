import "cypress-axe";

import { A11Y_TAGS } from "./config.js";
import { isKnown, isKnownTarget } from "./known.js";

/**
 * Emulate media features through the DevTools protocol (Chromium only).
 * `Cypress.automation` is undocumented: recheck on Cypress upgrades.
 */
Cypress.Commands.add("emulateMedia", (features) =>
	Cypress.automation("remote:debugger:protocol", {
		command: "Emulation.setEmulatedMedia",
		params: { features },
	}),
);

/** Emulate the print media type (Chromium only). */
Cypress.Commands.add("emulatePrint", () =>
	Cypress.automation("remote:debugger:protocol", {
		command: "Emulation.setEmulatedMedia",
		params: { media: "print", features: [{ name: "prefers-color-scheme", value: "light" }] },
	}),
);

/** Log each violation with every node that fails it, so a run says what to fix. */
function logViolations(violations) {
	cy.task("log", `${violations.length} accessibility violation${violations.length === 1 ? "" : "s"}`);
	cy.task(
		"log",
		violations
			.map(({ id, impact, nodes }) => {
				const where = nodes.slice(0, 8).map((node) => `    ${node.target.join(" ")} :: ${(node.any[0] ?? node.all[0] ?? node.none[0])?.message ?? ""}`);
				return `  ${id} (${impact}, ${nodes.length} node${nodes.length === 1 ? "" : "s"})\n${where.join("\n")}`;
			})
			.join("\n"),
	);
}

/**
 * Run axe (WCAG 2.2 AAA plus best practices) on the current page.
 *
 * @param {{ contrast?: boolean }} [options] `contrast: false` in forced colors,
 *   where axe measures the emulation, not what a reader sees
 */
Cypress.Commands.add("checkPageA11y", ({ contrast = true } = {}) => {
	let fresh = [];
	cy.injectAxe();
	cy.checkA11y(
		null,
		{
			runOnly: { type: "tag", values: A11Y_TAGS },
			rules: { "color-contrast": { enabled: contrast }, "color-contrast-enhanced": { enabled: contrast } },
		},
		(violations) => {
			fresh = violations.map((violation) => ({ ...violation, nodes: violation.nodes.filter((node) => !isKnown(violation.id, node.target.join(" "))) })).filter((violation) => violation.nodes.length);
			if (fresh.length) logViolations(fresh);
		},
		true,
	);
	cy.then(() => {
		expect(fresh.map(({ id, nodes }) => `${id} x${nodes.length}`), "accessibility violations").to.deep.equal([]);
	});
});

/** The page fits its viewport: nothing makes it scroll sideways (WCAG 1.4.10). */
Cypress.Commands.add("checkReflow", (known = false) => {
	if (known) return;
	// Retried, so a page that is still laying out (fonts, a script) is judged when it settles.
	cy.document().should((doc) => {
		expect(doc.scrollingElement.scrollWidth, "page width").to.be.at.most(doc.defaultView.innerWidth);
	});
});

/** Whether an element, or the control that draws its focus, shows a focus indicator of 2px or more (WCAG 2.4.13). */
function hasVisibleFocus(win, el) {
	const candidates = [el, el.closest("label"), el.parentElement, el.closest("[role=tab], .switch-option")].filter(Boolean);
	return candidates.some((node) => {
		const style = win.getComputedStyle(node);
		const outlined = style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) >= 2;
		return outlined || (style.boxShadow !== "none" && style.boxShadow !== "");
	});
}

/** The controls a keyboard user reaches: visible, enabled, in the tab order. */
const FOCUSABLE = "a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex='-1'])";

/**
 * Press Tab through a page. Every control inside `scope` is reached, and every focused element shows a focus indicator.
 * A radio group is one stop, so reaching any radio of a group counts for the group.
 * @param {string} [scope] a selector for the part of the page to check
 */
Cypress.Commands.add("checkKeyboard", (scope = "body") => {
	cy.document().then((doc) => {
		const win = doc.defaultView;
		const visible = (el) => {
			const rect = el.getBoundingClientRect();
			const style = win.getComputedStyle(el);
			// A control inside a closed disclosure is reached by opening it; a roving-tabindex control by the arrow keys.
			const collapsed = el.matches("summary") ? el.parentElement.closest("details:not([open])") : el.closest("details:not([open])");
			const shown = rect.width > 0 || el.type === "radio" || el.type === "checkbox";
			return shown && !collapsed && style.visibility !== "hidden" && !el.disabled && el.getAttribute("tabindex") !== "-1" && !el.closest("[hidden], [inert]");
		};
		const wanted = [...doc.querySelectorAll(scope)].flatMap((root) => [...root.querySelectorAll(FOCUSABLE)]).filter(visible);
		const stops = new Set();
		const reached = new Set();
		const key = (el) => (el.type === "radio" && el.name ? `radio:${el.name}` : el);
		const total = wanted.length * 2 + 6;
		// Start just before the part under test, so Tab walks it and not the page's chrome first.
		const start = doc.querySelector(scope);
		if (start) {
			start.setAttribute("tabindex", "-1");
			start.focus();
		}
		const step = (n) => {
			if (n >= total) return;
			cy.press(Cypress.Keyboard.Keys.TAB).then(() => {
				const active = doc.activeElement;
				if (active && active !== doc.body) {
					reached.add(key(active));
					if (wanted.includes(active) || (active.type === "radio" && wanted.some((el) => key(el) === key(active)))) {
						expect(hasVisibleFocus(win, active), `focus indicator on ${active.tagName.toLowerCase()}${active.id ? `#${active.id}` : ""}`).to.equal(true);
					}
				}
				step(n + 1);
			});
		};
		step(0);
		cy.then(() => {
			const missed = wanted.filter((el) => !reached.has(key(el)) && !stops.has(el));
			expect(missed.map((el) => el.outerHTML.slice(0, 80)), "controls Tab never reached").to.deep.equal([]);
		});
	});
});

/** Every operable target in component UI is at least `min` CSS px each way (WCAG 2.5.5). Inline links in running text are exempt. */
Cypress.Commands.add("checkTargetSize", (min, scope = "body", url = "") => {
	cy.document().then((doc) => {
		const win = doc.defaultView;
		const inline = (el) => {
			if (el.tagName !== "A") return false;
			const parent = el.parentElement;
			if (!parent || /^(NAV|LI|TD|TH|DT|DD)$/.test(parent.tagName) && parent.children.length === 1 && !parent.textContent.replace(el.textContent, "").trim()) return false;
			return [...parent.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
		};
		const targets = [...doc.querySelectorAll(scope)].flatMap((root) => [...root.querySelectorAll("a[href], button, select, textarea, summary, input:not([type=hidden])")]);
		const small = targets
			.filter((el) => !el.disabled && !el.closest("[hidden]") && win.getComputedStyle(el).visibility !== "hidden" && !inline(el))
			.map((el) => {
				// A radio or checkbox is operated through its label.
				const box = (el.type === "radio" || el.type === "checkbox") && el.closest("label") ? el.closest("label") : el;
				const { width, height } = box.getBoundingClientRect();
				return { el: box, width, height };
			})
			.filter(({ width, height }) => width > 0 && height > 0 && (width < min - 0.5 || height < min - 0.5))
			.map(({ el, width, height }) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : ""} ${Math.round(width)}x${Math.round(height)}: ${el.textContent.trim().slice(0, 30)}`)
			.filter((entry) => !isKnownTarget(url, entry));
		expect(small, `targets under ${min}x${min}`).to.deep.equal([]);
	});
});
