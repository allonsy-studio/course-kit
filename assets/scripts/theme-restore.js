/*
 * The deck's saved light/dark choice, applied before first paint so a deck
 * never flashes the wrong scheme. Only the deck layout inlines this, through
 * the `head` bundle bucket; the site and worksheets follow the system.
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
