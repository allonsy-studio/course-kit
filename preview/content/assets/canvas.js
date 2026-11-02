// The canvas controls: color scheme, width, accessibility check, and the token override fields.
const frameOf = (canvas) => canvas.querySelector("iframe");

/** Size the frame to its content so a story shows whole. */
function fit(canvas) {
	const frame = frameOf(canvas);
	const main = frame.contentDocument?.querySelector("main");
	if (!main) return;
	frame.style.blockSize = `${Math.ceil(main.getBoundingClientRect().height + 32)}px`;
}

/** Force a color scheme in the frame, and the Prism sheet that goes with it. */
function setScheme(canvas, scheme) {
	const doc = frameOf(canvas).contentDocument;
	if (!doc) return;
	const root = doc.documentElement;
	root.style.colorScheme = scheme === "system" ? "" : scheme;
	for (const link of doc.querySelectorAll("link[data-prism-theme]")) {
		link.media = scheme === "system" ? `(prefers-color-scheme: ${link.dataset.prismTheme})` : link.dataset.prismTheme === scheme ? "all" : "not all";
	}
}

/** Run axe-core in the frame and list what fails. */
async function check(canvas) {
	const frame = frameOf(canvas);
	const out = canvas.querySelector(".axe-result");
	out.textContent = "Checking…";
	const win = frame.contentWindow;
	if (!win.axe) {
		await new Promise((resolve, reject) => {
			const script = win.document.createElement("script");
			script.src = new URL("axe.min.js", import.meta.url).href;
			script.onload = resolve;
			script.onerror = reject;
			win.document.head.append(script);
		});
	}
	const { violations } = await win.axe.run(win.document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
	if (!violations.length) {
		out.textContent = "No violations found.";
		return;
	}
	out.replaceChildren(
		...violations.map((v) => {
			const item = document.createElement("p");
			item.textContent = `${v.id} (${v.impact}): ${v.help}. ${v.nodes.length} element${v.nodes.length === 1 ? "" : "s"}.`;
			return item;
		}),
	);
}

for (const canvas of document.querySelectorAll("[data-canvas]")) {
	const frame = frameOf(canvas);
	frame.addEventListener("load", () => {
		fit(canvas);
		const main = frame.contentDocument?.querySelector("main");
		if (main) new ResizeObserver(() => fit(canvas)).observe(main);
		setScheme(canvas, canvas.querySelector('input[name^="scheme"]:checked').value);
	});
	canvas.addEventListener("change", (event) => {
		const input = event.target;
		if (input.name?.startsWith("scheme")) setScheme(canvas, input.value);
		if (input.name?.startsWith("width")) {
			canvas.querySelector(".stage").style.maxInlineSize = input.value ? `${input.value}px` : "";
			fit(canvas);
		}
	});
	canvas.querySelector("[data-axe]").addEventListener("click", () => check(canvas).catch((error) => (canvas.querySelector(".axe-result").textContent = `The check failed: ${error.message}`)));
}

// Token override fields and the bar that counts them.
const bar = document.querySelector("[data-overrides]");
const sync = () => {
	const saved = window.previewTokens?.get() ?? {};
	for (const input of document.querySelectorAll("input[data-token]")) if (document.activeElement !== input) input.value = saved[input.dataset.token] ?? "";
	if (!bar) return;
	const count = Object.keys(saved).length;
	bar.hidden = count === 0;
	bar.querySelector("[data-overrides-count]").textContent = `${count} token override${count === 1 ? "" : "s"} apply to every frame.`;
};
for (const input of document.querySelectorAll("input[data-token]")) input.addEventListener("input", () => window.previewTokens.set(input.dataset.token, input.value));
bar?.querySelector("[data-overrides-reset]").addEventListener("click", () => window.previewTokens.reset());
window.addEventListener("previewtokenschange", sync);
sync();

// On a phone the list of components starts closed, so the page is the first thing on screen.
if (matchMedia("(max-width: 48rem)").matches) document.querySelector("details.nav")?.removeAttribute("open");
