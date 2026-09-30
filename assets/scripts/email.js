// Decodes the base64-encoded instructor email (see "Computed data" in
// AGENTS.md) into real mailto: links on view.
for (const anchor of document.querySelectorAll("a[data-email]")) {
	try {
		const address = atob(anchor.dataset.email);
		anchor.href = `mailto:${address}`;
		if (!anchor.textContent.trim()) anchor.textContent = address;
	} catch {
		/* Malformed data: leave the anchor empty rather than half-decoded. */
	}
}
