export default { title: "Building blocks/today-link" };

/** The link shows once the page has a `#today` target, which `<today-marker>` picks. The frame supplies one. */
export const Default = {
	args: { label: "Today" },
	note: "The page has a <code>#today</code> element below, so the Today link shows.",
	wrap: '{story}\n<section id="today" style="margin-block-start: 1rem; padding: 1rem; border: 1px solid var(--color-border)"><h2 style="margin: 0 0 0.25rem">Tuesday, September 1</h2><p style="margin: 0">The class meeting the link jumps to.</p></section>',
};

/** With no `#today` on the page the link is absent on purpose, so the frame says so. */
export const NoTarget = {
	name: "No target",
	args: { label: "Today" },
	note: "No <code>#today</code> element on this page, so the Today link is hidden on purpose.",
};
