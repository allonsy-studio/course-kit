/**
 * Dev-only theme panel: preview color tokens on the live page and save them to
 * `_data/theme.json` through the dev server. See docs/theme-panel.md.
 */

const ENDPOINT = "/.course-kit/theme";
const STORE = "course-kit:theme-panel";

/** Plain-language groups for the most used tokens; every token is also under "Every color". */
const GROUPS = [
	{ legend: "Brand", tokens: [["accent", "Brand color"], ["accent-text", "Brand color for text"], ["on-accent", "Text on brand color"], ["accent-secondary", "Wayfinding color"], ["on-accent-secondary", "Text on wayfinding color"]] },
	{ legend: "Page", tokens: [["page", "Page background"], ["surface", "Cards and panels"], ["border", "Lines and borders"]] },
	{ legend: "Text", tokens: [["text", "Body text"], ["text-muted", "Secondary text"], ["link", "Links"]] },
];

/** Text and background pairs whose contrast is reported, shown beside the first token. */
const CONTRAST = [
	["text", "page", 4.5],
	["text-muted", "page", 4.5],
	["accent-text", "page", 4.5],
	["link", "page", 4.5],
	["on-accent", "accent", 4.5],
];

const read = (storage, key, fallback) => {
	try {
		const value = storage.getItem(`${STORE}:${key}`);
		return value === null ? fallback : JSON.parse(value);
	} catch {
		return fallback;
	}
};
const write = (storage, key, value) => {
	try {
		if (value === undefined) storage.removeItem(`${STORE}:${key}`);
		else storage.setItem(`${STORE}:${key}`, JSON.stringify(value));
	} catch {
		// storage blocked: the panel still works, it just forgets.
	}
};

/** @param {unknown} value a color or { light, dark } */
const toCss = (value) => (typeof value === "string" ? value : `light-dark(${value.light}, ${value.dark})`);
const clone = (value) => structuredClone(value);
const hex = ([r, g, b]) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

/** WCAG relative luminance of 8-bit sRGB. */
const luminance = ([r, g, b]) => {
	const channel = (c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const ratio = (a, b) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};
/** A translucent color painted over an opaque one. */
const over = ([r, g, b, a], [br, bg, bb]) => {
	const t = a / 255;
	return [Math.round(r * t + br * (1 - t)), Math.round(g * t + bg * (1 - t)), Math.round(b * t + bb * (1 - t)), 255];
};

const STYLES = `
:host {
	all: initial;
	color-scheme: light dark;
	--tp-bg: light-dark(#fff, #1d1f27);
	--tp-text: light-dark(#1d1f27, #eceef4);
	--tp-muted: light-dark(#555b6e, #a9aec0);
	--tp-line: light-dark(#c4c8d4, #454959);
	--tp-focus: light-dark(#0b57d0, #8ab4f8);
	--tp-good: light-dark(#1d6b3c, #86d7a4);
	--tp-bad: light-dark(#a3261a, #ff9d8f);
	--tp-gap: 0.75rem;
	font: 0.875rem/1.45 system-ui, sans-serif;
}

* { box-sizing: border-box; }

:focus-visible {
	outline: 2px solid var(--tp-focus);
	outline-offset: 2px;
}

button, input, select { font: inherit; color: inherit; }

button {
	min-block-size: 2rem;
	min-inline-size: 2rem;
	padding-inline: 0.75rem;
	border: 1px solid var(--tp-line);
	border-radius: 0.375rem;
	background: var(--tp-bg);
	cursor: pointer;
}

button:disabled { opacity: 0.5; cursor: not-allowed; }

[hidden] { display: none !important; }

.launcher {
	position: fixed;
	inset-inline-end: 0;
	inset-block-start: 50%;
	translate: 0 -50%;
	z-index: 2147483646;
	writing-mode: vertical-rl;
	padding: 0.75rem 0.4rem;
	border-inline-end: 0;
	border-start-end-radius: 0;
	border-end-end-radius: 0;
	color: var(--tp-text);
	box-shadow: 0 2px 8px rgb(0 0 0 / 20%);
}

.panel {
	position: fixed;
	inset: auto;
	inset-inline-end: var(--tp-gap);
	inset-block-start: 50%;
	translate: 0 -50%;
	margin: 0;
	z-index: 2147483647;
	inline-size: min(22rem, 100vw - 2 * var(--tp-gap));
	max-block-size: calc(100dvh - 2 * var(--tp-gap));
	overflow: auto;
	overscroll-behavior: contain;
	scrollbar-gutter: stable;
	padding: 0;
	border: 1px solid var(--tp-line);
	border-radius: 0.5rem;
	background: var(--tp-bg);
	color: var(--tp-text);
	box-shadow: 0 8px 28px rgb(0 0 0 / 25%);
	container-type: inline-size;

	opacity: 1;
	transform: none;
	transition-property: opacity, transform, display, overlay;
	transition-duration: 0.2s;
	transition-timing-function: ease-out;
	transition-behavior: allow-discrete;
}

.panel:not([popover]) { display: block; }

.panel:popover-open {
	@starting-style {
		opacity: 0;
		transform: translateX(1rem);
	}
}

.panel[popover]:not(:popover-open) {
	opacity: 0;
	transform: translateX(1rem);
}

@media (width < 40rem) {
	.panel {
		inset-inline: 0;
		inset-block: auto 0;
		translate: none;
		inline-size: 100%;
		max-block-size: 70dvh;
		border-end-start-radius: 0;
		border-end-end-radius: 0;
		padding-block-end: env(safe-area-inset-bottom);
	}
}

.main > summary {
	position: sticky;
	inset-block-start: 0;
	z-index: 1;
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding-block: 0.5rem;
	padding-inline: 0.75rem 3rem;
	background: var(--tp-bg);
	border-block-end: 1px solid var(--tp-line);
	cursor: pointer;
}

.main:not([open]) > summary { border-block-end: 0; }

h2 { margin: 0; font-size: 1rem; }

.flag { font-size: 0.75rem; color: var(--tp-muted); }

.close {
	position: absolute;
	inset-block-start: 0.375rem;
	inset-inline-end: 0.375rem;
	z-index: 2;
	padding: 0;
}

.body {
	display: grid;
	gap: 0.75rem;
	padding: 0.75rem;
}

fieldset {
	margin: 0;
	padding: 0.5rem 0.75rem 0.75rem;
	border: 1px solid var(--tp-line);
	border-radius: 0.375rem;
	display: grid;
	gap: 0.5rem;
}

legend { padding-inline: 0.25rem; font-weight: 600; }

.modes { display: flex; gap: 1rem; }

.row {
	display: grid;
	grid-template-columns: 2.25rem 1fr;
	grid-template-areas: "swatch label" "swatch value" ". contrast";
	column-gap: 0.5rem;
	align-items: center;
}

.row label { grid-area: label; }
.row input[type="color"] {
	grid-area: swatch;
	inline-size: 2.25rem;
	block-size: 2.25rem;
	padding: 0;
	border: 1px solid var(--tp-line);
	border-radius: 0.375rem;
	background: none;
	forced-color-adjust: none;
}
.row input[type="text"] {
	grid-area: value;
	inline-size: 100%;
	min-block-size: 1.75rem;
	padding-inline: 0.375rem;
	border: 1px solid var(--tp-line);
	border-radius: 0.25rem;
	background: var(--tp-bg);
	font-family: ui-monospace, monospace;
	font-size: 0.8125rem;
}
.row input[type="text"]:user-invalid { border-color: var(--tp-bad); }
.row output { grid-area: contrast; font-size: 0.75rem; }
.row output[data-pass="true"] { color: var(--tp-good); }
.row output[data-pass="false"] { color: var(--tp-bad); }
.role { grid-column: 2; font-size: 0.75rem; color: var(--tp-muted); }

.advanced > summary { cursor: pointer; font-weight: 600; }
.advanced[open] > summary { margin-block-end: 0.5rem; }
.advanced > div { display: grid; gap: 0.75rem; }

.stops { display: grid; gap: 0.5rem; }
.stop { display: flex; gap: 0.5rem; align-items: center; }

menu {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin: 0;
	padding: 0;
	list-style: none;
}

.save { font-weight: 600; }

.status { min-block-size: 1.25rem; font-size: 0.8125rem; }

.probe { position: absolute; inline-size: 0; block-size: 0; overflow: hidden; }

@container (inline-size < 16rem) {
	.row { grid-template-columns: 1fr; grid-template-areas: "label" "swatch" "value" "contrast"; }
	.role { grid-column: 1; }
}

@supports (interpolate-size: allow-keywords) {
	:host { interpolate-size: allow-keywords; }
	.main::details-content {
		block-size: 0;
		overflow: clip;
		transition: block-size 0.2s ease-out, content-visibility 0.2s;
		transition-behavior: allow-discrete;
	}
	.main[open]::details-content { block-size: auto; }
}

@media (prefers-reduced-motion: reduce) {
	.panel, .panel:popover-open, .panel[popover]:not(:popover-open) { transform: none; transition-duration: 0.01s; }
	.main::details-content { transition: none; }
}
`;

class ThemePanel extends HTMLElement {
	async connectedCallback() {
		if (this.shadowRoot) return;
		let data;
		try {
			const response = await fetch(ENDPOINT, { cache: "no-store" });
			if (!response.ok) throw new Error(String(response.status));
			data = await response.json();
		} catch {
			// No dev server endpoint (a static build): there is nothing to save to.
			this.remove();
			return;
		}
		this.context = this.getAttribute("context") === "deck" ? "deck" : "site";
		this.tokens = data.tokens.filter((token) => token[this.context]);
		this.roles = Object.fromEntries(this.tokens.map((token) => [token.key, token.role]));
		this.defaultGradient = data.gradient;
		this.file = data.file;
		this.saved = data.theme;
		this.draft = read(sessionStorage, "draft", null) ?? clone(this.saved);
		this.history = [];
		this.render();
		this.applyPreview();
		this.refresh();
	}

	/** @returns {string} */
	get mode() {
		const forced = document.documentElement.style.colorScheme;
		if (forced === "light" || forced === "dark") return forced;
		return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}

	render() {
		const root = this.attachShadow({ mode: "open" });
		const supportsPopover = "popover" in HTMLElement.prototype;
		root.innerHTML = `
			<style>${STYLES}</style>
			<button type="button" class="launcher" ${supportsPopover ? 'popovertarget="panel" popovertargetaction="show"' : ""}>Theme</button>
			<aside class="panel" id="panel" ${supportsPopover ? 'popover="manual"' : "hidden"} aria-labelledby="title">
				<details class="main" open>
					<summary><h2 id="title">Theme</h2><span class="flag" hidden>Unsaved changes</span></summary>
					<div class="body">
						<fieldset class="modes-set">
							<legend>Preview</legend>
							<div class="modes">
								<label><input type="radio" name="mode" value="light"> Light</label>
								<label><input type="radio" name="mode" value="dark"> Dark</label>
							</div>
						</fieldset>
						${GROUPS.map((group) => this.fieldset(group.legend, group.tokens.filter(([key]) => this.roles[key]))).join("")}
						<details class="advanced" name="theme-panel-section">
							<summary>Every color</summary>
							<div>
								${this.fieldset("All tokens", this.tokens.map((token) => [token.key, token.role]), true)}
								${this.context === "site" ? "<fieldset><legend>Gradient</legend><div class=\"stops\"></div><button type=\"button\" data-action=\"add-stop\">Add a color</button></fieldset>" : ""}
							</div>
						</details>
						<menu>
							<li><button type="button" data-action="undo">Undo</button></li>
							<li><button type="button" data-action="reset">Reset</button></li>
							<li><button type="button" class="save" data-action="save">Save</button></li>
							<li><button type="button" data-action="download">Download</button></li>
						</menu>
						<output class="status" role="status"></output>
					</div>
				</details>
				<button type="button" class="close" aria-label="Hide the theme panel" ${supportsPopover ? 'popovertarget="panel" popovertargetaction="hide"' : ""}>&times;</button>
			</aside>
			<div class="probe" aria-hidden="true"></div>`;

		this.panel = root.querySelector(".panel");
		this.main = root.querySelector(".main");
		this.status = root.querySelector(".status");

		const open = read(localStorage, "open", false);
		const expanded = read(localStorage, "expanded", true);
		this.main.open = expanded;
		if (open) this.show();

		if (!supportsPopover) {
			root.querySelector(".launcher").addEventListener("click", () => this.show());
			root.querySelector(".close").addEventListener("click", () => this.hide());
		}
		const launcher = root.querySelector(".launcher");
		this.panel.addEventListener("toggle", (event) => {
			launcher.hidden = event.newState === "open";
			write(localStorage, "open", event.newState === "open");
		});
		this.main.addEventListener("toggle", () => write(localStorage, "expanded", this.main.open));
		this.panel.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && this.main.open) {
				event.preventDefault();
				this.main.open = false;
				this.main.querySelector("summary").focus();
			}
		});

		for (const radio of root.querySelectorAll('input[name="mode"]')) {
			radio.checked = radio.value === this.mode;
			radio.addEventListener("change", () => {
				document.documentElement.style.colorScheme = radio.value;
				this.refresh();
			});
		}

		root.addEventListener("input", (event) => {
			const input = event.target;
			if (!input.dataset.key) return;
			if (input.type === "color") this.set(input.dataset.key, input.value);
		});
		root.addEventListener("change", (event) => {
			const input = event.target;
			if (input.type !== "text") return;
			if (input.dataset.stop !== undefined) return this.setStop(Number(input.dataset.stop), input.value.trim());
			if (!input.dataset.key) return;
			const value = input.value.trim();
			input.setCustomValidity(CSS.supports("color", value) ? "" : "Not a CSS color");
			if (input.checkValidity()) this.set(input.dataset.key, value);
			else input.reportValidity();
		});
		root.addEventListener("click", (event) => {
			const action = event.target.closest("[data-action]")?.dataset.action;
			if (action) this[action === "add-stop" ? "addStop" : action === "remove-stop" ? "removeStop" : action](event.target.closest("[data-action]"));
		});
	}

	/**
	 * @param {string} legend
	 * @param {[string, string][]} tokens key and label
	 * @param {boolean} [roles] label rows by token name and show the role
	 */
	fieldset(legend, tokens, roles = false) {
		const rows = tokens.map(([key, label]) => {
			const id = `${roles ? "all" : "main"}-${key}`;
			const name = roles ? `--color-${key}` : label;
			return `<div class="row">
				<label for="${id}">${name}</label>
				<input type="color" id="${id}" data-key="${key}" title="${this.roles[key]}">
				<input type="text" data-key="${key}" aria-label="${name}, CSS value" spellcheck="false" autocomplete="off">
				${roles ? `<span class="role">${label}</span>` : `<output for="${id}" data-contrast="${key}"></output>`}
			</div>`;
		});
		return `<fieldset><legend>${legend}</legend>${rows.join("")}</fieldset>`;
	}

	show() {
		if (this.panel.showPopover) this.panel.showPopover();
		else this.panel.hidden = false;
		this.shadowRoot.querySelector(".launcher").hidden = true;
		write(localStorage, "open", true);
	}

	hide() {
		if (this.panel.hidePopover) this.panel.hidePopover();
		else this.panel.hidden = true;
		this.shadowRoot.querySelector(".launcher").hidden = false;
		write(localStorage, "open", false);
	}

	/** The scope a key is edited in: this context's section if it already holds the key, else the top level. */
	scope(key) {
		return this.draft[this.context] && key in this.draft[this.context] ? this.draft[this.context] : this.draft;
	}

	/** The resolved RGBA of a CSS color in one mode. */
	resolve(value, mode) {
		const probe = this.shadowRoot.querySelector(".probe");
		probe.style.colorScheme = mode;
		probe.style.color = "transparent";
		probe.style.color = value;
		const canvas = (this.canvas ??= new OffscreenCanvas(1, 1));
		const context = (this.context2d ??= canvas.getContext("2d", { willReadFrequently: true }));
		context.clearRect(0, 0, 1, 1);
		context.fillStyle = getComputedStyle(probe).color;
		context.fillRect(0, 0, 1, 1);
		return [...context.getImageData(0, 0, 1, 1).data];
	}

	/** Set one token for the previewed mode, keeping the other mode as it currently looks. */
	set(key, value) {
		this.remember();
		const scope = this.scope(key);
		const other = this.mode === "light" ? "dark" : "light";
		const current = scope[key];
		const otherValue = current && typeof current === "object" ? current[other] : hex(this.resolve(`var(--color-${key})`, other));
		scope[key] = this.mode === "light" ? { light: value, dark: otherValue } : { light: otherValue, dark: value };
		this.changed();
	}

	gradient() {
		return this.draft.gradient ?? this.defaultGradient;
	}

	setStop(index, value) {
		if (!CSS.supports("color", value)) return;
		this.remember();
		const stops = clone(this.gradient());
		stops[index] = value;
		this.draft.gradient = stops;
		this.changed();
	}

	addStop() {
		const stops = clone(this.gradient());
		if (stops.length >= 4) return;
		this.remember();
		this.draft.gradient = [...stops, stops.at(-1)];
		this.changed();
	}

	removeStop(button) {
		const stops = clone(this.gradient());
		if (stops.length <= 1) return;
		this.remember();
		stops.splice(Number(button.dataset.stop), 1);
		this.draft.gradient = stops;
		this.changed();
	}

	remember() {
		this.history.push(clone(this.draft));
	}

	undo() {
		if (!this.history.length) return;
		this.draft = this.history.pop();
		this.changed();
	}

	reset() {
		this.remember();
		this.draft = clone(this.saved);
		this.changed();
		this.say("Back to the saved theme.");
	}

	changed() {
		write(sessionStorage, "draft", this.dirty ? this.draft : undefined);
		this.applyPreview();
		this.refresh();
	}

	get dirty() {
		return JSON.stringify(this.draft) !== JSON.stringify(this.saved);
	}

	/** Write the draft onto the page as inline custom properties. */
	applyPreview() {
		const style = document.documentElement.style;
		for (const token of this.tokens) {
			const value = this.draft[this.context]?.[token.key] ?? this.draft[token.key];
			if (value === undefined) style.removeProperty(`--color-${token.key}`);
			else style.setProperty(`--color-${token.key}`, toCss(value));
		}
		if (this.context === "site") {
			const stops = this.gradient();
			for (let index = 0; index < 4; index++) {
				if (index < stops.length) style.setProperty(`--color-gradient-${index + 1}`, toCss(stops[index]));
				else style.removeProperty(`--color-gradient-${index + 1}`);
			}
			const names = stops.map((_, index) => `var(--color-gradient-${index + 1})`);
			if (names.length === 1) names.push(names[0]);
			style.setProperty("--gradient-stops", names.join(", "));
		}
	}

	/** Update every input, contrast result and button to match the draft and the previewed mode. */
	refresh() {
		const root = this.shadowRoot;
		const mode = this.mode;
		for (const radio of root.querySelectorAll('input[name="mode"]')) radio.checked = radio.value === mode;
		for (const input of root.querySelectorAll("input[data-key]")) {
			const key = input.dataset.key;
			const rgba = this.resolve(`var(--color-${key})`, mode);
			if (input.type === "color") input.value = hex(rgba);
			else if (input !== root.activeElement) {
				const value = this.scope(key)[key];
				input.value = value === undefined ? (rgba[3] === 255 ? hex(rgba) : `rgb(${rgba.slice(0, 3).join(" ")} / ${(rgba[3] / 255).toFixed(2)})`) : typeof value === "string" ? value : value[mode];
				input.setCustomValidity("");
			}
		}
		for (const output of root.querySelectorAll("output[data-contrast]")) {
			const pair = CONTRAST.find(([text]) => text === output.dataset.contrast);
			if (!pair || !this.roles[pair[1]]) {
				output.textContent = "";
				continue;
			}
			const [text, background, minimum] = pair;
			const back = over(this.resolve(`var(--color-${background})`, mode), [255, 255, 255]);
			const value = ratio(over(this.resolve(`var(--color-${text})`, mode), back), back);
			const pass = value >= minimum;
			output.dataset.pass = String(pass);
			output.textContent = `${value.toFixed(1)} : 1 on ${background === "page" ? "the page" : "the brand color"}, ${pass ? "passes" : `below ${minimum} : 1`}`;
		}
		const stops = root.querySelector(".stops");
		if (stops) {
			const list = this.gradient();
			stops.innerHTML = list
				.map(
					(stop, index) => `<div class="stop">
						<label for="stop-${index}">Color ${index + 1}</label>
						<input type="text" id="stop-${index}" data-stop="${index}" value="${toCss(stop)}" spellcheck="false" autocomplete="off">
						<button type="button" data-action="remove-stop" data-stop="${index}" aria-label="Remove color ${index + 1}" ${list.length <= 1 ? "disabled" : ""}>&minus;</button>
					</div>`,
				)
				.join("");
			root.querySelector('[data-action="add-stop"]').disabled = list.length >= 4;
		}
		root.querySelector('[data-action="undo"]').disabled = !this.history.length;
		root.querySelector('[data-action="reset"]').disabled = !this.dirty;
		root.querySelector(".flag").hidden = !this.dirty;
	}

	async save() {
		this.say("Saving…");
		try {
			const response = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(this.draft) });
			const result = await response.json();
			if (!response.ok) throw new Error(result.error);
			this.saved = clone(this.draft);
			this.history = [];
			write(sessionStorage, "draft", undefined);
			this.refresh();
			this.say(`Saved to ${result.file}. The site is rebuilding.`);
		} catch (error) {
			this.say(`Not saved: ${error.message}`);
		}
	}

	download() {
		const blob = new Blob([`${JSON.stringify(this.draft, null, "\t")}\n`], { type: "application/json" });
		const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "theme.json" });
		link.click();
		URL.revokeObjectURL(link.href);
		this.say(`Downloaded. Put it in ${this.file.replace(/theme\.json$/, "")} to keep it.`);
	}

	say(message) {
		this.status.textContent = message;
	}
}

if (!customElements.get("theme-panel")) customElements.define("theme-panel", ThemePanel);
