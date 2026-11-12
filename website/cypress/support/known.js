/**
 * Violations the audit knows about and has not fixed. Each is a decision for a person, not a gap in the check: it names the rule,
 * a pattern for the element, and why it stays. `checkPageA11y` skips exactly these, so any other violation fails the build; delete an entry
 * when its cause is fixed.
 */
export const KNOWN = [
	// The selected pill of the glossary and group switches.
	{ rule: "color-contrast-enhanced", match: /^(#glossary-tab-review|\.switch-track > label)/, reason: "The selected option is transparent over a sliding ::before pill (anchor positioning), which axe cannot read, so it samples the page behind the white text. The pill is --color-accent under --color-on-accent (10.91:1 light, 7.82:1 dark); without anchor positioning the option itself carries that fill. Filling the option too would show the destination filled before the pill arrives." },
];

/** Whether a failing node is a known violation of `rule`. */
export const isKnown = (rule, target) => KNOWN.some((entry) => entry.rule === rule && entry.match.test(target.replace(/:nth-child\(\d+\)/g, "")));

/**
 * Targets under 44px that the audit knows about, each with the reason it stays. Inline links in running text are exempt in the check itself.
 */
export const KNOWN_TARGETS = [
	{ match: /^button\.term \d+x\d+: /, reason: "Worksheet term buttons sit inside a sentence of terms: the inline-in-text exception of WCAG 2.5.5 applies." },
	{ match: /^a \d+x\d+: Week \d+ · /, reason: "Glossary slide links share a wrapping row with a gap between them (several per line), so they keep the 24px bar of WCAG 2.5.8 rather than 44px." },
	{ match: /^a \d+x\d+: Open in CodePen/, reason: "CodePen's own embed script writes this link; it is not the kit's markup." },
];

/** Whether a measured target (`tag.class WxH: text`) is a known small one. */
export const isKnownTarget = (url, entry) => KNOWN_TARGETS.some((known) => known.match.test(entry));

/** Pages that scroll sideways at 320px; each needs a layout decision (a table that clips, a menu row that does not wrap). */
export const KNOWN_REFLOW = [
	{ url: "/components/frames/site/course-summary/default/", reason: "The instructor card and summary grid overflow 320px." },
	{ url: "/components/frames/site/instructor/default/", reason: "The instructor card (photo, facts and links) is wider than 320px." },
	{ url: "/components/frames/ui/table-rubric/milestones/", reason: "The milestone table is wider than 320px; it clips rather than scrolls." },
	{ url: "/components/frames/ui/table-rubric/levels/", reason: "The levels matrix is wider than 320px; it clips rather than scrolls." },
];
