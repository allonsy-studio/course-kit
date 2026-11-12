/**
 * Violations the audit knows about and has not fixed. Each is a decision for a person, not a gap in the check: it names the rule,
 * a pattern for the element, and why it stays. `checkPageA11y` skips exactly these, so any other violation fails the build; delete an entry
 * when its cause is fixed.
 */
export const KNOWN = [
	// The preview's own chrome and the landing page come from the Norn design system, not the kit.
	// The selected pill of the glossary and group switches.
	{ rule: "color-contrast-enhanced", match: /^(#glossary-tab-review|\.switch-track > label)/, reason: "The selected option is transparent over a sliding ::before pill (anchor positioning), which axe cannot read, so it samples the page behind the white text. The pill is --color-accent under --color-on-accent (10.91:1 light, 7.82:1 dark); without anchor positioning the option itself carries that fill. Filling the option too would show the destination filled before the pill arrives." },
	// A story renders one component alone, without the page around it.
	{ rule: "dlitem", match: /^(dt|dd)$/, reason: "glossary-entry and demo-weeks are parts of a <dl> on their pages; their stories show them alone." },
	{ rule: "heading-order", match: /^(#(week-\d+-heading|introduction-to-web-publishing)|h3|h4|li > h4)$/, reason: "A story has no h2 above the component's own heading." },
	{ rule: "landmark-unique", match: /section$/, reason: "The week-block matrix shows several weeks side by side, each named the same." },
	{ rule: "listitem", match: /^li$/, reason: "meeting-card is an <li> that its page wraps in a list; its story shows it alone." },
];

/** Whether a failing node is a known violation of `rule`. */
export const isKnown = (rule, target) => KNOWN.some((entry) => entry.rule === rule && entry.match.test(target.replace(/:nth-child\(\d+\)/g, "")));

/**
 * Targets under 44px that the audit knows about. Each is a standalone link or disclosure in a list (a footer, a link list, a policy
 * summary) that needs a design decision: padding every row to 44px changes the density of the page. Inline links in running text are
 * exempt in the check itself.
 */
export const KNOWN_TARGETS = [
	{ match: /^a(\.\w+)? \d+x\d+: /, reason: "Standalone links in lists (assigned items, link lists, footer, readings, glossary slide links, instructor email) are text-height." },
	{ match: /^summary \d+x\d+: /, reason: "Disclosure summaries (policies, Show the answer) are text-height." },
	{ match: /^button\.term \d+x\d+: /, reason: "Worksheet term buttons are inline in a sentence of terms." },
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
