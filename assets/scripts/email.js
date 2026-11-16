// Decodes the instructor email, which the `encodeEmail` filter writes into the
// page as base64, into a real mailto: link on view.
for (const anchor of document.querySelectorAll("a[data-email]")) {
	try {
		const address = atob(anchor.dataset.email);
		anchor.href = `mailto:${address}`;
		// An icon link keeps its svg and writes the address into its own text slot.
		const target = anchor.querySelector("[data-email-text]") ?? anchor;
		if (!target.textContent.trim()) {
			// Break opportunities before "@" and after each ".": a narrow screen wraps the address there, not mid-word.
			address.split(/(?=@)|(?<=\.)/).forEach((part, index) => {
				if (index) target.append(document.createElement("wbr"));
				target.append(part);
			});
		}
	} catch {
		/* Malformed data: leave the anchor empty rather than half-decoded. */
	}
}
