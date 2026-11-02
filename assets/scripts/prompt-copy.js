// Copy control for `.prompt` figures (a ```prompt fence in Markdown).
// Injected client-side, and only onto `data-copyable` figures — the
// prohibited examples get no copy control.
const RESET_MS = 2000;

// Each icon is wrapped in a <span> so `hidden` alone can switch them ([hidden]
// doesn't apply to SVG) — same pattern as theme-switcher.webc.
const ICON = {
	copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>',
	done: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"></path></svg>',
};

for (const figure of document.querySelectorAll(".prompt[data-copyable]")) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "prompt-copy";
	button.title = "Copy this prompt";
	button.setAttribute("aria-label", "Copy this prompt");
	button.innerHTML = `<span data-icon="copy">${ICON.copy}</span><span data-icon="done" hidden>${ICON.done}</span>`;
	const icons = {
		copy: button.querySelector('[data-icon="copy"]'),
		done: button.querySelector('[data-icon="done"]'),
	};
	const showIcon = (name) => {
		icons.copy.hidden = name !== "copy";
		icons.done.hidden = name !== "done";
	};

	// The label change alone isn't reliably announced, so mirror it here.
	const status = document.createElement("span");
	status.className = "sr-only";
	status.setAttribute("role", "status");

	let timer;
	button.addEventListener("click", async () => {
		const text = [...figure.querySelectorAll("p")].map((p) => p.textContent.trim()).join("\n\n");
		try {
			await navigator.clipboard.writeText(text);
			showIcon("done");
			button.setAttribute("aria-label", "Prompt copied");
			status.textContent = "Prompt copied to the clipboard.";
		} catch {
			// Clipboard denied (or an insecure context): select the text so the
			// keyboard shortcut still works.
			const range = document.createRange();
			range.selectNodeContents(figure);
			const selection = getSelection();
			selection.removeAllRanges();
			selection.addRange(range);
			button.setAttribute("aria-label", "Prompt selected — press your copy shortcut");
			status.textContent = "Prompt selected — press your copy shortcut.";
		}
		clearTimeout(timer);
		timer = setTimeout(() => {
			showIcon("copy");
			button.setAttribute("aria-label", "Copy this prompt");
			status.textContent = "";
		}, RESET_MS);
	});

	figure.append(button, status);
}
