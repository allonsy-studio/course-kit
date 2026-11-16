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
	const button = canvas.querySelector("[data-axe]");
	button.dataset.state = "running";
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
	button.dataset.state = violations.length ? "fail" : "pass";
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
	canvas.querySelector("[data-axe]").addEventListener("click", () =>
		check(canvas).catch((error) => {
			canvas.querySelector("[data-axe]").dataset.state = "fail";
			canvas.querySelector(".axe-result").textContent = `The check failed: ${error.message}`;
		}),
	);
}

// Token color pickers and the bar that counts the overrides.
const bar = document.querySelector("[data-overrides]");
const pickers = document.querySelectorAll("input[type=color][data-token]");

/** @param {string} color any CSS color @param {"light" | "dark"} scheme @returns {string} `#rrggbb`, flattened onto the page color */
const resolved = (color, scheme) => {
	const canvas = new OffscreenCanvas(1, 1);
	const context = canvas.getContext("2d", { willReadFrequently: true });
	context.fillStyle = scheme === "dark" ? "#181b25" : "#ffffff";
	context.fillRect(0, 0, 1, 1);
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
	return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
};

/** What a token computes to in one scheme. The probe is a child of `<html>`, so it sees the kit's defaults and the saved overrides, never the page chrome's own palette. */
const probe = document.createElement("span");
probe.hidden = true;
document.documentElement.append(probe);
const computed = (name, scheme) => {
	probe.style.cssText = `color-scheme: ${scheme}; color: var(${name}); display: none`;
	probe.hidden = false;
	const value = getComputedStyle(probe).color;
	probe.hidden = true;
	return resolved(value, scheme);
};

/** @param {string} saved `light-dark(#a, #b)` or one color @returns {{ light: string, dark: string } | null} */
const parse = (saved) => {
	const pair = saved?.match(/^light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)$/i);
	return pair ? { light: pair[1], dark: pair[2] } : null;
};

const sync = () => {
	const saved = window.previewTokens?.get() ?? {};
	for (const input of pickers) {
		if (document.activeElement === input) continue;
		const own = parse(saved[input.dataset.token]);
		input.value = own?.[input.dataset.scheme] ?? computed(input.dataset.token, input.dataset.scheme);
	}
	for (const reset of document.querySelectorAll("[data-token-reset]")) reset.hidden = !(reset.dataset.tokenReset in saved);
	if (!bar) return;
	const count = Object.keys(saved).length;
	bar.hidden = count === 0;
	bar.querySelector("[data-overrides-count]").textContent = `${count} token override${count === 1 ? "" : "s"} apply to every frame.`;
};

// Either picker saves both colors, so the other scheme keeps the value it had.
for (const input of pickers) {
	input.addEventListener("input", () => {
		const name = input.dataset.token;
		const other = [...pickers].find((picker) => picker.dataset.token === name && picker !== input);
		const [light, dark] = input.dataset.scheme === "light" ? [input.value, other.value] : [other.value, input.value];
		window.previewTokens.set(name, `light-dark(${light}, ${dark})`);
	});
}
for (const reset of document.querySelectorAll("[data-token-reset]")) reset.addEventListener("click", () => window.previewTokens.set(reset.dataset.tokenReset, ""));
bar?.querySelector("[data-overrides-reset]").addEventListener("click", () => window.previewTokens.reset());
window.addEventListener("previewtokenschange", sync);
sync();

// On a phone the list sits above the page, so only the current group stays open.
if (matchMedia("(max-width: 48rem)").matches) for (const group of document.querySelectorAll(".nav details:not([data-current])")) group.removeAttribute("open");

// A table that scrolls sideways must be reachable by keyboard: make its scroll box a labelled, focusable region.
for (const box of document.querySelectorAll("norn-simple-table > div")) {
	if (box.scrollWidth <= box.clientWidth) continue;
	box.tabIndex = 0;
	box.setAttribute("role", "region");
	box.setAttribute("aria-label", box.closest("norn-simple-table").previousElementSibling?.textContent?.trim() || "Table");
}
