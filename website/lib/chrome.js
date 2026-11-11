/**
 * The header and footer the landing site and the component preview share, so they read as one site.
 * The header holds the site's own pages only: sections of the landing, then the preview's two pages.
 * GitHub is a call to action on the landing and a footer link, never a header link.
 */

/** Landing sections the header jumps to, in page order. */
const SECTIONS = [
	{ id: "quick-start", title: "Quick start" },
	{ id: "features", title: "Features" },
	{ id: "accessibility", title: "Accessibility" },
];

/**
 * @param {{ nav: object[], footer: { groups: { heading: string, links: { href: string, title: string }[] }[] } }} props from `ossProps`
 * @param {{ components: string, theme: string }} where the preview's pages are, from the page being built
 * @returns {object} `props` with the header rebuilt and Components in the footer's Project links
 */
export function withPreview(props, { components, theme }) {
	const pages = [
		{ href: components, title: "Components" },
		{ href: theme, title: "Theme" },
	];
	const nav = [...SECTIONS.map(({ id, title }) => ({ href: `#${id}`, title })), ...pages];
	const groups = props.footer.groups.map((group) => (group.heading === "Project" ? { ...group, links: [pages[0], ...group.links] } : group));
	return { ...props, nav, footer: { ...props.footer, groups } };
}
