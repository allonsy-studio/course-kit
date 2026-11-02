// Decodes the instructor email, which the `encodeEmail` filter writes into the
// page as base64, into a real mailto: link on view.
for (const anchor of document.querySelectorAll("a[data-email]")) {
	try {
		const address = atob(anchor.dataset.email);
		anchor.href = `mailto:${address}`;
		if (!anchor.textContent.trim()) anchor.textContent = address;
	} catch {
		/* Malformed data: leave the anchor empty rather than half-decoded. */
	}
}
