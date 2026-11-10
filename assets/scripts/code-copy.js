// Copy button for `figure.code-block` (every language fence in Markdown).
// Added client-side, so a page without JavaScript shows no dead control.
const RESET_MS = 2000;

const ICON = {
	copy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9 18q-.82 0-1.41-.59T7 16V4q0-.83.59-1.41T9 2h9q.82 0 1.41.59T20 4v12q0 .82-.59 1.41T18 18zm0-2h9V4H9zm-4 6q-.83 0-1.41-.59T3 20V6h2v14h11v2z"/></svg>',
	done: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="m9.55 18-5.7-5.7 1.43-1.42 4.27 4.27 9.17-9.17 1.43 1.42z"/></svg>',
};

/**
 * The text a reader means to copy: every line, and for a terminal session only
 * the commands, without their `$ ` prompt.
 * @param {HTMLElement} figure
 * @returns {string}
 */
const textOf = (figure) => {
	const lines = [...figure.querySelectorAll(".highlight-line")].map((line) => line.textContent);
	const text = lines.length ? lines : [figure.querySelector("code")?.textContent ?? ""];
	if (figure.dataset.edge !== "shell" || !text.some((line) => line.startsWith("$ "))) return text.join("\n");
	return text.filter((line) => line.startsWith("$ ")).map((line) => line.slice(2)).join("\n");
};

for (const figure of document.querySelectorAll("figure.code-block")) {
	const head = figure.querySelector(".code-block-head");
	if (!head) continue;
	const button = document.createElement("button");
	button.type = "button";
	button.className = "code-copy";
	button.setAttribute("aria-label", "Copy code");
	button.innerHTML = ICON.copy;
	const status = document.createElement("span");
	status.className = "sr-only";
	status.setAttribute("role", "status");

	let timer;
	button.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(textOf(figure));
			button.innerHTML = ICON.done;
			status.textContent = "Copied";
		} catch {
			const range = document.createRange();
			range.selectNodeContents(figure.querySelector("code") ?? figure);
			const selection = getSelection();
			selection.removeAllRanges();
			selection.addRange(range);
			status.textContent = "Code selected. Press your copy shortcut.";
		}
		clearTimeout(timer);
		timer = setTimeout(() => {
			button.innerHTML = ICON.copy;
			status.textContent = "";
		}, RESET_MS);
	});

	head.append(button, status);
}
