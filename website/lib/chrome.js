/**
 * The header and footer the landing site and the component preview share, so they read as one site.
 * `ossProps` gives the landing's links; this adds the preview's two pages beside them.
 */

/**
 * @param {{ nav: { href: string, title: string }[], footer: { groups: { heading: string, links: { href: string, title: string }[] }[] } }} props from `ossProps`
 * @param {{ components: string, theme: string }} where the preview's pages are, from the page being built
 * @returns {object} `props` with Components and Theme in the nav and the footer's Project links
 */
export function withPreview(props, { components, theme }) {
	const pages = [
		{ href: components, title: "Components" },
		{ href: theme, title: "Theme" },
	];
	const at = props.nav.findIndex((link) => link.title === "GitHub");
	const nav = at === -1 ? [...props.nav, ...pages] : [...props.nav.slice(0, at), ...pages, ...props.nav.slice(at)];
	const groups = props.footer.groups.map((group) => (group.heading === "Project" ? { ...group, links: [pages[0], ...group.links] } : group));
	return { ...props, nav, footer: { ...props.footer, groups } };
}
