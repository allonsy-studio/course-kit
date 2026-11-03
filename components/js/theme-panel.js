// assets/scripts/theme-panel.js
var ENDPOINT = "/.course-kit/theme";
var STORE = "course-kit:theme-panel";
var GROUPS = [
  { legend: "Brand", tokens: [["accent", "Brand color"], ["accent-text", "Brand color for text"], ["on-accent", "Text on brand color"]] },
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvdGhlbWUtcGFuZWwuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogRGV2LW9ubHkgdGhlbWUgcGFuZWw6IHByZXZpZXcgY29sb3IgdG9rZW5zIG9uIHRoZSBsaXZlIHBhZ2UgYW5kIHNhdmUgdGhlbSB0b1xuICogYF9kYXRhL3RoZW1lLmpzb25gIHRocm91Z2ggdGhlIGRldiBzZXJ2ZXIuIFNlZSBkb2NzL3RoZW1lLXBhbmVsLm1kLlxuICovXG5cbmNvbnN0IEVORFBPSU5UID0gXCIvLmNvdXJzZS1raXQvdGhlbWVcIjtcbmNvbnN0IFNUT1JFID0gXCJjb3Vyc2Uta2l0OnRoZW1lLXBhbmVsXCI7XG5cbi8qKiBQbGFpbi1sYW5ndWFnZSBncm91cHMgZm9yIHRoZSBtb3N0IHVzZWQgdG9rZW5zOyBldmVyeSB0b2tlbiBpcyBhbHNvIHVuZGVyIFwiRXZlcnkgY29sb3JcIi4gKi9cbmNvbnN0IEdST1VQUyA9IFtcblx0eyBsZWdlbmQ6IFwiQnJhbmRcIiwgdG9rZW5zOiBbW1wiYWNjZW50XCIsIFwiQnJhbmQgY29sb3JcIl0sIFtcImFjY2VudC10ZXh0XCIsIFwiQnJhbmQgY29sb3IgZm9yIHRleHRcIl0sIFtcIm9uLWFjY2VudFwiLCBcIlRleHQgb24gYnJhbmQgY29sb3JcIl1dIH0sXG5cdHsgbGVnZW5kOiBcIlBhZ2VcIiwgdG9rZW5zOiBbW1wicGFnZVwiLCBcIlBhZ2UgYmFja2dyb3VuZFwiXSwgW1wic3VyZmFjZVwiLCBcIkNhcmRzIGFuZCBwYW5lbHNcIl0sIFtcImJvcmRlclwiLCBcIkxpbmVzIGFuZCBib3JkZXJzXCJdXSB9LFxuXHR7IGxlZ2VuZDogXCJUZXh0XCIsIHRva2VuczogW1tcInRleHRcIiwgXCJCb2R5IHRleHRcIl0sIFtcInRleHQtbXV0ZWRcIiwgXCJTZWNvbmRhcnkgdGV4dFwiXSwgW1wibGlua1wiLCBcIkxpbmtzXCJdXSB9LFxuXTtcblxuLyoqIFRleHQgYW5kIGJhY2tncm91bmQgcGFpcnMgd2hvc2UgY29udHJhc3QgaXMgcmVwb3J0ZWQsIHNob3duIGJlc2lkZSB0aGUgZmlyc3QgdG9rZW4uICovXG5jb25zdCBDT05UUkFTVCA9IFtcblx0W1widGV4dFwiLCBcInBhZ2VcIiwgNC41XSxcblx0W1widGV4dC1tdXRlZFwiLCBcInBhZ2VcIiwgNC41XSxcblx0W1wiYWNjZW50LXRleHRcIiwgXCJwYWdlXCIsIDQuNV0sXG5cdFtcImxpbmtcIiwgXCJwYWdlXCIsIDQuNV0sXG5cdFtcIm9uLWFjY2VudFwiLCBcImFjY2VudFwiLCA0LjVdLFxuXTtcblxuY29uc3QgcmVhZCA9IChzdG9yYWdlLCBrZXksIGZhbGxiYWNrKSA9PiB7XG5cdHRyeSB7XG5cdFx0Y29uc3QgdmFsdWUgPSBzdG9yYWdlLmdldEl0ZW0oYCR7U1RPUkV9OiR7a2V5fWApO1xuXHRcdHJldHVybiB2YWx1ZSA9PT0gbnVsbCA/IGZhbGxiYWNrIDogSlNPTi5wYXJzZSh2YWx1ZSk7XG5cdH0gY2F0Y2gge1xuXHRcdHJldHVybiBmYWxsYmFjaztcblx0fVxufTtcbmNvbnN0IHdyaXRlID0gKHN0b3JhZ2UsIGtleSwgdmFsdWUpID0+IHtcblx0dHJ5IHtcblx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgc3RvcmFnZS5yZW1vdmVJdGVtKGAke1NUT1JFfToke2tleX1gKTtcblx0XHRlbHNlIHN0b3JhZ2Uuc2V0SXRlbShgJHtTVE9SRX06JHtrZXl9YCwgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcblx0fSBjYXRjaCB7XG5cdFx0Ly8gc3RvcmFnZSBibG9ja2VkOiB0aGUgcGFuZWwgc3RpbGwgd29ya3MsIGl0IGp1c3QgZm9yZ2V0cy5cblx0fVxufTtcblxuLyoqIEBwYXJhbSB7dW5rbm93bn0gdmFsdWUgYSBjb2xvciBvciB7IGxpZ2h0LCBkYXJrIH0gKi9cbmNvbnN0IHRvQ3NzID0gKHZhbHVlKSA9PiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gdmFsdWUgOiBgbGlnaHQtZGFyaygke3ZhbHVlLmxpZ2h0fSwgJHt2YWx1ZS5kYXJrfSlgKTtcbmNvbnN0IGNsb25lID0gKHZhbHVlKSA9PiBzdHJ1Y3R1cmVkQ2xvbmUodmFsdWUpO1xuY29uc3QgaGV4ID0gKFtyLCBnLCBiXSkgPT4gYCMke1tyLCBnLCBiXS5tYXAoKG4pID0+IG4udG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsIFwiMFwiKSkuam9pbihcIlwiKX1gO1xuXG4vKiogV0NBRyByZWxhdGl2ZSBsdW1pbmFuY2Ugb2YgOC1iaXQgc1JHQi4gKi9cbmNvbnN0IGx1bWluYW5jZSA9IChbciwgZywgYl0pID0+IHtcblx0Y29uc3QgY2hhbm5lbCA9IChjKSA9PiB7XG5cdFx0Y29uc3QgcyA9IGMgLyAyNTU7XG5cdFx0cmV0dXJuIHMgPD0gMC4wMzkyOCA/IHMgLyAxMi45MiA6ICgocyArIDAuMDU1KSAvIDEuMDU1KSAqKiAyLjQ7XG5cdH07XG5cdHJldHVybiAwLjIxMjYgKiBjaGFubmVsKHIpICsgMC43MTUyICogY2hhbm5lbChnKSArIDAuMDcyMiAqIGNoYW5uZWwoYik7XG59O1xuY29uc3QgcmF0aW8gPSAoYSwgYikgPT4ge1xuXHRjb25zdCBbaGksIGxvXSA9IFtsdW1pbmFuY2UoYSksIGx1bWluYW5jZShiKV0uc29ydCgoeCwgeSkgPT4geSAtIHgpO1xuXHRyZXR1cm4gKGhpICsgMC4wNSkgLyAobG8gKyAwLjA1KTtcbn07XG4vKiogQSB0cmFuc2x1Y2VudCBjb2xvciBwYWludGVkIG92ZXIgYW4gb3BhcXVlIG9uZS4gKi9cbmNvbnN0IG92ZXIgPSAoW3IsIGcsIGIsIGFdLCBbYnIsIGJnLCBiYl0pID0+IHtcblx0Y29uc3QgdCA9IGEgLyAyNTU7XG5cdHJldHVybiBbTWF0aC5yb3VuZChyICogdCArIGJyICogKDEgLSB0KSksIE1hdGgucm91bmQoZyAqIHQgKyBiZyAqICgxIC0gdCkpLCBNYXRoLnJvdW5kKGIgKiB0ICsgYmIgKiAoMSAtIHQpKSwgMjU1XTtcbn07XG5cbmNvbnN0IFNUWUxFUyA9IGBcbjpob3N0IHtcblx0YWxsOiBpbml0aWFsO1xuXHRjb2xvci1zY2hlbWU6IGxpZ2h0IGRhcms7XG5cdC0tdHAtYmc6IGxpZ2h0LWRhcmsoI2ZmZiwgIzFkMWYyNyk7XG5cdC0tdHAtdGV4dDogbGlnaHQtZGFyaygjMWQxZjI3LCAjZWNlZWY0KTtcblx0LS10cC1tdXRlZDogbGlnaHQtZGFyaygjNTU1YjZlLCAjYTlhZWMwKTtcblx0LS10cC1saW5lOiBsaWdodC1kYXJrKCNjNGM4ZDQsICM0NTQ5NTkpO1xuXHQtLXRwLWZvY3VzOiBsaWdodC1kYXJrKCMwYjU3ZDAsICM4YWI0ZjgpO1xuXHQtLXRwLWdvb2Q6IGxpZ2h0LWRhcmsoIzFkNmIzYywgIzg2ZDdhNCk7XG5cdC0tdHAtYmFkOiBsaWdodC1kYXJrKCNhMzI2MWEsICNmZjlkOGYpO1xuXHQtLXRwLWdhcDogMC43NXJlbTtcblx0Zm9udDogMC44NzVyZW0vMS40NSBzeXN0ZW0tdWksIHNhbnMtc2VyaWY7XG59XG5cbiogeyBib3gtc2l6aW5nOiBib3JkZXItYm94OyB9XG5cbjpmb2N1cy12aXNpYmxlIHtcblx0b3V0bGluZTogMnB4IHNvbGlkIHZhcigtLXRwLWZvY3VzKTtcblx0b3V0bGluZS1vZmZzZXQ6IDJweDtcbn1cblxuYnV0dG9uLCBpbnB1dCwgc2VsZWN0IHsgZm9udDogaW5oZXJpdDsgY29sb3I6IGluaGVyaXQ7IH1cblxuYnV0dG9uIHtcblx0bWluLWJsb2NrLXNpemU6IDJyZW07XG5cdG1pbi1pbmxpbmUtc2l6ZTogMnJlbTtcblx0cGFkZGluZy1pbmxpbmU6IDAuNzVyZW07XG5cdGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLXRwLWxpbmUpO1xuXHRib3JkZXItcmFkaXVzOiAwLjM3NXJlbTtcblx0YmFja2dyb3VuZDogdmFyKC0tdHAtYmcpO1xuXHRjdXJzb3I6IHBvaW50ZXI7XG59XG5cbmJ1dHRvbjpkaXNhYmxlZCB7IG9wYWNpdHk6IDAuNTsgY3Vyc29yOiBub3QtYWxsb3dlZDsgfVxuXG5baGlkZGVuXSB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfVxuXG4ubGF1bmNoZXIge1xuXHRwb3NpdGlvbjogZml4ZWQ7XG5cdGluc2V0LWlubGluZS1lbmQ6IDA7XG5cdGluc2V0LWJsb2NrLXN0YXJ0OiA1MCU7XG5cdHRyYW5zbGF0ZTogMCAtNTAlO1xuXHR6LWluZGV4OiAyMTQ3NDgzNjQ2O1xuXHR3cml0aW5nLW1vZGU6IHZlcnRpY2FsLXJsO1xuXHRwYWRkaW5nOiAwLjc1cmVtIDAuNHJlbTtcblx0Ym9yZGVyLWlubGluZS1lbmQ6IDA7XG5cdGJvcmRlci1zdGFydC1lbmQtcmFkaXVzOiAwO1xuXHRib3JkZXItZW5kLWVuZC1yYWRpdXM6IDA7XG5cdGNvbG9yOiB2YXIoLS10cC10ZXh0KTtcblx0Ym94LXNoYWRvdzogMCAycHggOHB4IHJnYigwIDAgMCAvIDIwJSk7XG59XG5cbi5wYW5lbCB7XG5cdHBvc2l0aW9uOiBmaXhlZDtcblx0aW5zZXQ6IGF1dG87XG5cdGluc2V0LWlubGluZS1lbmQ6IHZhcigtLXRwLWdhcCk7XG5cdGluc2V0LWJsb2NrLXN0YXJ0OiA1MCU7XG5cdHRyYW5zbGF0ZTogMCAtNTAlO1xuXHRtYXJnaW46IDA7XG5cdHotaW5kZXg6IDIxNDc0ODM2NDc7XG5cdGlubGluZS1zaXplOiBtaW4oMjJyZW0sIDEwMHZ3IC0gMiAqIHZhcigtLXRwLWdhcCkpO1xuXHRtYXgtYmxvY2stc2l6ZTogY2FsYygxMDBkdmggLSAyICogdmFyKC0tdHAtZ2FwKSk7XG5cdG92ZXJmbG93OiBhdXRvO1xuXHRvdmVyc2Nyb2xsLWJlaGF2aW9yOiBjb250YWluO1xuXHRzY3JvbGxiYXItZ3V0dGVyOiBzdGFibGU7XG5cdHBhZGRpbmc6IDA7XG5cdGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLXRwLWxpbmUpO1xuXHRib3JkZXItcmFkaXVzOiAwLjVyZW07XG5cdGJhY2tncm91bmQ6IHZhcigtLXRwLWJnKTtcblx0Y29sb3I6IHZhcigtLXRwLXRleHQpO1xuXHRib3gtc2hhZG93OiAwIDhweCAyOHB4IHJnYigwIDAgMCAvIDI1JSk7XG5cdGNvbnRhaW5lci10eXBlOiBpbmxpbmUtc2l6ZTtcblxuXHRvcGFjaXR5OiAxO1xuXHR0cmFuc2Zvcm06IG5vbmU7XG5cdHRyYW5zaXRpb24tcHJvcGVydHk6IG9wYWNpdHksIHRyYW5zZm9ybSwgZGlzcGxheSwgb3ZlcmxheTtcblx0dHJhbnNpdGlvbi1kdXJhdGlvbjogMC4ycztcblx0dHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246IGVhc2Utb3V0O1xuXHR0cmFuc2l0aW9uLWJlaGF2aW9yOiBhbGxvdy1kaXNjcmV0ZTtcbn1cblxuLnBhbmVsOm5vdChbcG9wb3Zlcl0pIHsgZGlzcGxheTogYmxvY2s7IH1cblxuLnBhbmVsOnBvcG92ZXItb3BlbiB7XG5cdEBzdGFydGluZy1zdHlsZSB7XG5cdFx0b3BhY2l0eTogMDtcblx0XHR0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoMXJlbSk7XG5cdH1cbn1cblxuLnBhbmVsW3BvcG92ZXJdOm5vdCg6cG9wb3Zlci1vcGVuKSB7XG5cdG9wYWNpdHk6IDA7XG5cdHRyYW5zZm9ybTogdHJhbnNsYXRlWCgxcmVtKTtcbn1cblxuQG1lZGlhICh3aWR0aCA8IDQwcmVtKSB7XG5cdC5wYW5lbCB7XG5cdFx0aW5zZXQtaW5saW5lOiAwO1xuXHRcdGluc2V0LWJsb2NrOiBhdXRvIDA7XG5cdFx0dHJhbnNsYXRlOiBub25lO1xuXHRcdGlubGluZS1zaXplOiAxMDAlO1xuXHRcdG1heC1ibG9jay1zaXplOiA3MGR2aDtcblx0XHRib3JkZXItZW5kLXN0YXJ0LXJhZGl1czogMDtcblx0XHRib3JkZXItZW5kLWVuZC1yYWRpdXM6IDA7XG5cdFx0cGFkZGluZy1ibG9jay1lbmQ6IGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tKTtcblx0fVxufVxuXG4ubWFpbiA+IHN1bW1hcnkge1xuXHRwb3NpdGlvbjogc3RpY2t5O1xuXHRpbnNldC1ibG9jay1zdGFydDogMDtcblx0ei1pbmRleDogMTtcblx0ZGlzcGxheTogZmxleDtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0Z2FwOiAwLjVyZW07XG5cdHBhZGRpbmctYmxvY2s6IDAuNXJlbTtcblx0cGFkZGluZy1pbmxpbmU6IDAuNzVyZW0gM3JlbTtcblx0YmFja2dyb3VuZDogdmFyKC0tdHAtYmcpO1xuXHRib3JkZXItYmxvY2stZW5kOiAxcHggc29saWQgdmFyKC0tdHAtbGluZSk7XG5cdGN1cnNvcjogcG9pbnRlcjtcbn1cblxuLm1haW46bm90KFtvcGVuXSkgPiBzdW1tYXJ5IHsgYm9yZGVyLWJsb2NrLWVuZDogMDsgfVxuXG5oMiB7IG1hcmdpbjogMDsgZm9udC1zaXplOiAxcmVtOyB9XG5cbi5mbGFnIHsgZm9udC1zaXplOiAwLjc1cmVtOyBjb2xvcjogdmFyKC0tdHAtbXV0ZWQpOyB9XG5cbi5jbG9zZSB7XG5cdHBvc2l0aW9uOiBhYnNvbHV0ZTtcblx0aW5zZXQtYmxvY2stc3RhcnQ6IDAuMzc1cmVtO1xuXHRpbnNldC1pbmxpbmUtZW5kOiAwLjM3NXJlbTtcblx0ei1pbmRleDogMjtcblx0cGFkZGluZzogMDtcbn1cblxuLmJvZHkge1xuXHRkaXNwbGF5OiBncmlkO1xuXHRnYXA6IDAuNzVyZW07XG5cdHBhZGRpbmc6IDAuNzVyZW07XG59XG5cbmZpZWxkc2V0IHtcblx0bWFyZ2luOiAwO1xuXHRwYWRkaW5nOiAwLjVyZW0gMC43NXJlbSAwLjc1cmVtO1xuXHRib3JkZXI6IDFweCBzb2xpZCB2YXIoLS10cC1saW5lKTtcblx0Ym9yZGVyLXJhZGl1czogMC4zNzVyZW07XG5cdGRpc3BsYXk6IGdyaWQ7XG5cdGdhcDogMC41cmVtO1xufVxuXG5sZWdlbmQgeyBwYWRkaW5nLWlubGluZTogMC4yNXJlbTsgZm9udC13ZWlnaHQ6IDYwMDsgfVxuXG4ubW9kZXMgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDFyZW07IH1cblxuLnJvdyB7XG5cdGRpc3BsYXk6IGdyaWQ7XG5cdGdyaWQtdGVtcGxhdGUtY29sdW1uczogMi4yNXJlbSAxZnI7XG5cdGdyaWQtdGVtcGxhdGUtYXJlYXM6IFwic3dhdGNoIGxhYmVsXCIgXCJzd2F0Y2ggdmFsdWVcIiBcIi4gY29udHJhc3RcIjtcblx0Y29sdW1uLWdhcDogMC41cmVtO1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xufVxuXG4ucm93IGxhYmVsIHsgZ3JpZC1hcmVhOiBsYWJlbDsgfVxuLnJvdyBpbnB1dFt0eXBlPVwiY29sb3JcIl0ge1xuXHRncmlkLWFyZWE6IHN3YXRjaDtcblx0aW5saW5lLXNpemU6IDIuMjVyZW07XG5cdGJsb2NrLXNpemU6IDIuMjVyZW07XG5cdHBhZGRpbmc6IDA7XG5cdGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLXRwLWxpbmUpO1xuXHRib3JkZXItcmFkaXVzOiAwLjM3NXJlbTtcblx0YmFja2dyb3VuZDogbm9uZTtcblx0Zm9yY2VkLWNvbG9yLWFkanVzdDogbm9uZTtcbn1cbi5yb3cgaW5wdXRbdHlwZT1cInRleHRcIl0ge1xuXHRncmlkLWFyZWE6IHZhbHVlO1xuXHRpbmxpbmUtc2l6ZTogMTAwJTtcblx0bWluLWJsb2NrLXNpemU6IDEuNzVyZW07XG5cdHBhZGRpbmctaW5saW5lOiAwLjM3NXJlbTtcblx0Ym9yZGVyOiAxcHggc29saWQgdmFyKC0tdHAtbGluZSk7XG5cdGJvcmRlci1yYWRpdXM6IDAuMjVyZW07XG5cdGJhY2tncm91bmQ6IHZhcigtLXRwLWJnKTtcblx0Zm9udC1mYW1pbHk6IHVpLW1vbm9zcGFjZSwgbW9ub3NwYWNlO1xuXHRmb250LXNpemU6IDAuODEyNXJlbTtcbn1cbi5yb3cgaW5wdXRbdHlwZT1cInRleHRcIl06dXNlci1pbnZhbGlkIHsgYm9yZGVyLWNvbG9yOiB2YXIoLS10cC1iYWQpOyB9XG4ucm93IG91dHB1dCB7IGdyaWQtYXJlYTogY29udHJhc3Q7IGZvbnQtc2l6ZTogMC43NXJlbTsgfVxuLnJvdyBvdXRwdXRbZGF0YS1wYXNzPVwidHJ1ZVwiXSB7IGNvbG9yOiB2YXIoLS10cC1nb29kKTsgfVxuLnJvdyBvdXRwdXRbZGF0YS1wYXNzPVwiZmFsc2VcIl0geyBjb2xvcjogdmFyKC0tdHAtYmFkKTsgfVxuLnJvbGUgeyBncmlkLWNvbHVtbjogMjsgZm9udC1zaXplOiAwLjc1cmVtOyBjb2xvcjogdmFyKC0tdHAtbXV0ZWQpOyB9XG5cbi5hZHZhbmNlZCA+IHN1bW1hcnkgeyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiA2MDA7IH1cbi5hZHZhbmNlZFtvcGVuXSA+IHN1bW1hcnkgeyBtYXJnaW4tYmxvY2stZW5kOiAwLjVyZW07IH1cbi5hZHZhbmNlZCA+IGRpdiB7IGRpc3BsYXk6IGdyaWQ7IGdhcDogMC43NXJlbTsgfVxuXG4uc3RvcHMgeyBkaXNwbGF5OiBncmlkOyBnYXA6IDAuNXJlbTsgfVxuLnN0b3AgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDAuNXJlbTsgYWxpZ24taXRlbXM6IGNlbnRlcjsgfVxuXG5tZW51IHtcblx0ZGlzcGxheTogZmxleDtcblx0ZmxleC13cmFwOiB3cmFwO1xuXHRnYXA6IDAuNXJlbTtcblx0bWFyZ2luOiAwO1xuXHRwYWRkaW5nOiAwO1xuXHRsaXN0LXN0eWxlOiBub25lO1xufVxuXG4uc2F2ZSB7IGZvbnQtd2VpZ2h0OiA2MDA7IH1cblxuLnN0YXR1cyB7IG1pbi1ibG9jay1zaXplOiAxLjI1cmVtOyBmb250LXNpemU6IDAuODEyNXJlbTsgfVxuXG4ucHJvYmUgeyBwb3NpdGlvbjogYWJzb2x1dGU7IGlubGluZS1zaXplOiAwOyBibG9jay1zaXplOiAwOyBvdmVyZmxvdzogaGlkZGVuOyB9XG5cbkBjb250YWluZXIgKGlubGluZS1zaXplIDwgMTZyZW0pIHtcblx0LnJvdyB7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyOyBncmlkLXRlbXBsYXRlLWFyZWFzOiBcImxhYmVsXCIgXCJzd2F0Y2hcIiBcInZhbHVlXCIgXCJjb250cmFzdFwiOyB9XG5cdC5yb2xlIHsgZ3JpZC1jb2x1bW46IDE7IH1cbn1cblxuQHN1cHBvcnRzIChpbnRlcnBvbGF0ZS1zaXplOiBhbGxvdy1rZXl3b3Jkcykge1xuXHQ6aG9zdCB7IGludGVycG9sYXRlLXNpemU6IGFsbG93LWtleXdvcmRzOyB9XG5cdC5tYWluOjpkZXRhaWxzLWNvbnRlbnQge1xuXHRcdGJsb2NrLXNpemU6IDA7XG5cdFx0b3ZlcmZsb3c6IGNsaXA7XG5cdFx0dHJhbnNpdGlvbjogYmxvY2stc2l6ZSAwLjJzIGVhc2Utb3V0LCBjb250ZW50LXZpc2liaWxpdHkgMC4ycztcblx0XHR0cmFuc2l0aW9uLWJlaGF2aW9yOiBhbGxvdy1kaXNjcmV0ZTtcblx0fVxuXHQubWFpbltvcGVuXTo6ZGV0YWlscy1jb250ZW50IHsgYmxvY2stc2l6ZTogYXV0bzsgfVxufVxuXG5AbWVkaWEgKHByZWZlcnMtcmVkdWNlZC1tb3Rpb246IHJlZHVjZSkge1xuXHQucGFuZWwsIC5wYW5lbDpwb3BvdmVyLW9wZW4sIC5wYW5lbFtwb3BvdmVyXTpub3QoOnBvcG92ZXItb3BlbikgeyB0cmFuc2Zvcm06IG5vbmU7IHRyYW5zaXRpb24tZHVyYXRpb246IDAuMDFzOyB9XG5cdC5tYWluOjpkZXRhaWxzLWNvbnRlbnQgeyB0cmFuc2l0aW9uOiBub25lOyB9XG59XG5gO1xuXG5jbGFzcyBUaGVtZVBhbmVsIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuXHRhc3luYyBjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHRpZiAodGhpcy5zaGFkb3dSb290KSByZXR1cm47XG5cdFx0bGV0IGRhdGE7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goRU5EUE9JTlQsIHsgY2FjaGU6IFwibm8tc3RvcmVcIiB9KTtcblx0XHRcdGlmICghcmVzcG9uc2Uub2spIHRocm93IG5ldyBFcnJvcihTdHJpbmcocmVzcG9uc2Uuc3RhdHVzKSk7XG5cdFx0XHRkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Ly8gTm8gZGV2IHNlcnZlciBlbmRwb2ludCAoYSBzdGF0aWMgYnVpbGQpOiB0aGVyZSBpcyBub3RoaW5nIHRvIHNhdmUgdG8uXG5cdFx0XHR0aGlzLnJlbW92ZSgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLmNvbnRleHQgPSB0aGlzLmdldEF0dHJpYnV0ZShcImNvbnRleHRcIikgPT09IFwiZGVja1wiID8gXCJkZWNrXCIgOiBcInNpdGVcIjtcblx0XHR0aGlzLnRva2VucyA9IGRhdGEudG9rZW5zLmZpbHRlcigodG9rZW4pID0+IHRva2VuW3RoaXMuY29udGV4dF0pO1xuXHRcdHRoaXMucm9sZXMgPSBPYmplY3QuZnJvbUVudHJpZXModGhpcy50b2tlbnMubWFwKCh0b2tlbikgPT4gW3Rva2VuLmtleSwgdG9rZW4ucm9sZV0pKTtcblx0XHR0aGlzLmRlZmF1bHRHcmFkaWVudCA9IGRhdGEuZ3JhZGllbnQ7XG5cdFx0dGhpcy5maWxlID0gZGF0YS5maWxlO1xuXHRcdHRoaXMuc2F2ZWQgPSBkYXRhLnRoZW1lO1xuXHRcdHRoaXMuZHJhZnQgPSByZWFkKHNlc3Npb25TdG9yYWdlLCBcImRyYWZ0XCIsIG51bGwpID8/IGNsb25lKHRoaXMuc2F2ZWQpO1xuXHRcdHRoaXMuaGlzdG9yeSA9IFtdO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0dGhpcy5hcHBseVByZXZpZXcoKTtcblx0XHR0aGlzLnJlZnJlc2goKTtcblx0fVxuXG5cdC8qKiBAcmV0dXJucyB7c3RyaW5nfSAqL1xuXHRnZXQgbW9kZSgpIHtcblx0XHRjb25zdCBmb3JjZWQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY29sb3JTY2hlbWU7XG5cdFx0aWYgKGZvcmNlZCA9PT0gXCJsaWdodFwiIHx8IGZvcmNlZCA9PT0gXCJkYXJrXCIpIHJldHVybiBmb3JjZWQ7XG5cdFx0cmV0dXJuIG1hdGNoTWVkaWEoXCIocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspXCIpLm1hdGNoZXMgPyBcImRhcmtcIiA6IFwibGlnaHRcIjtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRjb25zdCByb290ID0gdGhpcy5hdHRhY2hTaGFkb3coeyBtb2RlOiBcIm9wZW5cIiB9KTtcblx0XHRjb25zdCBzdXBwb3J0c1BvcG92ZXIgPSBcInBvcG92ZXJcIiBpbiBIVE1MRWxlbWVudC5wcm90b3R5cGU7XG5cdFx0cm9vdC5pbm5lckhUTUwgPSBgXG5cdFx0XHQ8c3R5bGU+JHtTVFlMRVN9PC9zdHlsZT5cblx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwibGF1bmNoZXJcIiAke3N1cHBvcnRzUG9wb3ZlciA/ICdwb3BvdmVydGFyZ2V0PVwicGFuZWxcIiBwb3BvdmVydGFyZ2V0YWN0aW9uPVwic2hvd1wiJyA6IFwiXCJ9PlRoZW1lPC9idXR0b24+XG5cdFx0XHQ8YXNpZGUgY2xhc3M9XCJwYW5lbFwiIGlkPVwicGFuZWxcIiAke3N1cHBvcnRzUG9wb3ZlciA/ICdwb3BvdmVyPVwibWFudWFsXCInIDogXCJoaWRkZW5cIn0gYXJpYS1sYWJlbGxlZGJ5PVwidGl0bGVcIj5cblx0XHRcdFx0PGRldGFpbHMgY2xhc3M9XCJtYWluXCIgb3Blbj5cblx0XHRcdFx0XHQ8c3VtbWFyeT48aDIgaWQ9XCJ0aXRsZVwiPlRoZW1lPC9oMj48c3BhbiBjbGFzcz1cImZsYWdcIiBoaWRkZW4+VW5zYXZlZCBjaGFuZ2VzPC9zcGFuPjwvc3VtbWFyeT5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYm9keVwiPlxuXHRcdFx0XHRcdFx0PGZpZWxkc2V0IGNsYXNzPVwibW9kZXMtc2V0XCI+XG5cdFx0XHRcdFx0XHRcdDxsZWdlbmQ+UHJldmlldzwvbGVnZW5kPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwibW9kZXNcIj5cblx0XHRcdFx0XHRcdFx0XHQ8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIG5hbWU9XCJtb2RlXCIgdmFsdWU9XCJsaWdodFwiPiBMaWdodDwvbGFiZWw+XG5cdFx0XHRcdFx0XHRcdFx0PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwibW9kZVwiIHZhbHVlPVwiZGFya1wiPiBEYXJrPC9sYWJlbD5cblx0XHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0XHQ8L2ZpZWxkc2V0PlxuXHRcdFx0XHRcdFx0JHtHUk9VUFMubWFwKChncm91cCkgPT4gdGhpcy5maWVsZHNldChncm91cC5sZWdlbmQsIGdyb3VwLnRva2Vucy5maWx0ZXIoKFtrZXldKSA9PiB0aGlzLnJvbGVzW2tleV0pKSkuam9pbihcIlwiKX1cblx0XHRcdFx0XHRcdDxkZXRhaWxzIGNsYXNzPVwiYWR2YW5jZWRcIiBuYW1lPVwidGhlbWUtcGFuZWwtc2VjdGlvblwiPlxuXHRcdFx0XHRcdFx0XHQ8c3VtbWFyeT5FdmVyeSBjb2xvcjwvc3VtbWFyeT5cblx0XHRcdFx0XHRcdFx0PGRpdj5cblx0XHRcdFx0XHRcdFx0XHQke3RoaXMuZmllbGRzZXQoXCJBbGwgdG9rZW5zXCIsIHRoaXMudG9rZW5zLm1hcCgodG9rZW4pID0+IFt0b2tlbi5rZXksIHRva2VuLnJvbGVdKSwgdHJ1ZSl9XG5cdFx0XHRcdFx0XHRcdFx0JHt0aGlzLmNvbnRleHQgPT09IFwic2l0ZVwiID8gXCI8ZmllbGRzZXQ+PGxlZ2VuZD5HcmFkaWVudDwvbGVnZW5kPjxkaXYgY2xhc3M9XFxcInN0b3BzXFxcIj48L2Rpdj48YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgZGF0YS1hY3Rpb249XFxcImFkZC1zdG9wXFxcIj5BZGQgYSBjb2xvcjwvYnV0dG9uPjwvZmllbGRzZXQ+XCIgOiBcIlwifVxuXHRcdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHRcdDwvZGV0YWlscz5cblx0XHRcdFx0XHRcdDxtZW51PlxuXHRcdFx0XHRcdFx0XHQ8bGk+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJ1bmRvXCI+VW5kbzwvYnV0dG9uPjwvbGk+XG5cdFx0XHRcdFx0XHRcdDxsaT48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdGlvbj1cInJlc2V0XCI+UmVzZXQ8L2J1dHRvbj48L2xpPlxuXHRcdFx0XHRcdFx0XHQ8bGk+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJzYXZlXCIgZGF0YS1hY3Rpb249XCJzYXZlXCI+U2F2ZTwvYnV0dG9uPjwvbGk+XG5cdFx0XHRcdFx0XHRcdDxsaT48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdGlvbj1cImRvd25sb2FkXCI+RG93bmxvYWQ8L2J1dHRvbj48L2xpPlxuXHRcdFx0XHRcdFx0PC9tZW51PlxuXHRcdFx0XHRcdFx0PG91dHB1dCBjbGFzcz1cInN0YXR1c1wiIHJvbGU9XCJzdGF0dXNcIj48L291dHB1dD5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kZXRhaWxzPlxuXHRcdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImNsb3NlXCIgYXJpYS1sYWJlbD1cIkhpZGUgdGhlIHRoZW1lIHBhbmVsXCIgJHtzdXBwb3J0c1BvcG92ZXIgPyAncG9wb3ZlcnRhcmdldD1cInBhbmVsXCIgcG9wb3ZlcnRhcmdldGFjdGlvbj1cImhpZGVcIicgOiBcIlwifT4mdGltZXM7PC9idXR0b24+XG5cdFx0XHQ8L2FzaWRlPlxuXHRcdFx0PGRpdiBjbGFzcz1cInByb2JlXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9kaXY+YDtcblxuXHRcdHRoaXMucGFuZWwgPSByb290LnF1ZXJ5U2VsZWN0b3IoXCIucGFuZWxcIik7XG5cdFx0dGhpcy5tYWluID0gcm9vdC5xdWVyeVNlbGVjdG9yKFwiLm1haW5cIik7XG5cdFx0dGhpcy5zdGF0dXMgPSByb290LnF1ZXJ5U2VsZWN0b3IoXCIuc3RhdHVzXCIpO1xuXG5cdFx0Y29uc3Qgb3BlbiA9IHJlYWQobG9jYWxTdG9yYWdlLCBcIm9wZW5cIiwgZmFsc2UpO1xuXHRcdGNvbnN0IGV4cGFuZGVkID0gcmVhZChsb2NhbFN0b3JhZ2UsIFwiZXhwYW5kZWRcIiwgdHJ1ZSk7XG5cdFx0dGhpcy5tYWluLm9wZW4gPSBleHBhbmRlZDtcblx0XHRpZiAob3BlbikgdGhpcy5zaG93KCk7XG5cblx0XHRpZiAoIXN1cHBvcnRzUG9wb3Zlcikge1xuXHRcdFx0cm9vdC5xdWVyeVNlbGVjdG9yKFwiLmxhdW5jaGVyXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNob3coKSk7XG5cdFx0XHRyb290LnF1ZXJ5U2VsZWN0b3IoXCIuY2xvc2VcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKTtcblx0XHR9XG5cdFx0Y29uc3QgbGF1bmNoZXIgPSByb290LnF1ZXJ5U2VsZWN0b3IoXCIubGF1bmNoZXJcIik7XG5cdFx0dGhpcy5wYW5lbC5hZGRFdmVudExpc3RlbmVyKFwidG9nZ2xlXCIsIChldmVudCkgPT4ge1xuXHRcdFx0bGF1bmNoZXIuaGlkZGVuID0gZXZlbnQubmV3U3RhdGUgPT09IFwib3BlblwiO1xuXHRcdFx0d3JpdGUobG9jYWxTdG9yYWdlLCBcIm9wZW5cIiwgZXZlbnQubmV3U3RhdGUgPT09IFwib3BlblwiKTtcblx0XHR9KTtcblx0XHR0aGlzLm1haW4uYWRkRXZlbnRMaXN0ZW5lcihcInRvZ2dsZVwiLCAoKSA9PiB3cml0ZShsb2NhbFN0b3JhZ2UsIFwiZXhwYW5kZWRcIiwgdGhpcy5tYWluLm9wZW4pKTtcblx0XHR0aGlzLnBhbmVsLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldmVudCkgPT4ge1xuXHRcdFx0aWYgKGV2ZW50LmtleSA9PT0gXCJFc2NhcGVcIiAmJiB0aGlzLm1haW4ub3Blbikge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR0aGlzLm1haW4ub3BlbiA9IGZhbHNlO1xuXHRcdFx0XHR0aGlzLm1haW4ucXVlcnlTZWxlY3RvcihcInN1bW1hcnlcIikuZm9jdXMoKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGZvciAoY29uc3QgcmFkaW8gb2Ygcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFtuYW1lPVwibW9kZVwiXScpKSB7XG5cdFx0XHRyYWRpby5jaGVja2VkID0gcmFkaW8udmFsdWUgPT09IHRoaXMubW9kZTtcblx0XHRcdHJhZGlvLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xuXHRcdFx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY29sb3JTY2hlbWUgPSByYWRpby52YWx1ZTtcblx0XHRcdFx0dGhpcy5yZWZyZXNoKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyb290LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoZXZlbnQpID0+IHtcblx0XHRcdGNvbnN0IGlucHV0ID0gZXZlbnQudGFyZ2V0O1xuXHRcdFx0aWYgKCFpbnB1dC5kYXRhc2V0LmtleSkgcmV0dXJuO1xuXHRcdFx0aWYgKGlucHV0LnR5cGUgPT09IFwiY29sb3JcIikgdGhpcy5zZXQoaW5wdXQuZGF0YXNldC5rZXksIGlucHV0LnZhbHVlKTtcblx0XHR9KTtcblx0XHRyb290LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKGV2ZW50KSA9PiB7XG5cdFx0XHRjb25zdCBpbnB1dCA9IGV2ZW50LnRhcmdldDtcblx0XHRcdGlmIChpbnB1dC50eXBlICE9PSBcInRleHRcIikgcmV0dXJuO1xuXHRcdFx0aWYgKGlucHV0LmRhdGFzZXQuc3RvcCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5zZXRTdG9wKE51bWJlcihpbnB1dC5kYXRhc2V0LnN0b3ApLCBpbnB1dC52YWx1ZS50cmltKCkpO1xuXHRcdFx0aWYgKCFpbnB1dC5kYXRhc2V0LmtleSkgcmV0dXJuO1xuXHRcdFx0Y29uc3QgdmFsdWUgPSBpbnB1dC52YWx1ZS50cmltKCk7XG5cdFx0XHRpbnB1dC5zZXRDdXN0b21WYWxpZGl0eShDU1Muc3VwcG9ydHMoXCJjb2xvclwiLCB2YWx1ZSkgPyBcIlwiIDogXCJOb3QgYSBDU1MgY29sb3JcIik7XG5cdFx0XHRpZiAoaW5wdXQuY2hlY2tWYWxpZGl0eSgpKSB0aGlzLnNldChpbnB1dC5kYXRhc2V0LmtleSwgdmFsdWUpO1xuXHRcdFx0ZWxzZSBpbnB1dC5yZXBvcnRWYWxpZGl0eSgpO1xuXHRcdH0pO1xuXHRcdHJvb3QuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdFx0Y29uc3QgYWN0aW9uID0gZXZlbnQudGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1hY3Rpb25dXCIpPy5kYXRhc2V0LmFjdGlvbjtcblx0XHRcdGlmIChhY3Rpb24pIHRoaXNbYWN0aW9uID09PSBcImFkZC1zdG9wXCIgPyBcImFkZFN0b3BcIiA6IGFjdGlvbiA9PT0gXCJyZW1vdmUtc3RvcFwiID8gXCJyZW1vdmVTdG9wXCIgOiBhY3Rpb25dKGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtYWN0aW9uXVwiKSk7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IGxlZ2VuZFxuXHQgKiBAcGFyYW0ge1tzdHJpbmcsIHN0cmluZ11bXX0gdG9rZW5zIGtleSBhbmQgbGFiZWxcblx0ICogQHBhcmFtIHtib29sZWFufSBbcm9sZXNdIGxhYmVsIHJvd3MgYnkgdG9rZW4gbmFtZSBhbmQgc2hvdyB0aGUgcm9sZVxuXHQgKi9cblx0ZmllbGRzZXQobGVnZW5kLCB0b2tlbnMsIHJvbGVzID0gZmFsc2UpIHtcblx0XHRjb25zdCByb3dzID0gdG9rZW5zLm1hcCgoW2tleSwgbGFiZWxdKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9IGAke3JvbGVzID8gXCJhbGxcIiA6IFwibWFpblwifS0ke2tleX1gO1xuXHRcdFx0Y29uc3QgbmFtZSA9IHJvbGVzID8gYC0tY29sb3ItJHtrZXl9YCA6IGxhYmVsO1xuXHRcdFx0cmV0dXJuIGA8ZGl2IGNsYXNzPVwicm93XCI+XG5cdFx0XHRcdDxsYWJlbCBmb3I9XCIke2lkfVwiPiR7bmFtZX08L2xhYmVsPlxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cImNvbG9yXCIgaWQ9XCIke2lkfVwiIGRhdGEta2V5PVwiJHtrZXl9XCIgdGl0bGU9XCIke3RoaXMucm9sZXNba2V5XX1cIj5cblx0XHRcdFx0PGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1rZXk9XCIke2tleX1cIiBhcmlhLWxhYmVsPVwiJHtuYW1lfSwgQ1NTIHZhbHVlXCIgc3BlbGxjaGVjaz1cImZhbHNlXCIgYXV0b2NvbXBsZXRlPVwib2ZmXCI+XG5cdFx0XHRcdCR7cm9sZXMgPyBgPHNwYW4gY2xhc3M9XCJyb2xlXCI+JHtsYWJlbH08L3NwYW4+YCA6IGA8b3V0cHV0IGZvcj1cIiR7aWR9XCIgZGF0YS1jb250cmFzdD1cIiR7a2V5fVwiPjwvb3V0cHV0PmB9XG5cdFx0XHQ8L2Rpdj5gO1xuXHRcdH0pO1xuXHRcdHJldHVybiBgPGZpZWxkc2V0PjxsZWdlbmQ+JHtsZWdlbmR9PC9sZWdlbmQ+JHtyb3dzLmpvaW4oXCJcIil9PC9maWVsZHNldD5gO1xuXHR9XG5cblx0c2hvdygpIHtcblx0XHRpZiAodGhpcy5wYW5lbC5zaG93UG9wb3ZlcikgdGhpcy5wYW5lbC5zaG93UG9wb3ZlcigpO1xuXHRcdGVsc2UgdGhpcy5wYW5lbC5oaWRkZW4gPSBmYWxzZTtcblx0XHR0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcihcIi5sYXVuY2hlclwiKS5oaWRkZW4gPSB0cnVlO1xuXHRcdHdyaXRlKGxvY2FsU3RvcmFnZSwgXCJvcGVuXCIsIHRydWUpO1xuXHR9XG5cblx0aGlkZSgpIHtcblx0XHRpZiAodGhpcy5wYW5lbC5oaWRlUG9wb3ZlcikgdGhpcy5wYW5lbC5oaWRlUG9wb3ZlcigpO1xuXHRcdGVsc2UgdGhpcy5wYW5lbC5oaWRkZW4gPSB0cnVlO1xuXHRcdHRoaXMuc2hhZG93Um9vdC5xdWVyeVNlbGVjdG9yKFwiLmxhdW5jaGVyXCIpLmhpZGRlbiA9IGZhbHNlO1xuXHRcdHdyaXRlKGxvY2FsU3RvcmFnZSwgXCJvcGVuXCIsIGZhbHNlKTtcblx0fVxuXG5cdC8qKiBUaGUgc2NvcGUgYSBrZXkgaXMgZWRpdGVkIGluOiB0aGlzIGNvbnRleHQncyBzZWN0aW9uIGlmIGl0IGFscmVhZHkgaG9sZHMgdGhlIGtleSwgZWxzZSB0aGUgdG9wIGxldmVsLiAqL1xuXHRzY29wZShrZXkpIHtcblx0XHRyZXR1cm4gdGhpcy5kcmFmdFt0aGlzLmNvbnRleHRdICYmIGtleSBpbiB0aGlzLmRyYWZ0W3RoaXMuY29udGV4dF0gPyB0aGlzLmRyYWZ0W3RoaXMuY29udGV4dF0gOiB0aGlzLmRyYWZ0O1xuXHR9XG5cblx0LyoqIFRoZSByZXNvbHZlZCBSR0JBIG9mIGEgQ1NTIGNvbG9yIGluIG9uZSBtb2RlLiAqL1xuXHRyZXNvbHZlKHZhbHVlLCBtb2RlKSB7XG5cdFx0Y29uc3QgcHJvYmUgPSB0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcihcIi5wcm9iZVwiKTtcblx0XHRwcm9iZS5zdHlsZS5jb2xvclNjaGVtZSA9IG1vZGU7XG5cdFx0cHJvYmUuc3R5bGUuY29sb3IgPSBcInRyYW5zcGFyZW50XCI7XG5cdFx0cHJvYmUuc3R5bGUuY29sb3IgPSB2YWx1ZTtcblx0XHRjb25zdCBjYW52YXMgPSAodGhpcy5jYW52YXMgPz89IG5ldyBPZmZzY3JlZW5DYW52YXMoMSwgMSkpO1xuXHRcdGNvbnN0IGNvbnRleHQgPSAodGhpcy5jb250ZXh0MmQgPz89IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIiwgeyB3aWxsUmVhZEZyZXF1ZW50bHk6IHRydWUgfSkpO1xuXHRcdGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDEsIDEpO1xuXHRcdGNvbnRleHQuZmlsbFN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShwcm9iZSkuY29sb3I7XG5cdFx0Y29udGV4dC5maWxsUmVjdCgwLCAwLCAxLCAxKTtcblx0XHRyZXR1cm4gWy4uLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIDEsIDEpLmRhdGFdO1xuXHR9XG5cblx0LyoqIFNldCBvbmUgdG9rZW4gZm9yIHRoZSBwcmV2aWV3ZWQgbW9kZSwga2VlcGluZyB0aGUgb3RoZXIgbW9kZSBhcyBpdCBjdXJyZW50bHkgbG9va3MuICovXG5cdHNldChrZXksIHZhbHVlKSB7XG5cdFx0dGhpcy5yZW1lbWJlcigpO1xuXHRcdGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZShrZXkpO1xuXHRcdGNvbnN0IG90aGVyID0gdGhpcy5tb2RlID09PSBcImxpZ2h0XCIgPyBcImRhcmtcIiA6IFwibGlnaHRcIjtcblx0XHRjb25zdCBjdXJyZW50ID0gc2NvcGVba2V5XTtcblx0XHRjb25zdCBvdGhlclZhbHVlID0gY3VycmVudCAmJiB0eXBlb2YgY3VycmVudCA9PT0gXCJvYmplY3RcIiA/IGN1cnJlbnRbb3RoZXJdIDogaGV4KHRoaXMucmVzb2x2ZShgdmFyKC0tY29sb3ItJHtrZXl9KWAsIG90aGVyKSk7XG5cdFx0c2NvcGVba2V5XSA9IHRoaXMubW9kZSA9PT0gXCJsaWdodFwiID8geyBsaWdodDogdmFsdWUsIGRhcms6IG90aGVyVmFsdWUgfSA6IHsgbGlnaHQ6IG90aGVyVmFsdWUsIGRhcms6IHZhbHVlIH07XG5cdFx0dGhpcy5jaGFuZ2VkKCk7XG5cdH1cblxuXHRncmFkaWVudCgpIHtcblx0XHRyZXR1cm4gdGhpcy5kcmFmdC5ncmFkaWVudCA/PyB0aGlzLmRlZmF1bHRHcmFkaWVudDtcblx0fVxuXG5cdHNldFN0b3AoaW5kZXgsIHZhbHVlKSB7XG5cdFx0aWYgKCFDU1Muc3VwcG9ydHMoXCJjb2xvclwiLCB2YWx1ZSkpIHJldHVybjtcblx0XHR0aGlzLnJlbWVtYmVyKCk7XG5cdFx0Y29uc3Qgc3RvcHMgPSBjbG9uZSh0aGlzLmdyYWRpZW50KCkpO1xuXHRcdHN0b3BzW2luZGV4XSA9IHZhbHVlO1xuXHRcdHRoaXMuZHJhZnQuZ3JhZGllbnQgPSBzdG9wcztcblx0XHR0aGlzLmNoYW5nZWQoKTtcblx0fVxuXG5cdGFkZFN0b3AoKSB7XG5cdFx0Y29uc3Qgc3RvcHMgPSBjbG9uZSh0aGlzLmdyYWRpZW50KCkpO1xuXHRcdGlmIChzdG9wcy5sZW5ndGggPj0gNCkgcmV0dXJuO1xuXHRcdHRoaXMucmVtZW1iZXIoKTtcblx0XHR0aGlzLmRyYWZ0LmdyYWRpZW50ID0gWy4uLnN0b3BzLCBzdG9wcy5hdCgtMSldO1xuXHRcdHRoaXMuY2hhbmdlZCgpO1xuXHR9XG5cblx0cmVtb3ZlU3RvcChidXR0b24pIHtcblx0XHRjb25zdCBzdG9wcyA9IGNsb25lKHRoaXMuZ3JhZGllbnQoKSk7XG5cdFx0aWYgKHN0b3BzLmxlbmd0aCA8PSAxKSByZXR1cm47XG5cdFx0dGhpcy5yZW1lbWJlcigpO1xuXHRcdHN0b3BzLnNwbGljZShOdW1iZXIoYnV0dG9uLmRhdGFzZXQuc3RvcCksIDEpO1xuXHRcdHRoaXMuZHJhZnQuZ3JhZGllbnQgPSBzdG9wcztcblx0XHR0aGlzLmNoYW5nZWQoKTtcblx0fVxuXG5cdHJlbWVtYmVyKCkge1xuXHRcdHRoaXMuaGlzdG9yeS5wdXNoKGNsb25lKHRoaXMuZHJhZnQpKTtcblx0fVxuXG5cdHVuZG8oKSB7XG5cdFx0aWYgKCF0aGlzLmhpc3RvcnkubGVuZ3RoKSByZXR1cm47XG5cdFx0dGhpcy5kcmFmdCA9IHRoaXMuaGlzdG9yeS5wb3AoKTtcblx0XHR0aGlzLmNoYW5nZWQoKTtcblx0fVxuXG5cdHJlc2V0KCkge1xuXHRcdHRoaXMucmVtZW1iZXIoKTtcblx0XHR0aGlzLmRyYWZ0ID0gY2xvbmUodGhpcy5zYXZlZCk7XG5cdFx0dGhpcy5jaGFuZ2VkKCk7XG5cdFx0dGhpcy5zYXkoXCJCYWNrIHRvIHRoZSBzYXZlZCB0aGVtZS5cIik7XG5cdH1cblxuXHRjaGFuZ2VkKCkge1xuXHRcdHdyaXRlKHNlc3Npb25TdG9yYWdlLCBcImRyYWZ0XCIsIHRoaXMuZGlydHkgPyB0aGlzLmRyYWZ0IDogdW5kZWZpbmVkKTtcblx0XHR0aGlzLmFwcGx5UHJldmlldygpO1xuXHRcdHRoaXMucmVmcmVzaCgpO1xuXHR9XG5cblx0Z2V0IGRpcnR5KCkge1xuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLmRyYWZ0KSAhPT0gSlNPTi5zdHJpbmdpZnkodGhpcy5zYXZlZCk7XG5cdH1cblxuXHQvKiogV3JpdGUgdGhlIGRyYWZ0IG9udG8gdGhlIHBhZ2UgYXMgaW5saW5lIGN1c3RvbSBwcm9wZXJ0aWVzLiAqL1xuXHRhcHBseVByZXZpZXcoKSB7XG5cdFx0Y29uc3Qgc3R5bGUgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGU7XG5cdFx0Zm9yIChjb25zdCB0b2tlbiBvZiB0aGlzLnRva2Vucykge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSB0aGlzLmRyYWZ0W3RoaXMuY29udGV4dF0/Llt0b2tlbi5rZXldID8/IHRoaXMuZHJhZnRbdG9rZW4ua2V5XTtcblx0XHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSBzdHlsZS5yZW1vdmVQcm9wZXJ0eShgLS1jb2xvci0ke3Rva2VuLmtleX1gKTtcblx0XHRcdGVsc2Ugc3R5bGUuc2V0UHJvcGVydHkoYC0tY29sb3ItJHt0b2tlbi5rZXl9YCwgdG9Dc3ModmFsdWUpKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuY29udGV4dCA9PT0gXCJzaXRlXCIpIHtcblx0XHRcdGNvbnN0IHN0b3BzID0gdGhpcy5ncmFkaWVudCgpO1xuXHRcdFx0Zm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IDQ7IGluZGV4KyspIHtcblx0XHRcdFx0aWYgKGluZGV4IDwgc3RvcHMubGVuZ3RoKSBzdHlsZS5zZXRQcm9wZXJ0eShgLS1jb2xvci1ncmFkaWVudC0ke2luZGV4ICsgMX1gLCB0b0NzcyhzdG9wc1tpbmRleF0pKTtcblx0XHRcdFx0ZWxzZSBzdHlsZS5yZW1vdmVQcm9wZXJ0eShgLS1jb2xvci1ncmFkaWVudC0ke2luZGV4ICsgMX1gKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IG5hbWVzID0gc3RvcHMubWFwKChfLCBpbmRleCkgPT4gYHZhcigtLWNvbG9yLWdyYWRpZW50LSR7aW5kZXggKyAxfSlgKTtcblx0XHRcdGlmIChuYW1lcy5sZW5ndGggPT09IDEpIG5hbWVzLnB1c2gobmFtZXNbMF0pO1xuXHRcdFx0c3R5bGUuc2V0UHJvcGVydHkoXCItLWdyYWRpZW50LXN0b3BzXCIsIG5hbWVzLmpvaW4oXCIsIFwiKSk7XG5cdFx0fVxuXHR9XG5cblx0LyoqIFVwZGF0ZSBldmVyeSBpbnB1dCwgY29udHJhc3QgcmVzdWx0IGFuZCBidXR0b24gdG8gbWF0Y2ggdGhlIGRyYWZ0IGFuZCB0aGUgcHJldmlld2VkIG1vZGUuICovXG5cdHJlZnJlc2goKSB7XG5cdFx0Y29uc3Qgcm9vdCA9IHRoaXMuc2hhZG93Um9vdDtcblx0XHRjb25zdCBtb2RlID0gdGhpcy5tb2RlO1xuXHRcdGZvciAoY29uc3QgcmFkaW8gb2Ygcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFtuYW1lPVwibW9kZVwiXScpKSByYWRpby5jaGVja2VkID0gcmFkaW8udmFsdWUgPT09IG1vZGU7XG5cdFx0Zm9yIChjb25zdCBpbnB1dCBvZiByb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbnB1dFtkYXRhLWtleV1cIikpIHtcblx0XHRcdGNvbnN0IGtleSA9IGlucHV0LmRhdGFzZXQua2V5O1xuXHRcdFx0Y29uc3QgcmdiYSA9IHRoaXMucmVzb2x2ZShgdmFyKC0tY29sb3ItJHtrZXl9KWAsIG1vZGUpO1xuXHRcdFx0aWYgKGlucHV0LnR5cGUgPT09IFwiY29sb3JcIikgaW5wdXQudmFsdWUgPSBoZXgocmdiYSk7XG5cdFx0XHRlbHNlIGlmIChpbnB1dCAhPT0gcm9vdC5hY3RpdmVFbGVtZW50KSB7XG5cdFx0XHRcdGNvbnN0IHZhbHVlID0gdGhpcy5zY29wZShrZXkpW2tleV07XG5cdFx0XHRcdGlucHV0LnZhbHVlID0gdmFsdWUgPT09IHVuZGVmaW5lZCA/IChyZ2JhWzNdID09PSAyNTUgPyBoZXgocmdiYSkgOiBgcmdiKCR7cmdiYS5zbGljZSgwLCAzKS5qb2luKFwiIFwiKX0gLyAkeyhyZ2JhWzNdIC8gMjU1KS50b0ZpeGVkKDIpfSlgKSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHZhbHVlIDogdmFsdWVbbW9kZV07XG5cdFx0XHRcdGlucHV0LnNldEN1c3RvbVZhbGlkaXR5KFwiXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRmb3IgKGNvbnN0IG91dHB1dCBvZiByb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCJvdXRwdXRbZGF0YS1jb250cmFzdF1cIikpIHtcblx0XHRcdGNvbnN0IHBhaXIgPSBDT05UUkFTVC5maW5kKChbdGV4dF0pID0+IHRleHQgPT09IG91dHB1dC5kYXRhc2V0LmNvbnRyYXN0KTtcblx0XHRcdGlmICghcGFpciB8fCAhdGhpcy5yb2xlc1twYWlyWzFdXSkge1xuXHRcdFx0XHRvdXRwdXQudGV4dENvbnRlbnQgPSBcIlwiO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IFt0ZXh0LCBiYWNrZ3JvdW5kLCBtaW5pbXVtXSA9IHBhaXI7XG5cdFx0XHRjb25zdCBiYWNrID0gb3Zlcih0aGlzLnJlc29sdmUoYHZhcigtLWNvbG9yLSR7YmFja2dyb3VuZH0pYCwgbW9kZSksIFsyNTUsIDI1NSwgMjU1XSk7XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHJhdGlvKG92ZXIodGhpcy5yZXNvbHZlKGB2YXIoLS1jb2xvci0ke3RleHR9KWAsIG1vZGUpLCBiYWNrKSwgYmFjayk7XG5cdFx0XHRjb25zdCBwYXNzID0gdmFsdWUgPj0gbWluaW11bTtcblx0XHRcdG91dHB1dC5kYXRhc2V0LnBhc3MgPSBTdHJpbmcocGFzcyk7XG5cdFx0XHRvdXRwdXQudGV4dENvbnRlbnQgPSBgJHt2YWx1ZS50b0ZpeGVkKDEpfSA6IDEgb24gJHtiYWNrZ3JvdW5kID09PSBcInBhZ2VcIiA/IFwidGhlIHBhZ2VcIiA6IFwidGhlIGJyYW5kIGNvbG9yXCJ9LCAke3Bhc3MgPyBcInBhc3Nlc1wiIDogYGJlbG93ICR7bWluaW11bX0gOiAxYH1gO1xuXHRcdH1cblx0XHRjb25zdCBzdG9wcyA9IHJvb3QucXVlcnlTZWxlY3RvcihcIi5zdG9wc1wiKTtcblx0XHRpZiAoc3RvcHMpIHtcblx0XHRcdGNvbnN0IGxpc3QgPSB0aGlzLmdyYWRpZW50KCk7XG5cdFx0XHRzdG9wcy5pbm5lckhUTUwgPSBsaXN0XG5cdFx0XHRcdC5tYXAoXG5cdFx0XHRcdFx0KHN0b3AsIGluZGV4KSA9PiBgPGRpdiBjbGFzcz1cInN0b3BcIj5cblx0XHRcdFx0XHRcdDxsYWJlbCBmb3I9XCJzdG9wLSR7aW5kZXh9XCI+Q29sb3IgJHtpbmRleCArIDF9PC9sYWJlbD5cblx0XHRcdFx0XHRcdDxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwic3RvcC0ke2luZGV4fVwiIGRhdGEtc3RvcD1cIiR7aW5kZXh9XCIgdmFsdWU9XCIke3RvQ3NzKHN0b3ApfVwiIHNwZWxsY2hlY2s9XCJmYWxzZVwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiPlxuXHRcdFx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJyZW1vdmUtc3RvcFwiIGRhdGEtc3RvcD1cIiR7aW5kZXh9XCIgYXJpYS1sYWJlbD1cIlJlbW92ZSBjb2xvciAke2luZGV4ICsgMX1cIiAke2xpc3QubGVuZ3RoIDw9IDEgPyBcImRpc2FibGVkXCIgOiBcIlwifT4mbWludXM7PC9idXR0b24+XG5cdFx0XHRcdFx0PC9kaXY+YCxcblx0XHRcdFx0KVxuXHRcdFx0XHQuam9pbihcIlwiKTtcblx0XHRcdHJvb3QucXVlcnlTZWxlY3RvcignW2RhdGEtYWN0aW9uPVwiYWRkLXN0b3BcIl0nKS5kaXNhYmxlZCA9IGxpc3QubGVuZ3RoID49IDQ7XG5cdFx0fVxuXHRcdHJvb3QucXVlcnlTZWxlY3RvcignW2RhdGEtYWN0aW9uPVwidW5kb1wiXScpLmRpc2FibGVkID0gIXRoaXMuaGlzdG9yeS5sZW5ndGg7XG5cdFx0cm9vdC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hY3Rpb249XCJyZXNldFwiXScpLmRpc2FibGVkID0gIXRoaXMuZGlydHk7XG5cdFx0cm9vdC5xdWVyeVNlbGVjdG9yKFwiLmZsYWdcIikuaGlkZGVuID0gIXRoaXMuZGlydHk7XG5cdH1cblxuXHRhc3luYyBzYXZlKCkge1xuXHRcdHRoaXMuc2F5KFwiU2F2aW5nXHUyMDI2XCIpO1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKEVORFBPSU5ULCB7IG1ldGhvZDogXCJQT1NUXCIsIGhlYWRlcnM6IHsgXCJjb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSwgYm9keTogSlNPTi5zdHJpbmdpZnkodGhpcy5kcmFmdCkgfSk7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG5cdFx0XHRpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yKTtcblx0XHRcdHRoaXMuc2F2ZWQgPSBjbG9uZSh0aGlzLmRyYWZ0KTtcblx0XHRcdHRoaXMuaGlzdG9yeSA9IFtdO1xuXHRcdFx0d3JpdGUoc2Vzc2lvblN0b3JhZ2UsIFwiZHJhZnRcIiwgdW5kZWZpbmVkKTtcblx0XHRcdHRoaXMucmVmcmVzaCgpO1xuXHRcdFx0dGhpcy5zYXkoYFNhdmVkIHRvICR7cmVzdWx0LmZpbGV9LiBUaGUgc2l0ZSBpcyByZWJ1aWxkaW5nLmApO1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHR0aGlzLnNheShgTm90IHNhdmVkOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG5cdFx0fVxuXHR9XG5cblx0ZG93bmxvYWQoKSB7XG5cdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtgJHtKU09OLnN0cmluZ2lmeSh0aGlzLmRyYWZ0LCBudWxsLCBcIlxcdFwiKX1cXG5gXSwgeyB0eXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9KTtcblx0XHRjb25zdCBsaW5rID0gT2JqZWN0LmFzc2lnbihkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKSwgeyBocmVmOiBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpLCBkb3dubG9hZDogXCJ0aGVtZS5qc29uXCIgfSk7XG5cdFx0bGluay5jbGljaygpO1xuXHRcdFVSTC5yZXZva2VPYmplY3RVUkwobGluay5ocmVmKTtcblx0XHR0aGlzLnNheShgRG93bmxvYWRlZC4gUHV0IGl0IGluICR7dGhpcy5maWxlLnJlcGxhY2UoL3RoZW1lXFwuanNvbiQvLCBcIlwiKX0gdG8ga2VlcCBpdC5gKTtcblx0fVxuXG5cdHNheShtZXNzYWdlKSB7XG5cdFx0dGhpcy5zdGF0dXMudGV4dENvbnRlbnQgPSBtZXNzYWdlO1xuXHR9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KFwidGhlbWUtcGFuZWxcIikpIGN1c3RvbUVsZW1lbnRzLmRlZmluZShcInRoZW1lLXBhbmVsXCIsIFRoZW1lUGFuZWwpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUtBLElBQU0sV0FBVztBQUNqQixJQUFNLFFBQVE7QUFHZCxJQUFNLFNBQVM7QUFBQSxFQUNkLEVBQUUsUUFBUSxTQUFTLFFBQVEsQ0FBQyxDQUFDLFVBQVUsYUFBYSxHQUFHLENBQUMsZUFBZSxzQkFBc0IsR0FBRyxDQUFDLGFBQWEscUJBQXFCLENBQUMsRUFBRTtBQUFBLEVBQ3RJLEVBQUUsUUFBUSxRQUFRLFFBQVEsQ0FBQyxDQUFDLFFBQVEsaUJBQWlCLEdBQUcsQ0FBQyxXQUFXLGtCQUFrQixHQUFHLENBQUMsVUFBVSxtQkFBbUIsQ0FBQyxFQUFFO0FBQUEsRUFDMUgsRUFBRSxRQUFRLFFBQVEsUUFBUSxDQUFDLENBQUMsUUFBUSxXQUFXLEdBQUcsQ0FBQyxjQUFjLGdCQUFnQixHQUFHLENBQUMsUUFBUSxPQUFPLENBQUMsRUFBRTtBQUN4RztBQUdBLElBQU0sV0FBVztBQUFBLEVBQ2hCLENBQUMsUUFBUSxRQUFRLEdBQUc7QUFBQSxFQUNwQixDQUFDLGNBQWMsUUFBUSxHQUFHO0FBQUEsRUFDMUIsQ0FBQyxlQUFlLFFBQVEsR0FBRztBQUFBLEVBQzNCLENBQUMsUUFBUSxRQUFRLEdBQUc7QUFBQSxFQUNwQixDQUFDLGFBQWEsVUFBVSxHQUFHO0FBQzVCO0FBRUEsSUFBTSxPQUFPLENBQUMsU0FBUyxLQUFLLGFBQWE7QUFDeEMsTUFBSTtBQUNILFVBQU0sUUFBUSxRQUFRLFFBQVEsR0FBRyxLQUFLLElBQUksR0FBRyxFQUFFO0FBQy9DLFdBQU8sVUFBVSxPQUFPLFdBQVcsS0FBSyxNQUFNLEtBQUs7QUFBQSxFQUNwRCxRQUFRO0FBQ1AsV0FBTztBQUFBLEVBQ1I7QUFDRDtBQUNBLElBQU0sUUFBUSxDQUFDLFNBQVMsS0FBSyxVQUFVO0FBQ3RDLE1BQUk7QUFDSCxRQUFJLFVBQVUsT0FBVyxTQUFRLFdBQVcsR0FBRyxLQUFLLElBQUksR0FBRyxFQUFFO0FBQUEsUUFDeEQsU0FBUSxRQUFRLEdBQUcsS0FBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLFVBQVUsS0FBSyxDQUFDO0FBQUEsRUFDOUQsUUFBUTtBQUFBLEVBRVI7QUFDRDtBQUdBLElBQU0sUUFBUSxDQUFDLFVBQVcsT0FBTyxVQUFVLFdBQVcsUUFBUSxjQUFjLE1BQU0sS0FBSyxLQUFLLE1BQU0sSUFBSTtBQUN0RyxJQUFNLFFBQVEsQ0FBQyxVQUFVLGdCQUFnQixLQUFLO0FBQzlDLElBQU0sTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLFNBQVMsR0FBRyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUc3RixJQUFNLFlBQVksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU07QUFDaEMsUUFBTSxVQUFVLENBQUMsTUFBTTtBQUN0QixVQUFNLElBQUksSUFBSTtBQUNkLFdBQU8sS0FBSyxVQUFVLElBQUksVUFBVSxJQUFJLFNBQVMsVUFBVTtBQUFBLEVBQzVEO0FBQ0EsU0FBTyxTQUFTLFFBQVEsQ0FBQyxJQUFJLFNBQVMsUUFBUSxDQUFDLElBQUksU0FBUyxRQUFRLENBQUM7QUFDdEU7QUFDQSxJQUFNLFFBQVEsQ0FBQyxHQUFHLE1BQU07QUFDdkIsUUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxNQUFNLElBQUksQ0FBQztBQUNsRSxVQUFRLEtBQUssU0FBUyxLQUFLO0FBQzVCO0FBRUEsSUFBTSxPQUFPLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxNQUFNO0FBQzVDLFFBQU0sSUFBSSxJQUFJO0FBQ2QsU0FBTyxDQUFDLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxJQUFJLEVBQUUsR0FBRyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sSUFBSSxFQUFFLEdBQUcsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLElBQUksRUFBRSxHQUFHLEdBQUc7QUFDbEg7QUFFQSxJQUFNLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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
