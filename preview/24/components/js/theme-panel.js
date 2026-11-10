// assets/scripts/theme-panel.js
var ENDPOINT = "/.course-kit/theme";
var STORE = "course-kit:theme-panel";
var GROUPS = [
  { legend: "Brand", tokens: [["accent", "Brand color"], ["accent-text", "Brand color for text"], ["on-accent", "Text on brand color"], ["accent-secondary", "Wayfinding color"], ["on-accent-secondary", "Text on wayfinding color"]] },
  { legend: "Page", tokens: [["page", "Page background"], ["surface", "Cards and panels"], ["border", "Lines and borders"]] },
  { legend: "Text", tokens: [["text", "Body text"], ["text-muted", "Secondary text"], ["link", "Links"]] }
];
var CONTRAST = [
  ["text", "page", 4.5],
  ["text-muted", "page", 4.5],
  ["accent-text", "page", 4.5],
  ["link", "page", 4.5],
  ["on-accent", "accent", 4.5]
];
var read = (storage, key, fallback) => {
  try {
    const value = storage.getItem(`${STORE}:${key}`);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};
var write = (storage, key, value) => {
  try {
    if (value === void 0) storage.removeItem(`${STORE}:${key}`);
    else storage.setItem(`${STORE}:${key}`, JSON.stringify(value));
  } catch {
  }
};
var toCss = (value) => typeof value === "string" ? value : `light-dark(${value.light}, ${value.dark})`;
var clone = (value) => structuredClone(value);
var hex = ([r, g, b]) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
var luminance = ([r, g, b]) => {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
var ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
var over = ([r, g, b, a], [br, bg, bb]) => {
  const t = a / 255;
  return [Math.round(r * t + br * (1 - t)), Math.round(g * t + bg * (1 - t)), Math.round(b * t + bb * (1 - t)), 255];
};
var STYLES = `
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
var ThemePanel = class extends HTMLElement {
  async connectedCallback() {
    if (this.shadowRoot) return;
    let data;
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      data = await response.json();
    } catch {
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
								${this.context === "site" ? '<fieldset><legend>Gradient</legend><div class="stops"></div><button type="button" data-action="add-stop">Add a color</button></fieldset>' : ""}
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
      if (input.dataset.stop !== void 0) return this.setStop(Number(input.dataset.stop), input.value.trim());
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
    const canvas = this.canvas ??= new OffscreenCanvas(1, 1);
    const context = this.context2d ??= canvas.getContext("2d", { willReadFrequently: true });
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
    write(sessionStorage, "draft", this.dirty ? this.draft : void 0);
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
      if (value === void 0) style.removeProperty(`--color-${token.key}`);
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
        input.value = value === void 0 ? rgba[3] === 255 ? hex(rgba) : `rgb(${rgba.slice(0, 3).join(" ")} / ${(rgba[3] / 255).toFixed(2)})` : typeof value === "string" ? value : value[mode];
        input.setCustomValidity("");
      }
    }
    for (const output of root.querySelectorAll("output[data-contrast]")) {
      const pair = CONTRAST.find(([text2]) => text2 === output.dataset.contrast);
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
      stops.innerHTML = list.map(
        (stop, index) => `<div class="stop">
						<label for="stop-${index}">Color ${index + 1}</label>
						<input type="text" id="stop-${index}" data-stop="${index}" value="${toCss(stop)}" spellcheck="false" autocomplete="off">
						<button type="button" data-action="remove-stop" data-stop="${index}" aria-label="Remove color ${index + 1}" ${list.length <= 1 ? "disabled" : ""}>&minus;</button>
					</div>`
      ).join("");
      root.querySelector('[data-action="add-stop"]').disabled = list.length >= 4;
    }
    root.querySelector('[data-action="undo"]').disabled = !this.history.length;
    root.querySelector('[data-action="reset"]').disabled = !this.dirty;
    root.querySelector(".flag").hidden = !this.dirty;
  }
  async save() {
    this.say("Saving\u2026");
    try {
      const response = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(this.draft) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      this.saved = clone(this.draft);
      this.history = [];
      write(sessionStorage, "draft", void 0);
      this.refresh();
      this.say(`Saved to ${result.file}. The site is rebuilding.`);
    } catch (error) {
      this.say(`Not saved: ${error.message}`);
    }
  }
  download() {
    const blob = new Blob([`${JSON.stringify(this.draft, null, "	")}
`], { type: "application/json" });
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "theme.json" });
    link.click();
    URL.revokeObjectURL(link.href);
    this.say(`Downloaded. Put it in ${this.file.replace(/theme\.json$/, "")} to keep it.`);
  }
  say(message) {
    this.status.textContent = message;
  }
};
if (!customElements.get("theme-panel")) customElements.define("theme-panel", ThemePanel);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvdGhlbWUtcGFuZWwuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogRGV2LW9ubHkgdGhlbWUgcGFuZWw6IHByZXZpZXcgY29sb3IgdG9rZW5zIG9uIHRoZSBsaXZlIHBhZ2UgYW5kIHNhdmUgdGhlbSB0b1xuICogYF9kYXRhL3RoZW1lLmpzb25gIHRocm91Z2ggdGhlIGRldiBzZXJ2ZXIuIFNlZSBkb2NzL3RoZW1lLXBhbmVsLm1kLlxuICovXG5cbmNvbnN0IEVORFBPSU5UID0gXCIvLmNvdXJzZS1raXQvdGhlbWVcIjtcbmNvbnN0IFNUT1JFID0gXCJjb3Vyc2Uta2l0OnRoZW1lLXBhbmVsXCI7XG5cbi8qKiBQbGFpbi1sYW5ndWFnZSBncm91cHMgZm9yIHRoZSBtb3N0IHVzZWQgdG9rZW5zOyBldmVyeSB0b2tlbiBpcyBhbHNvIHVuZGVyIFwiRXZlcnkgY29sb3JcIi4gKi9cbmNvbnN0IEdST1VQUyA9IFtcblx0eyBsZWdlbmQ6IFwiQnJhbmRcIiwgdG9rZW5zOiBbW1wiYWNjZW50XCIsIFwiQnJhbmQgY29sb3JcIl0sIFtcImFjY2VudC10ZXh0XCIsIFwiQnJhbmQgY29sb3IgZm9yIHRleHRcIl0sIFtcIm9uLWFjY2VudFwiLCBcIlRleHQgb24gYnJhbmQgY29sb3JcIl0sIFtcImFjY2VudC1zZWNvbmRhcnlcIiwgXCJXYXlmaW5kaW5nIGNvbG9yXCJdLCBbXCJvbi1hY2NlbnQtc2Vjb25kYXJ5XCIsIFwiVGV4dCBvbiB3YXlmaW5kaW5nIGNvbG9yXCJdXSB9LFxuXHR7IGxlZ2VuZDogXCJQYWdlXCIsIHRva2VuczogW1tcInBhZ2VcIiwgXCJQYWdlIGJhY2tncm91bmRcIl0sIFtcInN1cmZhY2VcIiwgXCJDYXJkcyBhbmQgcGFuZWxzXCJdLCBbXCJib3JkZXJcIiwgXCJMaW5lcyBhbmQgYm9yZGVyc1wiXV0gfSxcblx0eyBsZWdlbmQ6IFwiVGV4dFwiLCB0b2tlbnM6IFtbXCJ0ZXh0XCIsIFwiQm9keSB0ZXh0XCJdLCBbXCJ0ZXh0LW11dGVkXCIsIFwiU2Vjb25kYXJ5IHRleHRcIl0sIFtcImxpbmtcIiwgXCJMaW5rc1wiXV0gfSxcbl07XG5cbi8qKiBUZXh0IGFuZCBiYWNrZ3JvdW5kIHBhaXJzIHdob3NlIGNvbnRyYXN0IGlzIHJlcG9ydGVkLCBzaG93biBiZXNpZGUgdGhlIGZpcnN0IHRva2VuLiAqL1xuY29uc3QgQ09OVFJBU1QgPSBbXG5cdFtcInRleHRcIiwgXCJwYWdlXCIsIDQuNV0sXG5cdFtcInRleHQtbXV0ZWRcIiwgXCJwYWdlXCIsIDQuNV0sXG5cdFtcImFjY2VudC10ZXh0XCIsIFwicGFnZVwiLCA0LjVdLFxuXHRbXCJsaW5rXCIsIFwicGFnZVwiLCA0LjVdLFxuXHRbXCJvbi1hY2NlbnRcIiwgXCJhY2NlbnRcIiwgNC41XSxcbl07XG5cbmNvbnN0IHJlYWQgPSAoc3RvcmFnZSwga2V5LCBmYWxsYmFjaykgPT4ge1xuXHR0cnkge1xuXHRcdGNvbnN0IHZhbHVlID0gc3RvcmFnZS5nZXRJdGVtKGAke1NUT1JFfToke2tleX1gKTtcblx0XHRyZXR1cm4gdmFsdWUgPT09IG51bGwgPyBmYWxsYmFjayA6IEpTT04ucGFyc2UodmFsdWUpO1xuXHR9IGNhdGNoIHtcblx0XHRyZXR1cm4gZmFsbGJhY2s7XG5cdH1cbn07XG5jb25zdCB3cml0ZSA9IChzdG9yYWdlLCBrZXksIHZhbHVlKSA9PiB7XG5cdHRyeSB7XG5cdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHN0b3JhZ2UucmVtb3ZlSXRlbShgJHtTVE9SRX06JHtrZXl9YCk7XG5cdFx0ZWxzZSBzdG9yYWdlLnNldEl0ZW0oYCR7U1RPUkV9OiR7a2V5fWAsIEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG5cdH0gY2F0Y2gge1xuXHRcdC8vIHN0b3JhZ2UgYmxvY2tlZDogdGhlIHBhbmVsIHN0aWxsIHdvcmtzLCBpdCBqdXN0IGZvcmdldHMuXG5cdH1cbn07XG5cbi8qKiBAcGFyYW0ge3Vua25vd259IHZhbHVlIGEgY29sb3Igb3IgeyBsaWdodCwgZGFyayB9ICovXG5jb25zdCB0b0NzcyA9ICh2YWx1ZSkgPT4gKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHZhbHVlIDogYGxpZ2h0LWRhcmsoJHt2YWx1ZS5saWdodH0sICR7dmFsdWUuZGFya30pYCk7XG5jb25zdCBjbG9uZSA9ICh2YWx1ZSkgPT4gc3RydWN0dXJlZENsb25lKHZhbHVlKTtcbmNvbnN0IGhleCA9IChbciwgZywgYl0pID0+IGAjJHtbciwgZywgYl0ubWFwKChuKSA9PiBuLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpLmpvaW4oXCJcIil9YDtcblxuLyoqIFdDQUcgcmVsYXRpdmUgbHVtaW5hbmNlIG9mIDgtYml0IHNSR0IuICovXG5jb25zdCBsdW1pbmFuY2UgPSAoW3IsIGcsIGJdKSA9PiB7XG5cdGNvbnN0IGNoYW5uZWwgPSAoYykgPT4ge1xuXHRcdGNvbnN0IHMgPSBjIC8gMjU1O1xuXHRcdHJldHVybiBzIDw9IDAuMDM5MjggPyBzIC8gMTIuOTIgOiAoKHMgKyAwLjA1NSkgLyAxLjA1NSkgKiogMi40O1xuXHR9O1xuXHRyZXR1cm4gMC4yMTI2ICogY2hhbm5lbChyKSArIDAuNzE1MiAqIGNoYW5uZWwoZykgKyAwLjA3MjIgKiBjaGFubmVsKGIpO1xufTtcbmNvbnN0IHJhdGlvID0gKGEsIGIpID0+IHtcblx0Y29uc3QgW2hpLCBsb10gPSBbbHVtaW5hbmNlKGEpLCBsdW1pbmFuY2UoYildLnNvcnQoKHgsIHkpID0+IHkgLSB4KTtcblx0cmV0dXJuIChoaSArIDAuMDUpIC8gKGxvICsgMC4wNSk7XG59O1xuLyoqIEEgdHJhbnNsdWNlbnQgY29sb3IgcGFpbnRlZCBvdmVyIGFuIG9wYXF1ZSBvbmUuICovXG5jb25zdCBvdmVyID0gKFtyLCBnLCBiLCBhXSwgW2JyLCBiZywgYmJdKSA9PiB7XG5cdGNvbnN0IHQgPSBhIC8gMjU1O1xuXHRyZXR1cm4gW01hdGgucm91bmQociAqIHQgKyBiciAqICgxIC0gdCkpLCBNYXRoLnJvdW5kKGcgKiB0ICsgYmcgKiAoMSAtIHQpKSwgTWF0aC5yb3VuZChiICogdCArIGJiICogKDEgLSB0KSksIDI1NV07XG59O1xuXG5jb25zdCBTVFlMRVMgPSBgXG46aG9zdCB7XG5cdGFsbDogaW5pdGlhbDtcblx0Y29sb3Itc2NoZW1lOiBsaWdodCBkYXJrO1xuXHQtLXRwLWJnOiBsaWdodC1kYXJrKCNmZmYsICMxZDFmMjcpO1xuXHQtLXRwLXRleHQ6IGxpZ2h0LWRhcmsoIzFkMWYyNywgI2VjZWVmNCk7XG5cdC0tdHAtbXV0ZWQ6IGxpZ2h0LWRhcmsoIzU1NWI2ZSwgI2E5YWVjMCk7XG5cdC0tdHAtbGluZTogbGlnaHQtZGFyaygjYzRjOGQ0LCAjNDU0OTU5KTtcblx0LS10cC1mb2N1czogbGlnaHQtZGFyaygjMGI1N2QwLCAjOGFiNGY4KTtcblx0LS10cC1nb29kOiBsaWdodC1kYXJrKCMxZDZiM2MsICM4NmQ3YTQpO1xuXHQtLXRwLWJhZDogbGlnaHQtZGFyaygjYTMyNjFhLCAjZmY5ZDhmKTtcblx0LS10cC1nYXA6IDAuNzVyZW07XG5cdGZvbnQ6IDAuODc1cmVtLzEuNDUgc3lzdGVtLXVpLCBzYW5zLXNlcmlmO1xufVxuXG4qIHsgYm94LXNpemluZzogYm9yZGVyLWJveDsgfVxuXG46Zm9jdXMtdmlzaWJsZSB7XG5cdG91dGxpbmU6IDJweCBzb2xpZCB2YXIoLS10cC1mb2N1cyk7XG5cdG91dGxpbmUtb2Zmc2V0OiAycHg7XG59XG5cbmJ1dHRvbiwgaW5wdXQsIHNlbGVjdCB7IGZvbnQ6IGluaGVyaXQ7IGNvbG9yOiBpbmhlcml0OyB9XG5cbmJ1dHRvbiB7XG5cdG1pbi1ibG9jay1zaXplOiAycmVtO1xuXHRtaW4taW5saW5lLXNpemU6IDJyZW07XG5cdHBhZGRpbmctaW5saW5lOiAwLjc1cmVtO1xuXHRib3JkZXI6IDFweCBzb2xpZCB2YXIoLS10cC1saW5lKTtcblx0Ym9yZGVyLXJhZGl1czogMC4zNzVyZW07XG5cdGJhY2tncm91bmQ6IHZhcigtLXRwLWJnKTtcblx0Y3Vyc29yOiBwb2ludGVyO1xufVxuXG5idXR0b246ZGlzYWJsZWQgeyBvcGFjaXR5OiAwLjU7IGN1cnNvcjogbm90LWFsbG93ZWQ7IH1cblxuW2hpZGRlbl0geyBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7IH1cblxuLmxhdW5jaGVyIHtcblx0cG9zaXRpb246IGZpeGVkO1xuXHRpbnNldC1pbmxpbmUtZW5kOiAwO1xuXHRpbnNldC1ibG9jay1zdGFydDogNTAlO1xuXHR0cmFuc2xhdGU6IDAgLTUwJTtcblx0ei1pbmRleDogMjE0NzQ4MzY0Njtcblx0d3JpdGluZy1tb2RlOiB2ZXJ0aWNhbC1ybDtcblx0cGFkZGluZzogMC43NXJlbSAwLjRyZW07XG5cdGJvcmRlci1pbmxpbmUtZW5kOiAwO1xuXHRib3JkZXItc3RhcnQtZW5kLXJhZGl1czogMDtcblx0Ym9yZGVyLWVuZC1lbmQtcmFkaXVzOiAwO1xuXHRjb2xvcjogdmFyKC0tdHAtdGV4dCk7XG5cdGJveC1zaGFkb3c6IDAgMnB4IDhweCByZ2IoMCAwIDAgLyAyMCUpO1xufVxuXG4ucGFuZWwge1xuXHRwb3NpdGlvbjogZml4ZWQ7XG5cdGluc2V0OiBhdXRvO1xuXHRpbnNldC1pbmxpbmUtZW5kOiB2YXIoLS10cC1nYXApO1xuXHRpbnNldC1ibG9jay1zdGFydDogNTAlO1xuXHR0cmFuc2xhdGU6IDAgLTUwJTtcblx0bWFyZ2luOiAwO1xuXHR6LWluZGV4OiAyMTQ3NDgzNjQ3O1xuXHRpbmxpbmUtc2l6ZTogbWluKDIycmVtLCAxMDB2dyAtIDIgKiB2YXIoLS10cC1nYXApKTtcblx0bWF4LWJsb2NrLXNpemU6IGNhbGMoMTAwZHZoIC0gMiAqIHZhcigtLXRwLWdhcCkpO1xuXHRvdmVyZmxvdzogYXV0bztcblx0b3ZlcnNjcm9sbC1iZWhhdmlvcjogY29udGFpbjtcblx0c2Nyb2xsYmFyLWd1dHRlcjogc3RhYmxlO1xuXHRwYWRkaW5nOiAwO1xuXHRib3JkZXI6IDFweCBzb2xpZCB2YXIoLS10cC1saW5lKTtcblx0Ym9yZGVyLXJhZGl1czogMC41cmVtO1xuXHRiYWNrZ3JvdW5kOiB2YXIoLS10cC1iZyk7XG5cdGNvbG9yOiB2YXIoLS10cC10ZXh0KTtcblx0Ym94LXNoYWRvdzogMCA4cHggMjhweCByZ2IoMCAwIDAgLyAyNSUpO1xuXHRjb250YWluZXItdHlwZTogaW5saW5lLXNpemU7XG5cblx0b3BhY2l0eTogMTtcblx0dHJhbnNmb3JtOiBub25lO1xuXHR0cmFuc2l0aW9uLXByb3BlcnR5OiBvcGFjaXR5LCB0cmFuc2Zvcm0sIGRpc3BsYXksIG92ZXJsYXk7XG5cdHRyYW5zaXRpb24tZHVyYXRpb246IDAuMnM7XG5cdHRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOiBlYXNlLW91dDtcblx0dHJhbnNpdGlvbi1iZWhhdmlvcjogYWxsb3ctZGlzY3JldGU7XG59XG5cbi5wYW5lbDpub3QoW3BvcG92ZXJdKSB7IGRpc3BsYXk6IGJsb2NrOyB9XG5cbi5wYW5lbDpwb3BvdmVyLW9wZW4ge1xuXHRAc3RhcnRpbmctc3R5bGUge1xuXHRcdG9wYWNpdHk6IDA7XG5cdFx0dHJhbnNmb3JtOiB0cmFuc2xhdGVYKDFyZW0pO1xuXHR9XG59XG5cbi5wYW5lbFtwb3BvdmVyXTpub3QoOnBvcG92ZXItb3Blbikge1xuXHRvcGFjaXR5OiAwO1xuXHR0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoMXJlbSk7XG59XG5cbkBtZWRpYSAod2lkdGggPCA0MHJlbSkge1xuXHQucGFuZWwge1xuXHRcdGluc2V0LWlubGluZTogMDtcblx0XHRpbnNldC1ibG9jazogYXV0byAwO1xuXHRcdHRyYW5zbGF0ZTogbm9uZTtcblx0XHRpbmxpbmUtc2l6ZTogMTAwJTtcblx0XHRtYXgtYmxvY2stc2l6ZTogNzBkdmg7XG5cdFx0Ym9yZGVyLWVuZC1zdGFydC1yYWRpdXM6IDA7XG5cdFx0Ym9yZGVyLWVuZC1lbmQtcmFkaXVzOiAwO1xuXHRcdHBhZGRpbmctYmxvY2stZW5kOiBlbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSk7XG5cdH1cbn1cblxuLm1haW4gPiBzdW1tYXJ5IHtcblx0cG9zaXRpb246IHN0aWNreTtcblx0aW5zZXQtYmxvY2stc3RhcnQ6IDA7XG5cdHotaW5kZXg6IDE7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdGdhcDogMC41cmVtO1xuXHRwYWRkaW5nLWJsb2NrOiAwLjVyZW07XG5cdHBhZGRpbmctaW5saW5lOiAwLjc1cmVtIDNyZW07XG5cdGJhY2tncm91bmQ6IHZhcigtLXRwLWJnKTtcblx0Ym9yZGVyLWJsb2NrLWVuZDogMXB4IHNvbGlkIHZhcigtLXRwLWxpbmUpO1xuXHRjdXJzb3I6IHBvaW50ZXI7XG59XG5cbi5tYWluOm5vdChbb3Blbl0pID4gc3VtbWFyeSB7IGJvcmRlci1ibG9jay1lbmQ6IDA7IH1cblxuaDIgeyBtYXJnaW46IDA7IGZvbnQtc2l6ZTogMXJlbTsgfVxuXG4uZmxhZyB7IGZvbnQtc2l6ZTogMC43NXJlbTsgY29sb3I6IHZhcigtLXRwLW11dGVkKTsgfVxuXG4uY2xvc2Uge1xuXHRwb3NpdGlvbjogYWJzb2x1dGU7XG5cdGluc2V0LWJsb2NrLXN0YXJ0OiAwLjM3NXJlbTtcblx0aW5zZXQtaW5saW5lLWVuZDogMC4zNzVyZW07XG5cdHotaW5kZXg6IDI7XG5cdHBhZGRpbmc6IDA7XG59XG5cbi5ib2R5IHtcblx0ZGlzcGxheTogZ3JpZDtcblx0Z2FwOiAwLjc1cmVtO1xuXHRwYWRkaW5nOiAwLjc1cmVtO1xufVxuXG5maWVsZHNldCB7XG5cdG1hcmdpbjogMDtcblx0cGFkZGluZzogMC41cmVtIDAuNzVyZW0gMC43NXJlbTtcblx0Ym9yZGVyOiAxcHggc29saWQgdmFyKC0tdHAtbGluZSk7XG5cdGJvcmRlci1yYWRpdXM6IDAuMzc1cmVtO1xuXHRkaXNwbGF5OiBncmlkO1xuXHRnYXA6IDAuNXJlbTtcbn1cblxubGVnZW5kIHsgcGFkZGluZy1pbmxpbmU6IDAuMjVyZW07IGZvbnQtd2VpZ2h0OiA2MDA7IH1cblxuLm1vZGVzIHsgZGlzcGxheTogZmxleDsgZ2FwOiAxcmVtOyB9XG5cbi5yb3cge1xuXHRkaXNwbGF5OiBncmlkO1xuXHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDIuMjVyZW0gMWZyO1xuXHRncmlkLXRlbXBsYXRlLWFyZWFzOiBcInN3YXRjaCBsYWJlbFwiIFwic3dhdGNoIHZhbHVlXCIgXCIuIGNvbnRyYXN0XCI7XG5cdGNvbHVtbi1nYXA6IDAuNXJlbTtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcbn1cblxuLnJvdyBsYWJlbCB7IGdyaWQtYXJlYTogbGFiZWw7IH1cbi5yb3cgaW5wdXRbdHlwZT1cImNvbG9yXCJdIHtcblx0Z3JpZC1hcmVhOiBzd2F0Y2g7XG5cdGlubGluZS1zaXplOiAyLjI1cmVtO1xuXHRibG9jay1zaXplOiAyLjI1cmVtO1xuXHRwYWRkaW5nOiAwO1xuXHRib3JkZXI6IDFweCBzb2xpZCB2YXIoLS10cC1saW5lKTtcblx0Ym9yZGVyLXJhZGl1czogMC4zNzVyZW07XG5cdGJhY2tncm91bmQ6IG5vbmU7XG5cdGZvcmNlZC1jb2xvci1hZGp1c3Q6IG5vbmU7XG59XG4ucm93IGlucHV0W3R5cGU9XCJ0ZXh0XCJdIHtcblx0Z3JpZC1hcmVhOiB2YWx1ZTtcblx0aW5saW5lLXNpemU6IDEwMCU7XG5cdG1pbi1ibG9jay1zaXplOiAxLjc1cmVtO1xuXHRwYWRkaW5nLWlubGluZTogMC4zNzVyZW07XG5cdGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLXRwLWxpbmUpO1xuXHRib3JkZXItcmFkaXVzOiAwLjI1cmVtO1xuXHRiYWNrZ3JvdW5kOiB2YXIoLS10cC1iZyk7XG5cdGZvbnQtZmFtaWx5OiB1aS1tb25vc3BhY2UsIG1vbm9zcGFjZTtcblx0Zm9udC1zaXplOiAwLjgxMjVyZW07XG59XG4ucm93IGlucHV0W3R5cGU9XCJ0ZXh0XCJdOnVzZXItaW52YWxpZCB7IGJvcmRlci1jb2xvcjogdmFyKC0tdHAtYmFkKTsgfVxuLnJvdyBvdXRwdXQgeyBncmlkLWFyZWE6IGNvbnRyYXN0OyBmb250LXNpemU6IDAuNzVyZW07IH1cbi5yb3cgb3V0cHV0W2RhdGEtcGFzcz1cInRydWVcIl0geyBjb2xvcjogdmFyKC0tdHAtZ29vZCk7IH1cbi5yb3cgb3V0cHV0W2RhdGEtcGFzcz1cImZhbHNlXCJdIHsgY29sb3I6IHZhcigtLXRwLWJhZCk7IH1cbi5yb2xlIHsgZ3JpZC1jb2x1bW46IDI7IGZvbnQtc2l6ZTogMC43NXJlbTsgY29sb3I6IHZhcigtLXRwLW11dGVkKTsgfVxuXG4uYWR2YW5jZWQgPiBzdW1tYXJ5IHsgY3Vyc29yOiBwb2ludGVyOyBmb250LXdlaWdodDogNjAwOyB9XG4uYWR2YW5jZWRbb3Blbl0gPiBzdW1tYXJ5IHsgbWFyZ2luLWJsb2NrLWVuZDogMC41cmVtOyB9XG4uYWR2YW5jZWQgPiBkaXYgeyBkaXNwbGF5OiBncmlkOyBnYXA6IDAuNzVyZW07IH1cblxuLnN0b3BzIHsgZGlzcGxheTogZ3JpZDsgZ2FwOiAwLjVyZW07IH1cbi5zdG9wIHsgZGlzcGxheTogZmxleDsgZ2FwOiAwLjVyZW07IGFsaWduLWl0ZW1zOiBjZW50ZXI7IH1cblxubWVudSB7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGZsZXgtd3JhcDogd3JhcDtcblx0Z2FwOiAwLjVyZW07XG5cdG1hcmdpbjogMDtcblx0cGFkZGluZzogMDtcblx0bGlzdC1zdHlsZTogbm9uZTtcbn1cblxuLnNhdmUgeyBmb250LXdlaWdodDogNjAwOyB9XG5cbi5zdGF0dXMgeyBtaW4tYmxvY2stc2l6ZTogMS4yNXJlbTsgZm9udC1zaXplOiAwLjgxMjVyZW07IH1cblxuLnByb2JlIHsgcG9zaXRpb246IGFic29sdXRlOyBpbmxpbmUtc2l6ZTogMDsgYmxvY2stc2l6ZTogMDsgb3ZlcmZsb3c6IGhpZGRlbjsgfVxuXG5AY29udGFpbmVyIChpbmxpbmUtc2l6ZSA8IDE2cmVtKSB7XG5cdC5yb3cgeyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmcjsgZ3JpZC10ZW1wbGF0ZS1hcmVhczogXCJsYWJlbFwiIFwic3dhdGNoXCIgXCJ2YWx1ZVwiIFwiY29udHJhc3RcIjsgfVxuXHQucm9sZSB7IGdyaWQtY29sdW1uOiAxOyB9XG59XG5cbkBzdXBwb3J0cyAoaW50ZXJwb2xhdGUtc2l6ZTogYWxsb3cta2V5d29yZHMpIHtcblx0Omhvc3QgeyBpbnRlcnBvbGF0ZS1zaXplOiBhbGxvdy1rZXl3b3JkczsgfVxuXHQubWFpbjo6ZGV0YWlscy1jb250ZW50IHtcblx0XHRibG9jay1zaXplOiAwO1xuXHRcdG92ZXJmbG93OiBjbGlwO1xuXHRcdHRyYW5zaXRpb246IGJsb2NrLXNpemUgMC4ycyBlYXNlLW91dCwgY29udGVudC12aXNpYmlsaXR5IDAuMnM7XG5cdFx0dHJhbnNpdGlvbi1iZWhhdmlvcjogYWxsb3ctZGlzY3JldGU7XG5cdH1cblx0Lm1haW5bb3Blbl06OmRldGFpbHMtY29udGVudCB7IGJsb2NrLXNpemU6IGF1dG87IH1cbn1cblxuQG1lZGlhIChwcmVmZXJzLXJlZHVjZWQtbW90aW9uOiByZWR1Y2UpIHtcblx0LnBhbmVsLCAucGFuZWw6cG9wb3Zlci1vcGVuLCAucGFuZWxbcG9wb3Zlcl06bm90KDpwb3BvdmVyLW9wZW4pIHsgdHJhbnNmb3JtOiBub25lOyB0cmFuc2l0aW9uLWR1cmF0aW9uOiAwLjAxczsgfVxuXHQubWFpbjo6ZGV0YWlscy1jb250ZW50IHsgdHJhbnNpdGlvbjogbm9uZTsgfVxufVxuYDtcblxuY2xhc3MgVGhlbWVQYW5lbCBleHRlbmRzIEhUTUxFbGVtZW50IHtcblx0YXN5bmMgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG5cdFx0aWYgKHRoaXMuc2hhZG93Um9vdCkgcmV0dXJuO1xuXHRcdGxldCBkYXRhO1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKEVORFBPSU5ULCB7IGNhY2hlOiBcIm5vLXN0b3JlXCIgfSk7XG5cdFx0XHRpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IoU3RyaW5nKHJlc3BvbnNlLnN0YXR1cykpO1xuXHRcdFx0ZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcblx0XHR9IGNhdGNoIHtcblx0XHRcdC8vIE5vIGRldiBzZXJ2ZXIgZW5kcG9pbnQgKGEgc3RhdGljIGJ1aWxkKTogdGhlcmUgaXMgbm90aGluZyB0byBzYXZlIHRvLlxuXHRcdFx0dGhpcy5yZW1vdmUoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5jb250ZXh0ID0gdGhpcy5nZXRBdHRyaWJ1dGUoXCJjb250ZXh0XCIpID09PSBcImRlY2tcIiA/IFwiZGVja1wiIDogXCJzaXRlXCI7XG5cdFx0dGhpcy50b2tlbnMgPSBkYXRhLnRva2Vucy5maWx0ZXIoKHRva2VuKSA9PiB0b2tlblt0aGlzLmNvbnRleHRdKTtcblx0XHR0aGlzLnJvbGVzID0gT2JqZWN0LmZyb21FbnRyaWVzKHRoaXMudG9rZW5zLm1hcCgodG9rZW4pID0+IFt0b2tlbi5rZXksIHRva2VuLnJvbGVdKSk7XG5cdFx0dGhpcy5kZWZhdWx0R3JhZGllbnQgPSBkYXRhLmdyYWRpZW50O1xuXHRcdHRoaXMuZmlsZSA9IGRhdGEuZmlsZTtcblx0XHR0aGlzLnNhdmVkID0gZGF0YS50aGVtZTtcblx0XHR0aGlzLmRyYWZ0ID0gcmVhZChzZXNzaW9uU3RvcmFnZSwgXCJkcmFmdFwiLCBudWxsKSA/PyBjbG9uZSh0aGlzLnNhdmVkKTtcblx0XHR0aGlzLmhpc3RvcnkgPSBbXTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHRcdHRoaXMuYXBwbHlQcmV2aWV3KCk7XG5cdFx0dGhpcy5yZWZyZXNoKCk7XG5cdH1cblxuXHQvKiogQHJldHVybnMge3N0cmluZ30gKi9cblx0Z2V0IG1vZGUoKSB7XG5cdFx0Y29uc3QgZm9yY2VkID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLmNvbG9yU2NoZW1lO1xuXHRcdGlmIChmb3JjZWQgPT09IFwibGlnaHRcIiB8fCBmb3JjZWQgPT09IFwiZGFya1wiKSByZXR1cm4gZm9yY2VkO1xuXHRcdHJldHVybiBtYXRjaE1lZGlhKFwiKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKVwiKS5tYXRjaGVzID8gXCJkYXJrXCIgOiBcImxpZ2h0XCI7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0Y29uc3Qgcm9vdCA9IHRoaXMuYXR0YWNoU2hhZG93KHsgbW9kZTogXCJvcGVuXCIgfSk7XG5cdFx0Y29uc3Qgc3VwcG9ydHNQb3BvdmVyID0gXCJwb3BvdmVyXCIgaW4gSFRNTEVsZW1lbnQucHJvdG90eXBlO1xuXHRcdHJvb3QuaW5uZXJIVE1MID0gYFxuXHRcdFx0PHN0eWxlPiR7U1RZTEVTfTwvc3R5bGU+XG5cdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImxhdW5jaGVyXCIgJHtzdXBwb3J0c1BvcG92ZXIgPyAncG9wb3ZlcnRhcmdldD1cInBhbmVsXCIgcG9wb3ZlcnRhcmdldGFjdGlvbj1cInNob3dcIicgOiBcIlwifT5UaGVtZTwvYnV0dG9uPlxuXHRcdFx0PGFzaWRlIGNsYXNzPVwicGFuZWxcIiBpZD1cInBhbmVsXCIgJHtzdXBwb3J0c1BvcG92ZXIgPyAncG9wb3Zlcj1cIm1hbnVhbFwiJyA6IFwiaGlkZGVuXCJ9IGFyaWEtbGFiZWxsZWRieT1cInRpdGxlXCI+XG5cdFx0XHRcdDxkZXRhaWxzIGNsYXNzPVwibWFpblwiIG9wZW4+XG5cdFx0XHRcdFx0PHN1bW1hcnk+PGgyIGlkPVwidGl0bGVcIj5UaGVtZTwvaDI+PHNwYW4gY2xhc3M9XCJmbGFnXCIgaGlkZGVuPlVuc2F2ZWQgY2hhbmdlczwvc3Bhbj48L3N1bW1hcnk+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImJvZHlcIj5cblx0XHRcdFx0XHRcdDxmaWVsZHNldCBjbGFzcz1cIm1vZGVzLXNldFwiPlxuXHRcdFx0XHRcdFx0XHQ8bGVnZW5kPlByZXZpZXc8L2xlZ2VuZD5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cIm1vZGVzXCI+XG5cdFx0XHRcdFx0XHRcdFx0PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwibW9kZVwiIHZhbHVlPVwibGlnaHRcIj4gTGlnaHQ8L2xhYmVsPlxuXHRcdFx0XHRcdFx0XHRcdDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cIm1vZGVcIiB2YWx1ZT1cImRhcmtcIj4gRGFyazwvbGFiZWw+XG5cdFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdFx0PC9maWVsZHNldD5cblx0XHRcdFx0XHRcdCR7R1JPVVBTLm1hcCgoZ3JvdXApID0+IHRoaXMuZmllbGRzZXQoZ3JvdXAubGVnZW5kLCBncm91cC50b2tlbnMuZmlsdGVyKChba2V5XSkgPT4gdGhpcy5yb2xlc1trZXldKSkpLmpvaW4oXCJcIil9XG5cdFx0XHRcdFx0XHQ8ZGV0YWlscyBjbGFzcz1cImFkdmFuY2VkXCIgbmFtZT1cInRoZW1lLXBhbmVsLXNlY3Rpb25cIj5cblx0XHRcdFx0XHRcdFx0PHN1bW1hcnk+RXZlcnkgY29sb3I8L3N1bW1hcnk+XG5cdFx0XHRcdFx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0XHRcdFx0JHt0aGlzLmZpZWxkc2V0KFwiQWxsIHRva2Vuc1wiLCB0aGlzLnRva2Vucy5tYXAoKHRva2VuKSA9PiBbdG9rZW4ua2V5LCB0b2tlbi5yb2xlXSksIHRydWUpfVxuXHRcdFx0XHRcdFx0XHRcdCR7dGhpcy5jb250ZXh0ID09PSBcInNpdGVcIiA/IFwiPGZpZWxkc2V0PjxsZWdlbmQ+R3JhZGllbnQ8L2xlZ2VuZD48ZGl2IGNsYXNzPVxcXCJzdG9wc1xcXCI+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGRhdGEtYWN0aW9uPVxcXCJhZGQtc3RvcFxcXCI+QWRkIGEgY29sb3I8L2J1dHRvbj48L2ZpZWxkc2V0PlwiIDogXCJcIn1cblx0XHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0XHQ8L2RldGFpbHM+XG5cdFx0XHRcdFx0XHQ8bWVudT5cblx0XHRcdFx0XHRcdFx0PGxpPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwidW5kb1wiPlVuZG88L2J1dHRvbj48L2xpPlxuXHRcdFx0XHRcdFx0XHQ8bGk+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJyZXNldFwiPlJlc2V0PC9idXR0b24+PC9saT5cblx0XHRcdFx0XHRcdFx0PGxpPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwic2F2ZVwiIGRhdGEtYWN0aW9uPVwic2F2ZVwiPlNhdmU8L2J1dHRvbj48L2xpPlxuXHRcdFx0XHRcdFx0XHQ8bGk+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJkb3dubG9hZFwiPkRvd25sb2FkPC9idXR0b24+PC9saT5cblx0XHRcdFx0XHRcdDwvbWVudT5cblx0XHRcdFx0XHRcdDxvdXRwdXQgY2xhc3M9XCJzdGF0dXNcIiByb2xlPVwic3RhdHVzXCI+PC9vdXRwdXQ+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvZGV0YWlscz5cblx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjbG9zZVwiIGFyaWEtbGFiZWw9XCJIaWRlIHRoZSB0aGVtZSBwYW5lbFwiICR7c3VwcG9ydHNQb3BvdmVyID8gJ3BvcG92ZXJ0YXJnZXQ9XCJwYW5lbFwiIHBvcG92ZXJ0YXJnZXRhY3Rpb249XCJoaWRlXCInIDogXCJcIn0+JnRpbWVzOzwvYnV0dG9uPlxuXHRcdFx0PC9hc2lkZT5cblx0XHRcdDxkaXYgY2xhc3M9XCJwcm9iZVwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvZGl2PmA7XG5cblx0XHR0aGlzLnBhbmVsID0gcm9vdC5xdWVyeVNlbGVjdG9yKFwiLnBhbmVsXCIpO1xuXHRcdHRoaXMubWFpbiA9IHJvb3QucXVlcnlTZWxlY3RvcihcIi5tYWluXCIpO1xuXHRcdHRoaXMuc3RhdHVzID0gcm9vdC5xdWVyeVNlbGVjdG9yKFwiLnN0YXR1c1wiKTtcblxuXHRcdGNvbnN0IG9wZW4gPSByZWFkKGxvY2FsU3RvcmFnZSwgXCJvcGVuXCIsIGZhbHNlKTtcblx0XHRjb25zdCBleHBhbmRlZCA9IHJlYWQobG9jYWxTdG9yYWdlLCBcImV4cGFuZGVkXCIsIHRydWUpO1xuXHRcdHRoaXMubWFpbi5vcGVuID0gZXhwYW5kZWQ7XG5cdFx0aWYgKG9wZW4pIHRoaXMuc2hvdygpO1xuXG5cdFx0aWYgKCFzdXBwb3J0c1BvcG92ZXIpIHtcblx0XHRcdHJvb3QucXVlcnlTZWxlY3RvcihcIi5sYXVuY2hlclwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zaG93KCkpO1xuXHRcdFx0cm9vdC5xdWVyeVNlbGVjdG9yKFwiLmNsb3NlXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSk7XG5cdFx0fVxuXHRcdGNvbnN0IGxhdW5jaGVyID0gcm9vdC5xdWVyeVNlbGVjdG9yKFwiLmxhdW5jaGVyXCIpO1xuXHRcdHRoaXMucGFuZWwuYWRkRXZlbnRMaXN0ZW5lcihcInRvZ2dsZVwiLCAoZXZlbnQpID0+IHtcblx0XHRcdGxhdW5jaGVyLmhpZGRlbiA9IGV2ZW50Lm5ld1N0YXRlID09PSBcIm9wZW5cIjtcblx0XHRcdHdyaXRlKGxvY2FsU3RvcmFnZSwgXCJvcGVuXCIsIGV2ZW50Lm5ld1N0YXRlID09PSBcIm9wZW5cIik7XG5cdFx0fSk7XG5cdFx0dGhpcy5tYWluLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b2dnbGVcIiwgKCkgPT4gd3JpdGUobG9jYWxTdG9yYWdlLCBcImV4cGFuZGVkXCIsIHRoaXMubWFpbi5vcGVuKSk7XG5cdFx0dGhpcy5wYW5lbC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZXZlbnQpID0+IHtcblx0XHRcdGlmIChldmVudC5rZXkgPT09IFwiRXNjYXBlXCIgJiYgdGhpcy5tYWluLm9wZW4pIHtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0dGhpcy5tYWluLm9wZW4gPSBmYWxzZTtcblx0XHRcdFx0dGhpcy5tYWluLnF1ZXJ5U2VsZWN0b3IoXCJzdW1tYXJ5XCIpLmZvY3VzKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRmb3IgKGNvbnN0IHJhZGlvIG9mIHJvb3QucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbbmFtZT1cIm1vZGVcIl0nKSkge1xuXHRcdFx0cmFkaW8uY2hlY2tlZCA9IHJhZGlvLnZhbHVlID09PSB0aGlzLm1vZGU7XG5cdFx0XHRyYWRpby5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcblx0XHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLmNvbG9yU2NoZW1lID0gcmFkaW8udmFsdWU7XG5cdFx0XHRcdHRoaXMucmVmcmVzaCgpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cm9vdC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKGV2ZW50KSA9PiB7XG5cdFx0XHRjb25zdCBpbnB1dCA9IGV2ZW50LnRhcmdldDtcblx0XHRcdGlmICghaW5wdXQuZGF0YXNldC5rZXkpIHJldHVybjtcblx0XHRcdGlmIChpbnB1dC50eXBlID09PSBcImNvbG9yXCIpIHRoaXMuc2V0KGlucHV0LmRhdGFzZXQua2V5LCBpbnB1dC52YWx1ZSk7XG5cdFx0fSk7XG5cdFx0cm9vdC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIChldmVudCkgPT4ge1xuXHRcdFx0Y29uc3QgaW5wdXQgPSBldmVudC50YXJnZXQ7XG5cdFx0XHRpZiAoaW5wdXQudHlwZSAhPT0gXCJ0ZXh0XCIpIHJldHVybjtcblx0XHRcdGlmIChpbnB1dC5kYXRhc2V0LnN0b3AgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuc2V0U3RvcChOdW1iZXIoaW5wdXQuZGF0YXNldC5zdG9wKSwgaW5wdXQudmFsdWUudHJpbSgpKTtcblx0XHRcdGlmICghaW5wdXQuZGF0YXNldC5rZXkpIHJldHVybjtcblx0XHRcdGNvbnN0IHZhbHVlID0gaW5wdXQudmFsdWUudHJpbSgpO1xuXHRcdFx0aW5wdXQuc2V0Q3VzdG9tVmFsaWRpdHkoQ1NTLnN1cHBvcnRzKFwiY29sb3JcIiwgdmFsdWUpID8gXCJcIiA6IFwiTm90IGEgQ1NTIGNvbG9yXCIpO1xuXHRcdFx0aWYgKGlucHV0LmNoZWNrVmFsaWRpdHkoKSkgdGhpcy5zZXQoaW5wdXQuZGF0YXNldC5rZXksIHZhbHVlKTtcblx0XHRcdGVsc2UgaW5wdXQucmVwb3J0VmFsaWRpdHkoKTtcblx0XHR9KTtcblx0XHRyb290LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZXZlbnQpID0+IHtcblx0XHRcdGNvbnN0IGFjdGlvbiA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtYWN0aW9uXVwiKT8uZGF0YXNldC5hY3Rpb247XG5cdFx0XHRpZiAoYWN0aW9uKSB0aGlzW2FjdGlvbiA9PT0gXCJhZGQtc3RvcFwiID8gXCJhZGRTdG9wXCIgOiBhY3Rpb24gPT09IFwicmVtb3ZlLXN0b3BcIiA/IFwicmVtb3ZlU3RvcFwiIDogYWN0aW9uXShldmVudC50YXJnZXQuY2xvc2VzdChcIltkYXRhLWFjdGlvbl1cIikpO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBsZWdlbmRcblx0ICogQHBhcmFtIHtbc3RyaW5nLCBzdHJpbmddW119IHRva2VucyBrZXkgYW5kIGxhYmVsXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gW3JvbGVzXSBsYWJlbCByb3dzIGJ5IHRva2VuIG5hbWUgYW5kIHNob3cgdGhlIHJvbGVcblx0ICovXG5cdGZpZWxkc2V0KGxlZ2VuZCwgdG9rZW5zLCByb2xlcyA9IGZhbHNlKSB7XG5cdFx0Y29uc3Qgcm93cyA9IHRva2Vucy5tYXAoKFtrZXksIGxhYmVsXSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSBgJHtyb2xlcyA/IFwiYWxsXCIgOiBcIm1haW5cIn0tJHtrZXl9YDtcblx0XHRcdGNvbnN0IG5hbWUgPSByb2xlcyA/IGAtLWNvbG9yLSR7a2V5fWAgOiBsYWJlbDtcblx0XHRcdHJldHVybiBgPGRpdiBjbGFzcz1cInJvd1wiPlxuXHRcdFx0XHQ8bGFiZWwgZm9yPVwiJHtpZH1cIj4ke25hbWV9PC9sYWJlbD5cblx0XHRcdFx0PGlucHV0IHR5cGU9XCJjb2xvclwiIGlkPVwiJHtpZH1cIiBkYXRhLWtleT1cIiR7a2V5fVwiIHRpdGxlPVwiJHt0aGlzLnJvbGVzW2tleV19XCI+XG5cdFx0XHRcdDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEta2V5PVwiJHtrZXl9XCIgYXJpYS1sYWJlbD1cIiR7bmFtZX0sIENTUyB2YWx1ZVwiIHNwZWxsY2hlY2s9XCJmYWxzZVwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiPlxuXHRcdFx0XHQke3JvbGVzID8gYDxzcGFuIGNsYXNzPVwicm9sZVwiPiR7bGFiZWx9PC9zcGFuPmAgOiBgPG91dHB1dCBmb3I9XCIke2lkfVwiIGRhdGEtY29udHJhc3Q9XCIke2tleX1cIj48L291dHB1dD5gfVxuXHRcdFx0PC9kaXY+YDtcblx0XHR9KTtcblx0XHRyZXR1cm4gYDxmaWVsZHNldD48bGVnZW5kPiR7bGVnZW5kfTwvbGVnZW5kPiR7cm93cy5qb2luKFwiXCIpfTwvZmllbGRzZXQ+YDtcblx0fVxuXG5cdHNob3coKSB7XG5cdFx0aWYgKHRoaXMucGFuZWwuc2hvd1BvcG92ZXIpIHRoaXMucGFuZWwuc2hvd1BvcG92ZXIoKTtcblx0XHRlbHNlIHRoaXMucGFuZWwuaGlkZGVuID0gZmFsc2U7XG5cdFx0dGhpcy5zaGFkb3dSb290LnF1ZXJ5U2VsZWN0b3IoXCIubGF1bmNoZXJcIikuaGlkZGVuID0gdHJ1ZTtcblx0XHR3cml0ZShsb2NhbFN0b3JhZ2UsIFwib3BlblwiLCB0cnVlKTtcblx0fVxuXG5cdGhpZGUoKSB7XG5cdFx0aWYgKHRoaXMucGFuZWwuaGlkZVBvcG92ZXIpIHRoaXMucGFuZWwuaGlkZVBvcG92ZXIoKTtcblx0XHRlbHNlIHRoaXMucGFuZWwuaGlkZGVuID0gdHJ1ZTtcblx0XHR0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcihcIi5sYXVuY2hlclwiKS5oaWRkZW4gPSBmYWxzZTtcblx0XHR3cml0ZShsb2NhbFN0b3JhZ2UsIFwib3BlblwiLCBmYWxzZSk7XG5cdH1cblxuXHQvKiogVGhlIHNjb3BlIGEga2V5IGlzIGVkaXRlZCBpbjogdGhpcyBjb250ZXh0J3Mgc2VjdGlvbiBpZiBpdCBhbHJlYWR5IGhvbGRzIHRoZSBrZXksIGVsc2UgdGhlIHRvcCBsZXZlbC4gKi9cblx0c2NvcGUoa2V5KSB7XG5cdFx0cmV0dXJuIHRoaXMuZHJhZnRbdGhpcy5jb250ZXh0XSAmJiBrZXkgaW4gdGhpcy5kcmFmdFt0aGlzLmNvbnRleHRdID8gdGhpcy5kcmFmdFt0aGlzLmNvbnRleHRdIDogdGhpcy5kcmFmdDtcblx0fVxuXG5cdC8qKiBUaGUgcmVzb2x2ZWQgUkdCQSBvZiBhIENTUyBjb2xvciBpbiBvbmUgbW9kZS4gKi9cblx0cmVzb2x2ZSh2YWx1ZSwgbW9kZSkge1xuXHRcdGNvbnN0IHByb2JlID0gdGhpcy5zaGFkb3dSb290LnF1ZXJ5U2VsZWN0b3IoXCIucHJvYmVcIik7XG5cdFx0cHJvYmUuc3R5bGUuY29sb3JTY2hlbWUgPSBtb2RlO1xuXHRcdHByb2JlLnN0eWxlLmNvbG9yID0gXCJ0cmFuc3BhcmVudFwiO1xuXHRcdHByb2JlLnN0eWxlLmNvbG9yID0gdmFsdWU7XG5cdFx0Y29uc3QgY2FudmFzID0gKHRoaXMuY2FudmFzID8/PSBuZXcgT2Zmc2NyZWVuQ2FudmFzKDEsIDEpKTtcblx0XHRjb25zdCBjb250ZXh0ID0gKHRoaXMuY29udGV4dDJkID8/PSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIsIHsgd2lsbFJlYWRGcmVxdWVudGx5OiB0cnVlIH0pKTtcblx0XHRjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAxLCAxKTtcblx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IGdldENvbXB1dGVkU3R5bGUocHJvYmUpLmNvbG9yO1xuXHRcdGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgMSwgMSk7XG5cdFx0cmV0dXJuIFsuLi5jb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCAxLCAxKS5kYXRhXTtcblx0fVxuXG5cdC8qKiBTZXQgb25lIHRva2VuIGZvciB0aGUgcHJldmlld2VkIG1vZGUsIGtlZXBpbmcgdGhlIG90aGVyIG1vZGUgYXMgaXQgY3VycmVudGx5IGxvb2tzLiAqL1xuXHRzZXQoa2V5LCB2YWx1ZSkge1xuXHRcdHRoaXMucmVtZW1iZXIoKTtcblx0XHRjb25zdCBzY29wZSA9IHRoaXMuc2NvcGUoa2V5KTtcblx0XHRjb25zdCBvdGhlciA9IHRoaXMubW9kZSA9PT0gXCJsaWdodFwiID8gXCJkYXJrXCIgOiBcImxpZ2h0XCI7XG5cdFx0Y29uc3QgY3VycmVudCA9IHNjb3BlW2tleV07XG5cdFx0Y29uc3Qgb3RoZXJWYWx1ZSA9IGN1cnJlbnQgJiYgdHlwZW9mIGN1cnJlbnQgPT09IFwib2JqZWN0XCIgPyBjdXJyZW50W290aGVyXSA6IGhleCh0aGlzLnJlc29sdmUoYHZhcigtLWNvbG9yLSR7a2V5fSlgLCBvdGhlcikpO1xuXHRcdHNjb3BlW2tleV0gPSB0aGlzLm1vZGUgPT09IFwibGlnaHRcIiA/IHsgbGlnaHQ6IHZhbHVlLCBkYXJrOiBvdGhlclZhbHVlIH0gOiB7IGxpZ2h0OiBvdGhlclZhbHVlLCBkYXJrOiB2YWx1ZSB9O1xuXHRcdHRoaXMuY2hhbmdlZCgpO1xuXHR9XG5cblx0Z3JhZGllbnQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZHJhZnQuZ3JhZGllbnQgPz8gdGhpcy5kZWZhdWx0R3JhZGllbnQ7XG5cdH1cblxuXHRzZXRTdG9wKGluZGV4LCB2YWx1ZSkge1xuXHRcdGlmICghQ1NTLnN1cHBvcnRzKFwiY29sb3JcIiwgdmFsdWUpKSByZXR1cm47XG5cdFx0dGhpcy5yZW1lbWJlcigpO1xuXHRcdGNvbnN0IHN0b3BzID0gY2xvbmUodGhpcy5ncmFkaWVudCgpKTtcblx0XHRzdG9wc1tpbmRleF0gPSB2YWx1ZTtcblx0XHR0aGlzLmRyYWZ0LmdyYWRpZW50ID0gc3RvcHM7XG5cdFx0dGhpcy5jaGFuZ2VkKCk7XG5cdH1cblxuXHRhZGRTdG9wKCkge1xuXHRcdGNvbnN0IHN0b3BzID0gY2xvbmUodGhpcy5ncmFkaWVudCgpKTtcblx0XHRpZiAoc3RvcHMubGVuZ3RoID49IDQpIHJldHVybjtcblx0XHR0aGlzLnJlbWVtYmVyKCk7XG5cdFx0dGhpcy5kcmFmdC5ncmFkaWVudCA9IFsuLi5zdG9wcywgc3RvcHMuYXQoLTEpXTtcblx0XHR0aGlzLmNoYW5nZWQoKTtcblx0fVxuXG5cdHJlbW92ZVN0b3AoYnV0dG9uKSB7XG5cdFx0Y29uc3Qgc3RvcHMgPSBjbG9uZSh0aGlzLmdyYWRpZW50KCkpO1xuXHRcdGlmIChzdG9wcy5sZW5ndGggPD0gMSkgcmV0dXJuO1xuXHRcdHRoaXMucmVtZW1iZXIoKTtcblx0XHRzdG9wcy5zcGxpY2UoTnVtYmVyKGJ1dHRvbi5kYXRhc2V0LnN0b3ApLCAxKTtcblx0XHR0aGlzLmRyYWZ0LmdyYWRpZW50ID0gc3RvcHM7XG5cdFx0dGhpcy5jaGFuZ2VkKCk7XG5cdH1cblxuXHRyZW1lbWJlcigpIHtcblx0XHR0aGlzLmhpc3RvcnkucHVzaChjbG9uZSh0aGlzLmRyYWZ0KSk7XG5cdH1cblxuXHR1bmRvKCkge1xuXHRcdGlmICghdGhpcy5oaXN0b3J5Lmxlbmd0aCkgcmV0dXJuO1xuXHRcdHRoaXMuZHJhZnQgPSB0aGlzLmhpc3RvcnkucG9wKCk7XG5cdFx0dGhpcy5jaGFuZ2VkKCk7XG5cdH1cblxuXHRyZXNldCgpIHtcblx0XHR0aGlzLnJlbWVtYmVyKCk7XG5cdFx0dGhpcy5kcmFmdCA9IGNsb25lKHRoaXMuc2F2ZWQpO1xuXHRcdHRoaXMuY2hhbmdlZCgpO1xuXHRcdHRoaXMuc2F5KFwiQmFjayB0byB0aGUgc2F2ZWQgdGhlbWUuXCIpO1xuXHR9XG5cblx0Y2hhbmdlZCgpIHtcblx0XHR3cml0ZShzZXNzaW9uU3RvcmFnZSwgXCJkcmFmdFwiLCB0aGlzLmRpcnR5ID8gdGhpcy5kcmFmdCA6IHVuZGVmaW5lZCk7XG5cdFx0dGhpcy5hcHBseVByZXZpZXcoKTtcblx0XHR0aGlzLnJlZnJlc2goKTtcblx0fVxuXG5cdGdldCBkaXJ0eSgpIHtcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5kcmFmdCkgIT09IEpTT04uc3RyaW5naWZ5KHRoaXMuc2F2ZWQpO1xuXHR9XG5cblx0LyoqIFdyaXRlIHRoZSBkcmFmdCBvbnRvIHRoZSBwYWdlIGFzIGlubGluZSBjdXN0b20gcHJvcGVydGllcy4gKi9cblx0YXBwbHlQcmV2aWV3KCkge1xuXHRcdGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlO1xuXHRcdGZvciAoY29uc3QgdG9rZW4gb2YgdGhpcy50b2tlbnMpIHtcblx0XHRcdGNvbnN0IHZhbHVlID0gdGhpcy5kcmFmdFt0aGlzLmNvbnRleHRdPy5bdG9rZW4ua2V5XSA/PyB0aGlzLmRyYWZ0W3Rva2VuLmtleV07XG5cdFx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgc3R5bGUucmVtb3ZlUHJvcGVydHkoYC0tY29sb3ItJHt0b2tlbi5rZXl9YCk7XG5cdFx0XHRlbHNlIHN0eWxlLnNldFByb3BlcnR5KGAtLWNvbG9yLSR7dG9rZW4ua2V5fWAsIHRvQ3NzKHZhbHVlKSk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmNvbnRleHQgPT09IFwic2l0ZVwiKSB7XG5cdFx0XHRjb25zdCBzdG9wcyA9IHRoaXMuZ3JhZGllbnQoKTtcblx0XHRcdGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCA0OyBpbmRleCsrKSB7XG5cdFx0XHRcdGlmIChpbmRleCA8IHN0b3BzLmxlbmd0aCkgc3R5bGUuc2V0UHJvcGVydHkoYC0tY29sb3ItZ3JhZGllbnQtJHtpbmRleCArIDF9YCwgdG9Dc3Moc3RvcHNbaW5kZXhdKSk7XG5cdFx0XHRcdGVsc2Ugc3R5bGUucmVtb3ZlUHJvcGVydHkoYC0tY29sb3ItZ3JhZGllbnQtJHtpbmRleCArIDF9YCk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBuYW1lcyA9IHN0b3BzLm1hcCgoXywgaW5kZXgpID0+IGB2YXIoLS1jb2xvci1ncmFkaWVudC0ke2luZGV4ICsgMX0pYCk7XG5cdFx0XHRpZiAobmFtZXMubGVuZ3RoID09PSAxKSBuYW1lcy5wdXNoKG5hbWVzWzBdKTtcblx0XHRcdHN0eWxlLnNldFByb3BlcnR5KFwiLS1ncmFkaWVudC1zdG9wc1wiLCBuYW1lcy5qb2luKFwiLCBcIikpO1xuXHRcdH1cblx0fVxuXG5cdC8qKiBVcGRhdGUgZXZlcnkgaW5wdXQsIGNvbnRyYXN0IHJlc3VsdCBhbmQgYnV0dG9uIHRvIG1hdGNoIHRoZSBkcmFmdCBhbmQgdGhlIHByZXZpZXdlZCBtb2RlLiAqL1xuXHRyZWZyZXNoKCkge1xuXHRcdGNvbnN0IHJvb3QgPSB0aGlzLnNoYWRvd1Jvb3Q7XG5cdFx0Y29uc3QgbW9kZSA9IHRoaXMubW9kZTtcblx0XHRmb3IgKGNvbnN0IHJhZGlvIG9mIHJvb3QucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbbmFtZT1cIm1vZGVcIl0nKSkgcmFkaW8uY2hlY2tlZCA9IHJhZGlvLnZhbHVlID09PSBtb2RlO1xuXHRcdGZvciAoY29uc3QgaW5wdXQgb2Ygcm9vdC5xdWVyeVNlbGVjdG9yQWxsKFwiaW5wdXRbZGF0YS1rZXldXCIpKSB7XG5cdFx0XHRjb25zdCBrZXkgPSBpbnB1dC5kYXRhc2V0LmtleTtcblx0XHRcdGNvbnN0IHJnYmEgPSB0aGlzLnJlc29sdmUoYHZhcigtLWNvbG9yLSR7a2V5fSlgLCBtb2RlKTtcblx0XHRcdGlmIChpbnB1dC50eXBlID09PSBcImNvbG9yXCIpIGlucHV0LnZhbHVlID0gaGV4KHJnYmEpO1xuXHRcdFx0ZWxzZSBpZiAoaW5wdXQgIT09IHJvb3QuYWN0aXZlRWxlbWVudCkge1xuXHRcdFx0XHRjb25zdCB2YWx1ZSA9IHRoaXMuc2NvcGUoa2V5KVtrZXldO1xuXHRcdFx0XHRpbnB1dC52YWx1ZSA9IHZhbHVlID09PSB1bmRlZmluZWQgPyAocmdiYVszXSA9PT0gMjU1ID8gaGV4KHJnYmEpIDogYHJnYigke3JnYmEuc2xpY2UoMCwgMykuam9pbihcIiBcIil9IC8gJHsocmdiYVszXSAvIDI1NSkudG9GaXhlZCgyKX0pYCkgOiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyB2YWx1ZSA6IHZhbHVlW21vZGVdO1xuXHRcdFx0XHRpbnB1dC5zZXRDdXN0b21WYWxpZGl0eShcIlwiKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Zm9yIChjb25zdCBvdXRwdXQgb2Ygcm9vdC5xdWVyeVNlbGVjdG9yQWxsKFwib3V0cHV0W2RhdGEtY29udHJhc3RdXCIpKSB7XG5cdFx0XHRjb25zdCBwYWlyID0gQ09OVFJBU1QuZmluZCgoW3RleHRdKSA9PiB0ZXh0ID09PSBvdXRwdXQuZGF0YXNldC5jb250cmFzdCk7XG5cdFx0XHRpZiAoIXBhaXIgfHwgIXRoaXMucm9sZXNbcGFpclsxXV0pIHtcblx0XHRcdFx0b3V0cHV0LnRleHRDb250ZW50ID0gXCJcIjtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBbdGV4dCwgYmFja2dyb3VuZCwgbWluaW11bV0gPSBwYWlyO1xuXHRcdFx0Y29uc3QgYmFjayA9IG92ZXIodGhpcy5yZXNvbHZlKGB2YXIoLS1jb2xvci0ke2JhY2tncm91bmR9KWAsIG1vZGUpLCBbMjU1LCAyNTUsIDI1NV0pO1xuXHRcdFx0Y29uc3QgdmFsdWUgPSByYXRpbyhvdmVyKHRoaXMucmVzb2x2ZShgdmFyKC0tY29sb3ItJHt0ZXh0fSlgLCBtb2RlKSwgYmFjayksIGJhY2spO1xuXHRcdFx0Y29uc3QgcGFzcyA9IHZhbHVlID49IG1pbmltdW07XG5cdFx0XHRvdXRwdXQuZGF0YXNldC5wYXNzID0gU3RyaW5nKHBhc3MpO1xuXHRcdFx0b3V0cHV0LnRleHRDb250ZW50ID0gYCR7dmFsdWUudG9GaXhlZCgxKX0gOiAxIG9uICR7YmFja2dyb3VuZCA9PT0gXCJwYWdlXCIgPyBcInRoZSBwYWdlXCIgOiBcInRoZSBicmFuZCBjb2xvclwifSwgJHtwYXNzID8gXCJwYXNzZXNcIiA6IGBiZWxvdyAke21pbmltdW19IDogMWB9YDtcblx0XHR9XG5cdFx0Y29uc3Qgc3RvcHMgPSByb290LnF1ZXJ5U2VsZWN0b3IoXCIuc3RvcHNcIik7XG5cdFx0aWYgKHN0b3BzKSB7XG5cdFx0XHRjb25zdCBsaXN0ID0gdGhpcy5ncmFkaWVudCgpO1xuXHRcdFx0c3RvcHMuaW5uZXJIVE1MID0gbGlzdFxuXHRcdFx0XHQubWFwKFxuXHRcdFx0XHRcdChzdG9wLCBpbmRleCkgPT4gYDxkaXYgY2xhc3M9XCJzdG9wXCI+XG5cdFx0XHRcdFx0XHQ8bGFiZWwgZm9yPVwic3RvcC0ke2luZGV4fVwiPkNvbG9yICR7aW5kZXggKyAxfTwvbGFiZWw+XG5cdFx0XHRcdFx0XHQ8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cInN0b3AtJHtpbmRleH1cIiBkYXRhLXN0b3A9XCIke2luZGV4fVwiIHZhbHVlPVwiJHt0b0NzcyhzdG9wKX1cIiBzcGVsbGNoZWNrPVwiZmFsc2VcIiBhdXRvY29tcGxldGU9XCJvZmZcIj5cblx0XHRcdFx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwicmVtb3ZlLXN0b3BcIiBkYXRhLXN0b3A9XCIke2luZGV4fVwiIGFyaWEtbGFiZWw9XCJSZW1vdmUgY29sb3IgJHtpbmRleCArIDF9XCIgJHtsaXN0Lmxlbmd0aCA8PSAxID8gXCJkaXNhYmxlZFwiIDogXCJcIn0+Jm1pbnVzOzwvYnV0dG9uPlxuXHRcdFx0XHRcdDwvZGl2PmAsXG5cdFx0XHRcdClcblx0XHRcdFx0LmpvaW4oXCJcIik7XG5cdFx0XHRyb290LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFjdGlvbj1cImFkZC1zdG9wXCJdJykuZGlzYWJsZWQgPSBsaXN0Lmxlbmd0aCA+PSA0O1xuXHRcdH1cblx0XHRyb290LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFjdGlvbj1cInVuZG9cIl0nKS5kaXNhYmxlZCA9ICF0aGlzLmhpc3RvcnkubGVuZ3RoO1xuXHRcdHJvb3QucXVlcnlTZWxlY3RvcignW2RhdGEtYWN0aW9uPVwicmVzZXRcIl0nKS5kaXNhYmxlZCA9ICF0aGlzLmRpcnR5O1xuXHRcdHJvb3QucXVlcnlTZWxlY3RvcihcIi5mbGFnXCIpLmhpZGRlbiA9ICF0aGlzLmRpcnR5O1xuXHR9XG5cblx0YXN5bmMgc2F2ZSgpIHtcblx0XHR0aGlzLnNheShcIlNhdmluZ1x1MjAyNlwiKTtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChFTkRQT0lOVCwgeyBtZXRob2Q6IFwiUE9TVFwiLCBoZWFkZXJzOiB7IFwiY29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sIGJvZHk6IEpTT04uc3RyaW5naWZ5KHRoaXMuZHJhZnQpIH0pO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuXHRcdFx0aWYgKCFyZXNwb25zZS5vaykgdGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvcik7XG5cdFx0XHR0aGlzLnNhdmVkID0gY2xvbmUodGhpcy5kcmFmdCk7XG5cdFx0XHR0aGlzLmhpc3RvcnkgPSBbXTtcblx0XHRcdHdyaXRlKHNlc3Npb25TdG9yYWdlLCBcImRyYWZ0XCIsIHVuZGVmaW5lZCk7XG5cdFx0XHR0aGlzLnJlZnJlc2goKTtcblx0XHRcdHRoaXMuc2F5KGBTYXZlZCB0byAke3Jlc3VsdC5maWxlfS4gVGhlIHNpdGUgaXMgcmVidWlsZGluZy5gKTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0dGhpcy5zYXkoYE5vdCBzYXZlZDogJHtlcnJvci5tZXNzYWdlfWApO1xuXHRcdH1cblx0fVxuXG5cdGRvd25sb2FkKCkge1xuXHRcdGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbYCR7SlNPTi5zdHJpbmdpZnkodGhpcy5kcmFmdCwgbnVsbCwgXCJcXHRcIil9XFxuYF0sIHsgdHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSk7XG5cdFx0Y29uc3QgbGluayA9IE9iamVjdC5hc3NpZ24oZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIiksIHsgaHJlZjogVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKSwgZG93bmxvYWQ6IFwidGhlbWUuanNvblwiIH0pO1xuXHRcdGxpbmsuY2xpY2soKTtcblx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKGxpbmsuaHJlZik7XG5cdFx0dGhpcy5zYXkoYERvd25sb2FkZWQuIFB1dCBpdCBpbiAke3RoaXMuZmlsZS5yZXBsYWNlKC90aGVtZVxcLmpzb24kLywgXCJcIil9IHRvIGtlZXAgaXQuYCk7XG5cdH1cblxuXHRzYXkobWVzc2FnZSkge1xuXHRcdHRoaXMuc3RhdHVzLnRleHRDb250ZW50ID0gbWVzc2FnZTtcblx0fVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldChcInRoZW1lLXBhbmVsXCIpKSBjdXN0b21FbGVtZW50cy5kZWZpbmUoXCJ0aGVtZS1wYW5lbFwiLCBUaGVtZVBhbmVsKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFLQSxJQUFNLFdBQVc7QUFDakIsSUFBTSxRQUFRO0FBR2QsSUFBTSxTQUFTO0FBQUEsRUFDZCxFQUFFLFFBQVEsU0FBUyxRQUFRLENBQUMsQ0FBQyxVQUFVLGFBQWEsR0FBRyxDQUFDLGVBQWUsc0JBQXNCLEdBQUcsQ0FBQyxhQUFhLHFCQUFxQixHQUFHLENBQUMsb0JBQW9CLGtCQUFrQixHQUFHLENBQUMsdUJBQXVCLDBCQUEwQixDQUFDLEVBQUU7QUFBQSxFQUNyTyxFQUFFLFFBQVEsUUFBUSxRQUFRLENBQUMsQ0FBQyxRQUFRLGlCQUFpQixHQUFHLENBQUMsV0FBVyxrQkFBa0IsR0FBRyxDQUFDLFVBQVUsbUJBQW1CLENBQUMsRUFBRTtBQUFBLEVBQzFILEVBQUUsUUFBUSxRQUFRLFFBQVEsQ0FBQyxDQUFDLFFBQVEsV0FBVyxHQUFHLENBQUMsY0FBYyxnQkFBZ0IsR0FBRyxDQUFDLFFBQVEsT0FBTyxDQUFDLEVBQUU7QUFDeEc7QUFHQSxJQUFNLFdBQVc7QUFBQSxFQUNoQixDQUFDLFFBQVEsUUFBUSxHQUFHO0FBQUEsRUFDcEIsQ0FBQyxjQUFjLFFBQVEsR0FBRztBQUFBLEVBQzFCLENBQUMsZUFBZSxRQUFRLEdBQUc7QUFBQSxFQUMzQixDQUFDLFFBQVEsUUFBUSxHQUFHO0FBQUEsRUFDcEIsQ0FBQyxhQUFhLFVBQVUsR0FBRztBQUM1QjtBQUVBLElBQU0sT0FBTyxDQUFDLFNBQVMsS0FBSyxhQUFhO0FBQ3hDLE1BQUk7QUFDSCxVQUFNLFFBQVEsUUFBUSxRQUFRLEdBQUcsS0FBSyxJQUFJLEdBQUcsRUFBRTtBQUMvQyxXQUFPLFVBQVUsT0FBTyxXQUFXLEtBQUssTUFBTSxLQUFLO0FBQUEsRUFDcEQsUUFBUTtBQUNQLFdBQU87QUFBQSxFQUNSO0FBQ0Q7QUFDQSxJQUFNLFFBQVEsQ0FBQyxTQUFTLEtBQUssVUFBVTtBQUN0QyxNQUFJO0FBQ0gsUUFBSSxVQUFVLE9BQVcsU0FBUSxXQUFXLEdBQUcsS0FBSyxJQUFJLEdBQUcsRUFBRTtBQUFBLFFBQ3hELFNBQVEsUUFBUSxHQUFHLEtBQUssSUFBSSxHQUFHLElBQUksS0FBSyxVQUFVLEtBQUssQ0FBQztBQUFBLEVBQzlELFFBQVE7QUFBQSxFQUVSO0FBQ0Q7QUFHQSxJQUFNLFFBQVEsQ0FBQyxVQUFXLE9BQU8sVUFBVSxXQUFXLFFBQVEsY0FBYyxNQUFNLEtBQUssS0FBSyxNQUFNLElBQUk7QUFDdEcsSUFBTSxRQUFRLENBQUMsVUFBVSxnQkFBZ0IsS0FBSztBQUM5QyxJQUFNLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxTQUFTLEdBQUcsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUM7QUFHN0YsSUFBTSxZQUFZLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNO0FBQ2hDLFFBQU0sVUFBVSxDQUFDLE1BQU07QUFDdEIsVUFBTSxJQUFJLElBQUk7QUFDZCxXQUFPLEtBQUssVUFBVSxJQUFJLFVBQVUsSUFBSSxTQUFTLFVBQVU7QUFBQSxFQUM1RDtBQUNBLFNBQU8sU0FBUyxRQUFRLENBQUMsSUFBSSxTQUFTLFFBQVEsQ0FBQyxJQUFJLFNBQVMsUUFBUSxDQUFDO0FBQ3RFO0FBQ0EsSUFBTSxRQUFRLENBQUMsR0FBRyxNQUFNO0FBQ3ZCLFFBQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUM7QUFDbEUsVUFBUSxLQUFLLFNBQVMsS0FBSztBQUM1QjtBQUVBLElBQU0sT0FBTyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsTUFBTTtBQUM1QyxRQUFNLElBQUksSUFBSTtBQUNkLFNBQU8sQ0FBQyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sSUFBSSxFQUFFLEdBQUcsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLElBQUksRUFBRSxHQUFHLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxJQUFJLEVBQUUsR0FBRyxHQUFHO0FBQ2xIO0FBRUEsSUFBTSxTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FB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
