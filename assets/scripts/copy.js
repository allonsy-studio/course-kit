// A copy button for anything marked as copyable: a code block (`figure.code-block`) and a prompt (`.prompt[data-copyable]`).
// The button is added by this script and hidden in print. Each kind names its selector, its button class, the text it copies
// and the strings it reads from the `#copy-data` block.
const RESET_MS = 2000;

/** The page's wording, from the `#copy-data` block the layout renders. */
const COPY = JSON.parse(document.getElementById("copy-data")?.textContent || "{}");
const t = (ns, key) => COPY[ns]?.[key] ?? "";

const ICON = {
	code: {
		copy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9 18q-.82 0-1.41-.59T7 16V4q0-.83.59-1.41T9 2h9q.82 0 1.41.59T20 4v12q0 .82-.59 1.41T18 18zm0-2h9V4H9zm-4 6q-.83 0-1.41-.59T3 20V6h2v14h11v2z"/></svg>',
		done: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="m9.55 18-5.7-5.7 1.43-1.42 4.27 4.27 9.17-9.17 1.43 1.42z"/></svg>',
	},
	prompt: {
		copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>',
		done: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"></path></svg>',
	},
};

/**
 * The text a reader means to copy from a code block: every line, and for a terminal session only the commands, without their `$ ` prompt.
 * @param {HTMLElement} figure
 * @returns {string}
 */
const codeText = (figure) => {
	const lines = [...figure.querySelectorAll(".highlight-line")].map((line) => line.textContent);
	const text = lines.length ? lines : [figure.querySelector("code")?.textContent ?? ""];
	if (figure.dataset.edge !== "shell" || !text.some((line) => line.startsWith("$ "))) return text.join("\n");
	return text.filter((line) => line.startsWith("$ ")).map((line) => line.slice(2)).join("\n");
};

/** What each copyable thing is: where to find it, the button's class, its text and its strings. */
const KINDS = [
	{
		selector: "figure.code-block",
		icons: ICON.code,
		className: "code-copy",
		text: codeText,
		selects: (figure) => figure.querySelector("code") ?? figure,
		label: () => t("code", "copy"),
		copied: () => t("code", "copied"),
		selected: () => t("code", "selected"),
	},
	{
		selector: ".prompt[data-copyable]",
		icons: ICON.prompt,
		className: "prompt-copy",
		text: (figure) => [...figure.querySelectorAll("p")].map((p) => p.textContent.trim()).join("\n\n"),
		selects: (figure) => figure,
		label: () => t("promptCopy", "copyThisPrompt"),
		copied: () => t("promptCopy", "promptCopiedToThe"),
		copiedLabel: () => t("promptCopy", "promptCopied"),
		selected: () => t("promptCopy", "promptSelectedPressYour"),
		title: true,
	},
];

for (const kind of KINDS) {
	for (const figure of document.querySelectorAll(kind.selector)) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = kind.className;
		if (kind.title) button.title = kind.label();
		button.setAttribute("aria-label", kind.label());
		button.innerHTML = kind.icons.copy;
		// The label change alone isn't reliably announced, so mirror it in a status line.
		const status = document.createElement("span");
		status.className = "sr-only";
		status.setAttribute("role", "status");

		let timer;
		button.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(kind.text(figure));
				button.innerHTML = kind.icons.done;
				button.setAttribute("aria-label", (kind.copiedLabel ?? kind.copied)());
				status.textContent = kind.copied();
			} catch {
				// Clipboard denied (or an insecure context): select the text so the keyboard shortcut still works.
				const range = document.createRange();
				range.selectNodeContents(kind.selects(figure));
				const selection = getSelection();
				selection.removeAllRanges();
				selection.addRange(range);
				if (kind.title) button.setAttribute("aria-label", kind.selected());
				status.textContent = kind.selected();
			}
			clearTimeout(timer);
			timer = setTimeout(() => {
				button.innerHTML = kind.icons.copy;
				button.setAttribute("aria-label", kind.label());
				status.textContent = "";
			}, RESET_MS);
		});

		// On the figure, not the caption, so a code block keeps its caption as its accessible name.
		figure.append(button, status);
	}
}
