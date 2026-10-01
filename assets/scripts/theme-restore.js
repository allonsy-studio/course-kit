/*
 * The key the site's theme switcher writes, applied before first paint so a
 * page opened from a dark one never flashes white. "nocss" is a site-only mode
 * and reads here as "follow system".
 *
 * Every layout inlines this into its head through the `head` bundle bucket, so
 * the site, the decks and the worksheets cannot drift apart. Pages with no
 * Prism stylesheets simply have none to swap.
 */
try {
	const theme = localStorage.getItem("theme");
	if (theme === "light" || theme === "dark") {
		document.documentElement.style.colorScheme = theme;
		document.documentElement.dataset.theme = theme;
		for (const link of document.querySelectorAll("link[data-prism-theme]")) {
			link.media = link.dataset.prismTheme === theme ? "all" : "not all";
		}
	}
} catch {
	// Storage can be unavailable (private mode, blocked cookies); follow system.
}
