// assets/scripts/theme-panel.js
var ENDPOINT = "/.course-kit/theme";
var COPY = JSON.parse(document.getElementById("copy-data")?.textContent || "{}");
var t = (key, vars = {}) => String(COPY.themePanel?.[key] ?? "").replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
var STORE = "course-kit:theme-panel";
var GROUPS = [
  { legend: "brand", tokens: [["accent", "brandColor"], ["accent-text", "brandColorForText"], ["on-accent", "textOnBrandColor"], ["accent-secondary", "wayfindingColor"], ["on-accent-secondary", "textOnWayfindingColor"]] },
  { legend: "page", tokens: [["page", "pageBackground"], ["surface", "cardsAndPanels"], ["border", "linesAndBorders"]] },
  { legend: "text", tokens: [["text", "bodyText"], ["text-muted", "secondaryText"], ["link", "links"]] }
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
  const t2 = a / 255;
  return [Math.round(r * t2 + br * (1 - t2)), Math.round(g * t2 + bg * (1 - t2)), Math.round(b * t2 + bb * (1 - t2)), 255];
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
			<button type="button" class="launcher" ${supportsPopover ? 'popovertarget="panel" popovertargetaction="show"' : ""}>${t("theme")}</button>
			<aside class="panel" id="panel" ${supportsPopover ? 'popover="manual"' : "hidden"} aria-labelledby="title">
				<details class="main" open>
					<summary><h2 id="title">${t("theme")}</h2><span class="flag" hidden>${t("unsavedChanges")}</span></summary>
					<div class="body">
						<fieldset class="modes-set">
							<legend>${t("preview")}</legend>
							<div class="modes">
								<label><input type="radio" name="mode" value="light"> ${t("light")}</label>
								<label><input type="radio" name="mode" value="dark"> ${t("dark")}</label>
							</div>
						</fieldset>
						${GROUPS.map((group) => this.fieldset(t(group.legend), group.tokens.filter(([key]) => this.roles[key]).map(([key, label]) => [key, t(label)]))).join("")}
						<details class="advanced" name="theme-panel-section">
							<summary>${t("everyColor")}</summary>
							<div>
								${this.fieldset(t("allTokens"), this.tokens.map((token) => [token.key, token.role]), true)}
								${this.context === "site" ? `<fieldset><legend>${t("gradient")}</legend><div class="stops"></div><button type="button" data-action="add-stop">${t("addAColor")}</button></fieldset>` : ""}
							</div>
						</details>
						<menu>
							<li><button type="button" data-action="undo">${t("undo")}</button></li>
							<li><button type="button" data-action="reset">${t("reset")}</button></li>
							<li><button type="button" class="save" data-action="save">${t("save")}</button></li>
							<li><button type="button" data-action="download">${t("download")}</button></li>
						</menu>
						<output class="status" role="status"></output>
					</div>
				</details>
				<button type="button" class="close" aria-label="${t("hideTheThemePanel")}" ${supportsPopover ? 'popovertarget="panel" popovertargetaction="hide"' : ""}>&times;</button>
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
      input.setCustomValidity(CSS.supports("color", value) ? "" : t("notACssColor"));
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
				<input type="text" data-key="${key}" aria-label="${t("cssValue", { name })}" spellcheck="false" autocomplete="off">
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
    this.say(t("backToTheSaved"));
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
      output.textContent = t("contrast", { ratio: value.toFixed(1), ground: background === "page" ? t("thePage") : t("theBrandColor"), verdict: pass ? t("passes") : t("below", { minimum }) });
    }
    const stops = root.querySelector(".stops");
    if (stops) {
      const list = this.gradient();
      stops.innerHTML = list.map(
        (stop, index) => `<div class="stop">
						<label for="stop-${index}">${t("color", { n: index + 1 })}</label>
						<input type="text" id="stop-${index}" data-stop="${index}" value="${toCss(stop)}" spellcheck="false" autocomplete="off">
						<button type="button" data-action="remove-stop" data-stop="${index}" aria-label="${t("removeColor", { n: index + 1 })}" ${list.length <= 1 ? "disabled" : ""}>&minus;</button>
					</div>`
      ).join("");
      root.querySelector('[data-action="add-stop"]').disabled = list.length >= 4;
    }
    root.querySelector('[data-action="undo"]').disabled = !this.history.length;
    root.querySelector('[data-action="reset"]').disabled = !this.dirty;
    root.querySelector(".flag").hidden = !this.dirty;
  }
  async save() {
    this.say(t("saving"));
    try {
      const response = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(this.draft) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      this.saved = clone(this.draft);
      this.history = [];
      write(sessionStorage, "draft", void 0);
      this.refresh();
      this.say(t("savedToThe", { file: result.file }));
    } catch (error) {
      this.say(t("notSaved", { message: error.message }));
    }
  }
  download() {
    const blob = new Blob([`${JSON.stringify(this.draft, null, "	")}
`], { type: "application/json" });
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "theme.json" });
    link.click();
    URL.revokeObjectURL(link.href);
    this.say(t("downloadedPutItIn", { folder: this.file.replace(/theme\.json$/, "") }));
  }
  say(message) {
    this.status.textContent = message;
  }
};
if (!customElements.get("theme-panel")) customElements.define("theme-panel", ThemePanel);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvdGhlbWUtcGFuZWwuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogRGV2LW9ubHkgdGhlbWUgcGFuZWw6IHByZXZpZXcgY29sb3IgdG9rZW5zIG9uIHRoZSBsaXZlIHBhZ2UgYW5kIHNhdmUgdGhlbSB0b1xuICogYF9kYXRhL3RoZW1lLmpzb25gIHRocm91Z2ggdGhlIGRldiBzZXJ2ZXIuIFNlZSBkb2NzL3RoZW1lLXBhbmVsLm1kLlxuICovXG5cbmNvbnN0IEVORFBPSU5UID0gXCIvLmNvdXJzZS1raXQvdGhlbWVcIjtcblxuLyoqIFRoZSBwYW5lbCdzIHdvcmRpbmcsIGZyb20gdGhlIGAjY29weS1kYXRhYCBibG9jayB0aGUgbGF5b3V0IHJlbmRlcnMuICovXG5jb25zdCBDT1BZID0gSlNPTi5wYXJzZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvcHktZGF0YVwiKT8udGV4dENvbnRlbnQgfHwgXCJ7fVwiKTtcbi8qKiBgdChcImNvbG9yXCIsIHsgbjogMiB9KWA6IGEgYHRoZW1lUGFuZWxgIHN0cmluZyB3aXRoIGl0cyBge25hbWV9YCBwbGFjZWhvbGRlcnMgZmlsbGVkLiAqL1xuY29uc3QgdCA9IChrZXksIHZhcnMgPSB7fSkgPT4gU3RyaW5nKENPUFkudGhlbWVQYW5lbD8uW2tleV0gPz8gXCJcIikucmVwbGFjZSgvXFx7KFxcdyspXFx9L2csIChfLCBuYW1lKSA9PiBTdHJpbmcodmFyc1tuYW1lXSA/PyBcIlwiKSk7XG5jb25zdCBTVE9SRSA9IFwiY291cnNlLWtpdDp0aGVtZS1wYW5lbFwiO1xuXG4vKiogUGxhaW4tbGFuZ3VhZ2UgZ3JvdXBzIGZvciB0aGUgbW9zdCB1c2VkIHRva2VuczsgZXZlcnkgdG9rZW4gaXMgYWxzbyB1bmRlciBcIkV2ZXJ5IGNvbG9yXCIuICovXG5jb25zdCBHUk9VUFMgPSBbXG5cdHsgbGVnZW5kOiBcImJyYW5kXCIsIHRva2VuczogW1tcImFjY2VudFwiLCBcImJyYW5kQ29sb3JcIl0sIFtcImFjY2VudC10ZXh0XCIsIFwiYnJhbmRDb2xvckZvclRleHRcIl0sIFtcIm9uLWFjY2VudFwiLCBcInRleHRPbkJyYW5kQ29sb3JcIl0sIFtcImFjY2VudC1zZWNvbmRhcnlcIiwgXCJ3YXlmaW5kaW5nQ29sb3JcIl0sIFtcIm9uLWFjY2VudC1zZWNvbmRhcnlcIiwgXCJ0ZXh0T25XYXlmaW5kaW5nQ29sb3JcIl1dIH0sXG5cdHsgbGVnZW5kOiBcInBhZ2VcIiwgdG9rZW5zOiBbW1wicGFnZVwiLCBcInBhZ2VCYWNrZ3JvdW5kXCJdLCBbXCJzdXJmYWNlXCIsIFwiY2FyZHNBbmRQYW5lbHNcIl0sIFtcImJvcmRlclwiLCBcImxpbmVzQW5kQm9yZGVyc1wiXV0gfSxcblx0eyBsZWdlbmQ6IFwidGV4dFwiLCB0b2tlbnM6IFtbXCJ0ZXh0XCIsIFwiYm9keVRleHRcIl0sIFtcInRleHQtbXV0ZWRcIiwgXCJzZWNvbmRhcnlUZXh0XCJdLCBbXCJsaW5rXCIsIFwibGlua3NcIl1dIH0sXG5dO1xuXG4vKiogVGV4dCBhbmQgYmFja2dyb3VuZCBwYWlycyB3aG9zZSBjb250cmFzdCBpcyByZXBvcnRlZCwgc2hvd24gYmVzaWRlIHRoZSBmaXJzdCB0b2tlbi4gKi9cbmNvbnN0IENPTlRSQVNUID0gW1xuXHRbXCJ0ZXh0XCIsIFwicGFnZVwiLCA0LjVdLFxuXHRbXCJ0ZXh0LW11dGVkXCIsIFwicGFnZVwiLCA0LjVdLFxuXHRbXCJhY2NlbnQtdGV4dFwiLCBcInBhZ2VcIiwgNC41XSxcblx0W1wibGlua1wiLCBcInBhZ2VcIiwgNC41XSxcblx0W1wib24tYWNjZW50XCIsIFwiYWNjZW50XCIsIDQuNV0sXG5dO1xuXG5jb25zdCByZWFkID0gKHN0b3JhZ2UsIGtleSwgZmFsbGJhY2spID0+IHtcblx0dHJ5IHtcblx0XHRjb25zdCB2YWx1ZSA9IHN0b3JhZ2UuZ2V0SXRlbShgJHtTVE9SRX06JHtrZXl9YCk7XG5cdFx0cmV0dXJuIHZhbHVlID09PSBudWxsID8gZmFsbGJhY2sgOiBKU09OLnBhcnNlKHZhbHVlKTtcblx0fSBjYXRjaCB7XG5cdFx0cmV0dXJuIGZhbGxiYWNrO1xuXHR9XG59O1xuY29uc3Qgd3JpdGUgPSAoc3RvcmFnZSwga2V5LCB2YWx1ZSkgPT4ge1xuXHR0cnkge1xuXHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSBzdG9yYWdlLnJlbW92ZUl0ZW0oYCR7U1RPUkV9OiR7a2V5fWApO1xuXHRcdGVsc2Ugc3RvcmFnZS5zZXRJdGVtKGAke1NUT1JFfToke2tleX1gLCBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuXHR9IGNhdGNoIHtcblx0XHQvLyBzdG9yYWdlIGJsb2NrZWQ6IHRoZSBwYW5lbCBzdGlsbCB3b3JrcywgaXQganVzdCBmb3JnZXRzLlxuXHR9XG59O1xuXG4vKiogQHBhcmFtIHt1bmtub3dufSB2YWx1ZSBhIGNvbG9yIG9yIHsgbGlnaHQsIGRhcmsgfSAqL1xuY29uc3QgdG9Dc3MgPSAodmFsdWUpID0+ICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyB2YWx1ZSA6IGBsaWdodC1kYXJrKCR7dmFsdWUubGlnaHR9LCAke3ZhbHVlLmRhcmt9KWApO1xuY29uc3QgY2xvbmUgPSAodmFsdWUpID0+IHN0cnVjdHVyZWRDbG9uZSh2YWx1ZSk7XG5jb25zdCBoZXggPSAoW3IsIGcsIGJdKSA9PiBgIyR7W3IsIGcsIGJdLm1hcCgobikgPT4gbi50b1N0cmluZygxNikucGFkU3RhcnQoMiwgXCIwXCIpKS5qb2luKFwiXCIpfWA7XG5cbi8qKiBXQ0FHIHJlbGF0aXZlIGx1bWluYW5jZSBvZiA4LWJpdCBzUkdCLiAqL1xuY29uc3QgbHVtaW5hbmNlID0gKFtyLCBnLCBiXSkgPT4ge1xuXHRjb25zdCBjaGFubmVsID0gKGMpID0+IHtcblx0XHRjb25zdCBzID0gYyAvIDI1NTtcblx0XHRyZXR1cm4gcyA8PSAwLjAzOTI4ID8gcyAvIDEyLjkyIDogKChzICsgMC4wNTUpIC8gMS4wNTUpICoqIDIuNDtcblx0fTtcblx0cmV0dXJuIDAuMjEyNiAqIGNoYW5uZWwocikgKyAwLjcxNTIgKiBjaGFubmVsKGcpICsgMC4wNzIyICogY2hhbm5lbChiKTtcbn07XG5jb25zdCByYXRpbyA9IChhLCBiKSA9PiB7XG5cdGNvbnN0IFtoaSwgbG9dID0gW2x1bWluYW5jZShhKSwgbHVtaW5hbmNlKGIpXS5zb3J0KCh4LCB5KSA9PiB5IC0geCk7XG5cdHJldHVybiAoaGkgKyAwLjA1KSAvIChsbyArIDAuMDUpO1xufTtcbi8qKiBBIHRyYW5zbHVjZW50IGNvbG9yIHBhaW50ZWQgb3ZlciBhbiBvcGFxdWUgb25lLiAqL1xuY29uc3Qgb3ZlciA9IChbciwgZywgYiwgYV0sIFticiwgYmcsIGJiXSkgPT4ge1xuXHRjb25zdCB0ID0gYSAvIDI1NTtcblx0cmV0dXJuIFtNYXRoLnJvdW5kKHIgKiB0ICsgYnIgKiAoMSAtIHQpKSwgTWF0aC5yb3VuZChnICogdCArIGJnICogKDEgLSB0KSksIE1hdGgucm91bmQoYiAqIHQgKyBiYiAqICgxIC0gdCkpLCAyNTVdO1xufTtcblxuY29uc3QgU1RZTEVTID0gYFxuOmhvc3Qge1xuXHRhbGw6IGluaXRpYWw7XG5cdGNvbG9yLXNjaGVtZTogbGlnaHQgZGFyaztcblx0LS10cC1iZzogbGlnaHQtZGFyaygjZmZmLCAjMWQxZjI3KTtcblx0LS10cC10ZXh0OiBsaWdodC1kYXJrKCMxZDFmMjcsICNlY2VlZjQpO1xuXHQtLXRwLW11dGVkOiBsaWdodC1kYXJrKCM1NTViNmUsICNhOWFlYzApO1xuXHQtLXRwLWxpbmU6IGxpZ2h0LWRhcmsoI2M0YzhkNCwgIzQ1NDk1OSk7XG5cdC0tdHAtZm9jdXM6IGxpZ2h0LWRhcmsoIzBiNTdkMCwgIzhhYjRmOCk7XG5cdC0tdHAtZ29vZDogbGlnaHQtZGFyaygjMWQ2YjNjLCAjODZkN2E0KTtcblx0LS10cC1iYWQ6IGxpZ2h0LWRhcmsoI2EzMjYxYSwgI2ZmOWQ4Zik7XG5cdC0tdHAtZ2FwOiAwLjc1cmVtO1xuXHRmb250OiAwLjg3NXJlbS8xLjQ1IHN5c3RlbS11aSwgc2Fucy1zZXJpZjtcbn1cblxuKiB7IGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH1cblxuOmZvY3VzLXZpc2libGUge1xuXHRvdXRsaW5lOiAycHggc29saWQgdmFyKC0tdHAtZm9jdXMpO1xuXHRvdXRsaW5lLW9mZnNldDogMnB4O1xufVxuXG5idXR0b24sIGlucHV0LCBzZWxlY3QgeyBmb250OiBpbmhlcml0OyBjb2xvcjogaW5oZXJpdDsgfVxuXG5idXR0b24ge1xuXHRtaW4tYmxvY2stc2l6ZTogMnJlbTtcblx0bWluLWlubGluZS1zaXplOiAycmVtO1xuXHRwYWRkaW5nLWlubGluZTogMC43NXJlbTtcblx0Ym9yZGVyOiAxcHggc29saWQgdmFyKC0tdHAtbGluZSk7XG5cdGJvcmRlci1yYWRpdXM6IDAuMzc1cmVtO1xuXHRiYWNrZ3JvdW5kOiB2YXIoLS10cC1iZyk7XG5cdGN1cnNvcjogcG9pbnRlcjtcbn1cblxuYnV0dG9uOmRpc2FibGVkIHsgb3BhY2l0eTogMC41OyBjdXJzb3I6IG5vdC1hbGxvd2VkOyB9XG5cbltoaWRkZW5dIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OyB9XG5cbi5sYXVuY2hlciB7XG5cdHBvc2l0aW9uOiBmaXhlZDtcblx0aW5zZXQtaW5saW5lLWVuZDogMDtcblx0aW5zZXQtYmxvY2stc3RhcnQ6IDUwJTtcblx0dHJhbnNsYXRlOiAwIC01MCU7XG5cdHotaW5kZXg6IDIxNDc0ODM2NDY7XG5cdHdyaXRpbmctbW9kZTogdmVydGljYWwtcmw7XG5cdHBhZGRpbmc6IDAuNzVyZW0gMC40cmVtO1xuXHRib3JkZXItaW5saW5lLWVuZDogMDtcblx0Ym9yZGVyLXN0YXJ0LWVuZC1yYWRpdXM6IDA7XG5cdGJvcmRlci1lbmQtZW5kLXJhZGl1czogMDtcblx0Y29sb3I6IHZhcigtLXRwLXRleHQpO1xuXHRib3gtc2hhZG93OiAwIDJweCA4cHggcmdiKDAgMCAwIC8gMjAlKTtcbn1cblxuLnBhbmVsIHtcblx0cG9zaXRpb246IGZpeGVkO1xuXHRpbnNldDogYXV0bztcblx0aW5zZXQtaW5saW5lLWVuZDogdmFyKC0tdHAtZ2FwKTtcblx0aW5zZXQtYmxvY2stc3RhcnQ6IDUwJTtcblx0dHJhbnNsYXRlOiAwIC01MCU7XG5cdG1hcmdpbjogMDtcblx0ei1pbmRleDogMjE0NzQ4MzY0Nztcblx0aW5saW5lLXNpemU6IG1pbigyMnJlbSwgMTAwdncgLSAyICogdmFyKC0tdHAtZ2FwKSk7XG5cdG1heC1ibG9jay1zaXplOiBjYWxjKDEwMGR2aCAtIDIgKiB2YXIoLS10cC1nYXApKTtcblx0b3ZlcmZsb3c6IGF1dG87XG5cdG92ZXJzY3JvbGwtYmVoYXZpb3I6IGNvbnRhaW47XG5cdHNjcm9sbGJhci1ndXR0ZXI6IHN0YWJsZTtcblx0cGFkZGluZzogMDtcblx0Ym9yZGVyOiAxcHggc29saWQgdmFyKC0tdHAtbGluZSk7XG5cdGJvcmRlci1yYWRpdXM6IDAuNXJlbTtcblx0YmFja2dyb3VuZDogdmFyKC0tdHAtYmcpO1xuXHRjb2xvcjogdmFyKC0tdHAtdGV4dCk7XG5cdGJveC1zaGFkb3c6IDAgOHB4IDI4cHggcmdiKDAgMCAwIC8gMjUlKTtcblx0Y29udGFpbmVyLXR5cGU6IGlubGluZS1zaXplO1xuXG5cdG9wYWNpdHk6IDE7XG5cdHRyYW5zZm9ybTogbm9uZTtcblx0dHJhbnNpdGlvbi1wcm9wZXJ0eTogb3BhY2l0eSwgdHJhbnNmb3JtLCBkaXNwbGF5LCBvdmVybGF5O1xuXHR0cmFuc2l0aW9uLWR1cmF0aW9uOiAwLjJzO1xuXHR0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjogZWFzZS1vdXQ7XG5cdHRyYW5zaXRpb24tYmVoYXZpb3I6IGFsbG93LWRpc2NyZXRlO1xufVxuXG4ucGFuZWw6bm90KFtwb3BvdmVyXSkgeyBkaXNwbGF5OiBibG9jazsgfVxuXG4ucGFuZWw6cG9wb3Zlci1vcGVuIHtcblx0QHN0YXJ0aW5nLXN0eWxlIHtcblx0XHRvcGFjaXR5OiAwO1xuXHRcdHRyYW5zZm9ybTogdHJhbnNsYXRlWCgxcmVtKTtcblx0fVxufVxuXG4ucGFuZWxbcG9wb3Zlcl06bm90KDpwb3BvdmVyLW9wZW4pIHtcblx0b3BhY2l0eTogMDtcblx0dHJhbnNmb3JtOiB0cmFuc2xhdGVYKDFyZW0pO1xufVxuXG5AbWVkaWEgKHdpZHRoIDwgNDByZW0pIHtcblx0LnBhbmVsIHtcblx0XHRpbnNldC1pbmxpbmU6IDA7XG5cdFx0aW5zZXQtYmxvY2s6IGF1dG8gMDtcblx0XHR0cmFuc2xhdGU6IG5vbmU7XG5cdFx0aW5saW5lLXNpemU6IDEwMCU7XG5cdFx0bWF4LWJsb2NrLXNpemU6IDcwZHZoO1xuXHRcdGJvcmRlci1lbmQtc3RhcnQtcmFkaXVzOiAwO1xuXHRcdGJvcmRlci1lbmQtZW5kLXJhZGl1czogMDtcblx0XHRwYWRkaW5nLWJsb2NrLWVuZDogZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20pO1xuXHR9XG59XG5cbi5tYWluID4gc3VtbWFyeSB7XG5cdHBvc2l0aW9uOiBzdGlja3k7XG5cdGluc2V0LWJsb2NrLXN0YXJ0OiAwO1xuXHR6LWluZGV4OiAxO1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDAuNXJlbTtcblx0cGFkZGluZy1ibG9jazogMC41cmVtO1xuXHRwYWRkaW5nLWlubGluZTogMC43NXJlbSAzcmVtO1xuXHRiYWNrZ3JvdW5kOiB2YXIoLS10cC1iZyk7XG5cdGJvcmRlci1ibG9jay1lbmQ6IDFweCBzb2xpZCB2YXIoLS10cC1saW5lKTtcblx0Y3Vyc29yOiBwb2ludGVyO1xufVxuXG4ubWFpbjpub3QoW29wZW5dKSA+IHN1bW1hcnkgeyBib3JkZXItYmxvY2stZW5kOiAwOyB9XG5cbmgyIHsgbWFyZ2luOiAwOyBmb250LXNpemU6IDFyZW07IH1cblxuLmZsYWcgeyBmb250LXNpemU6IDAuNzVyZW07IGNvbG9yOiB2YXIoLS10cC1tdXRlZCk7IH1cblxuLmNsb3NlIHtcblx0cG9zaXRpb246IGFic29sdXRlO1xuXHRpbnNldC1ibG9jay1zdGFydDogMC4zNzVyZW07XG5cdGluc2V0LWlubGluZS1lbmQ6IDAuMzc1cmVtO1xuXHR6LWluZGV4OiAyO1xuXHRwYWRkaW5nOiAwO1xufVxuXG4uYm9keSB7XG5cdGRpc3BsYXk6IGdyaWQ7XG5cdGdhcDogMC43NXJlbTtcblx0cGFkZGluZzogMC43NXJlbTtcbn1cblxuZmllbGRzZXQge1xuXHRtYXJnaW46IDA7XG5cdHBhZGRpbmc6IDAuNXJlbSAwLjc1cmVtIDAuNzVyZW07XG5cdGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLXRwLWxpbmUpO1xuXHRib3JkZXItcmFkaXVzOiAwLjM3NXJlbTtcblx0ZGlzcGxheTogZ3JpZDtcblx0Z2FwOiAwLjVyZW07XG59XG5cbmxlZ2VuZCB7IHBhZGRpbmctaW5saW5lOiAwLjI1cmVtOyBmb250LXdlaWdodDogNjAwOyB9XG5cbi5tb2RlcyB7IGRpc3BsYXk6IGZsZXg7IGdhcDogMXJlbTsgfVxuXG4ucm93IHtcblx0ZGlzcGxheTogZ3JpZDtcblx0Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAyLjI1cmVtIDFmcjtcblx0Z3JpZC10ZW1wbGF0ZS1hcmVhczogXCJzd2F0Y2ggbGFiZWxcIiBcInN3YXRjaCB2YWx1ZVwiIFwiLiBjb250cmFzdFwiO1xuXHRjb2x1bW4tZ2FwOiAwLjVyZW07XG5cdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG59XG5cbi5yb3cgbGFiZWwgeyBncmlkLWFyZWE6IGxhYmVsOyB9XG4ucm93IGlucHV0W3R5cGU9XCJjb2xvclwiXSB7XG5cdGdyaWQtYXJlYTogc3dhdGNoO1xuXHRpbmxpbmUtc2l6ZTogMi4yNXJlbTtcblx0YmxvY2stc2l6ZTogMi4yNXJlbTtcblx0cGFkZGluZzogMDtcblx0Ym9yZGVyOiAxcHggc29saWQgdmFyKC0tdHAtbGluZSk7XG5cdGJvcmRlci1yYWRpdXM6IDAuMzc1cmVtO1xuXHRiYWNrZ3JvdW5kOiBub25lO1xuXHRmb3JjZWQtY29sb3ItYWRqdXN0OiBub25lO1xufVxuLnJvdyBpbnB1dFt0eXBlPVwidGV4dFwiXSB7XG5cdGdyaWQtYXJlYTogdmFsdWU7XG5cdGlubGluZS1zaXplOiAxMDAlO1xuXHRtaW4tYmxvY2stc2l6ZTogMS43NXJlbTtcblx0cGFkZGluZy1pbmxpbmU6IDAuMzc1cmVtO1xuXHRib3JkZXI6IDFweCBzb2xpZCB2YXIoLS10cC1saW5lKTtcblx0Ym9yZGVyLXJhZGl1czogMC4yNXJlbTtcblx0YmFja2dyb3VuZDogdmFyKC0tdHAtYmcpO1xuXHRmb250LWZhbWlseTogdWktbW9ub3NwYWNlLCBtb25vc3BhY2U7XG5cdGZvbnQtc2l6ZTogMC44MTI1cmVtO1xufVxuLnJvdyBpbnB1dFt0eXBlPVwidGV4dFwiXTp1c2VyLWludmFsaWQgeyBib3JkZXItY29sb3I6IHZhcigtLXRwLWJhZCk7IH1cbi5yb3cgb3V0cHV0IHsgZ3JpZC1hcmVhOiBjb250cmFzdDsgZm9udC1zaXplOiAwLjc1cmVtOyB9XG4ucm93IG91dHB1dFtkYXRhLXBhc3M9XCJ0cnVlXCJdIHsgY29sb3I6IHZhcigtLXRwLWdvb2QpOyB9XG4ucm93IG91dHB1dFtkYXRhLXBhc3M9XCJmYWxzZVwiXSB7IGNvbG9yOiB2YXIoLS10cC1iYWQpOyB9XG4ucm9sZSB7IGdyaWQtY29sdW1uOiAyOyBmb250LXNpemU6IDAuNzVyZW07IGNvbG9yOiB2YXIoLS10cC1tdXRlZCk7IH1cblxuLmFkdmFuY2VkID4gc3VtbWFyeSB7IGN1cnNvcjogcG9pbnRlcjsgZm9udC13ZWlnaHQ6IDYwMDsgfVxuLmFkdmFuY2VkW29wZW5dID4gc3VtbWFyeSB7IG1hcmdpbi1ibG9jay1lbmQ6IDAuNXJlbTsgfVxuLmFkdmFuY2VkID4gZGl2IHsgZGlzcGxheTogZ3JpZDsgZ2FwOiAwLjc1cmVtOyB9XG5cbi5zdG9wcyB7IGRpc3BsYXk6IGdyaWQ7IGdhcDogMC41cmVtOyB9XG4uc3RvcCB7IGRpc3BsYXk6IGZsZXg7IGdhcDogMC41cmVtOyBhbGlnbi1pdGVtczogY2VudGVyOyB9XG5cbm1lbnUge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRmbGV4LXdyYXA6IHdyYXA7XG5cdGdhcDogMC41cmVtO1xuXHRtYXJnaW46IDA7XG5cdHBhZGRpbmc6IDA7XG5cdGxpc3Qtc3R5bGU6IG5vbmU7XG59XG5cbi5zYXZlIHsgZm9udC13ZWlnaHQ6IDYwMDsgfVxuXG4uc3RhdHVzIHsgbWluLWJsb2NrLXNpemU6IDEuMjVyZW07IGZvbnQtc2l6ZTogMC44MTI1cmVtOyB9XG5cbi5wcm9iZSB7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgaW5saW5lLXNpemU6IDA7IGJsb2NrLXNpemU6IDA7IG92ZXJmbG93OiBoaWRkZW47IH1cblxuQGNvbnRhaW5lciAoaW5saW5lLXNpemUgPCAxNnJlbSkge1xuXHQucm93IHsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnI7IGdyaWQtdGVtcGxhdGUtYXJlYXM6IFwibGFiZWxcIiBcInN3YXRjaFwiIFwidmFsdWVcIiBcImNvbnRyYXN0XCI7IH1cblx0LnJvbGUgeyBncmlkLWNvbHVtbjogMTsgfVxufVxuXG5Ac3VwcG9ydHMgKGludGVycG9sYXRlLXNpemU6IGFsbG93LWtleXdvcmRzKSB7XG5cdDpob3N0IHsgaW50ZXJwb2xhdGUtc2l6ZTogYWxsb3cta2V5d29yZHM7IH1cblx0Lm1haW46OmRldGFpbHMtY29udGVudCB7XG5cdFx0YmxvY2stc2l6ZTogMDtcblx0XHRvdmVyZmxvdzogY2xpcDtcblx0XHR0cmFuc2l0aW9uOiBibG9jay1zaXplIDAuMnMgZWFzZS1vdXQsIGNvbnRlbnQtdmlzaWJpbGl0eSAwLjJzO1xuXHRcdHRyYW5zaXRpb24tYmVoYXZpb3I6IGFsbG93LWRpc2NyZXRlO1xuXHR9XG5cdC5tYWluW29wZW5dOjpkZXRhaWxzLWNvbnRlbnQgeyBibG9jay1zaXplOiBhdXRvOyB9XG59XG5cbkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjogcmVkdWNlKSB7XG5cdC5wYW5lbCwgLnBhbmVsOnBvcG92ZXItb3BlbiwgLnBhbmVsW3BvcG92ZXJdOm5vdCg6cG9wb3Zlci1vcGVuKSB7IHRyYW5zZm9ybTogbm9uZTsgdHJhbnNpdGlvbi1kdXJhdGlvbjogMC4wMXM7IH1cblx0Lm1haW46OmRldGFpbHMtY29udGVudCB7IHRyYW5zaXRpb246IG5vbmU7IH1cbn1cbmA7XG5cbmNsYXNzIFRoZW1lUGFuZWwgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cdGFzeW5jIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuXHRcdGlmICh0aGlzLnNoYWRvd1Jvb3QpIHJldHVybjtcblx0XHRsZXQgZGF0YTtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChFTkRQT0lOVCwgeyBjYWNoZTogXCJuby1zdG9yZVwiIH0pO1xuXHRcdFx0aWYgKCFyZXNwb25zZS5vaykgdGhyb3cgbmV3IEVycm9yKFN0cmluZyhyZXNwb25zZS5zdGF0dXMpKTtcblx0XHRcdGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBObyBkZXYgc2VydmVyIGVuZHBvaW50IChhIHN0YXRpYyBidWlsZCk6IHRoZXJlIGlzIG5vdGhpbmcgdG8gc2F2ZSB0by5cblx0XHRcdHRoaXMucmVtb3ZlKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuY29udGV4dCA9IHRoaXMuZ2V0QXR0cmlidXRlKFwiY29udGV4dFwiKSA9PT0gXCJkZWNrXCIgPyBcImRlY2tcIiA6IFwic2l0ZVwiO1xuXHRcdHRoaXMudG9rZW5zID0gZGF0YS50b2tlbnMuZmlsdGVyKCh0b2tlbikgPT4gdG9rZW5bdGhpcy5jb250ZXh0XSk7XG5cdFx0dGhpcy5yb2xlcyA9IE9iamVjdC5mcm9tRW50cmllcyh0aGlzLnRva2Vucy5tYXAoKHRva2VuKSA9PiBbdG9rZW4ua2V5LCB0b2tlbi5yb2xlXSkpO1xuXHRcdHRoaXMuZGVmYXVsdEdyYWRpZW50ID0gZGF0YS5ncmFkaWVudDtcblx0XHR0aGlzLmZpbGUgPSBkYXRhLmZpbGU7XG5cdFx0dGhpcy5zYXZlZCA9IGRhdGEudGhlbWU7XG5cdFx0dGhpcy5kcmFmdCA9IHJlYWQoc2Vzc2lvblN0b3JhZ2UsIFwiZHJhZnRcIiwgbnVsbCkgPz8gY2xvbmUodGhpcy5zYXZlZCk7XG5cdFx0dGhpcy5oaXN0b3J5ID0gW107XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0XHR0aGlzLmFwcGx5UHJldmlldygpO1xuXHRcdHRoaXMucmVmcmVzaCgpO1xuXHR9XG5cblx0LyoqIEByZXR1cm5zIHtzdHJpbmd9ICovXG5cdGdldCBtb2RlKCkge1xuXHRcdGNvbnN0IGZvcmNlZCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5jb2xvclNjaGVtZTtcblx0XHRpZiAoZm9yY2VkID09PSBcImxpZ2h0XCIgfHwgZm9yY2VkID09PSBcImRhcmtcIikgcmV0dXJuIGZvcmNlZDtcblx0XHRyZXR1cm4gbWF0Y2hNZWRpYShcIihwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaylcIikubWF0Y2hlcyA/IFwiZGFya1wiIDogXCJsaWdodFwiO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdGNvbnN0IHJvb3QgPSB0aGlzLmF0dGFjaFNoYWRvdyh7IG1vZGU6IFwib3BlblwiIH0pO1xuXHRcdGNvbnN0IHN1cHBvcnRzUG9wb3ZlciA9IFwicG9wb3ZlclwiIGluIEhUTUxFbGVtZW50LnByb3RvdHlwZTtcblx0XHRyb290LmlubmVySFRNTCA9IGBcblx0XHRcdDxzdHlsZT4ke1NUWUxFU308L3N0eWxlPlxuXHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsYXVuY2hlclwiICR7c3VwcG9ydHNQb3BvdmVyID8gJ3BvcG92ZXJ0YXJnZXQ9XCJwYW5lbFwiIHBvcG92ZXJ0YXJnZXRhY3Rpb249XCJzaG93XCInIDogXCJcIn0+JHt0KFwidGhlbWVcIil9PC9idXR0b24+XG5cdFx0XHQ8YXNpZGUgY2xhc3M9XCJwYW5lbFwiIGlkPVwicGFuZWxcIiAke3N1cHBvcnRzUG9wb3ZlciA/ICdwb3BvdmVyPVwibWFudWFsXCInIDogXCJoaWRkZW5cIn0gYXJpYS1sYWJlbGxlZGJ5PVwidGl0bGVcIj5cblx0XHRcdFx0PGRldGFpbHMgY2xhc3M9XCJtYWluXCIgb3Blbj5cblx0XHRcdFx0XHQ8c3VtbWFyeT48aDIgaWQ9XCJ0aXRsZVwiPiR7dChcInRoZW1lXCIpfTwvaDI+PHNwYW4gY2xhc3M9XCJmbGFnXCIgaGlkZGVuPiR7dChcInVuc2F2ZWRDaGFuZ2VzXCIpfTwvc3Bhbj48L3N1bW1hcnk+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImJvZHlcIj5cblx0XHRcdFx0XHRcdDxmaWVsZHNldCBjbGFzcz1cIm1vZGVzLXNldFwiPlxuXHRcdFx0XHRcdFx0XHQ8bGVnZW5kPiR7dChcInByZXZpZXdcIil9PC9sZWdlbmQ+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJtb2Rlc1wiPlxuXHRcdFx0XHRcdFx0XHRcdDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cIm1vZGVcIiB2YWx1ZT1cImxpZ2h0XCI+ICR7dChcImxpZ2h0XCIpfTwvbGFiZWw+XG5cdFx0XHRcdFx0XHRcdFx0PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwibW9kZVwiIHZhbHVlPVwiZGFya1wiPiAke3QoXCJkYXJrXCIpfTwvbGFiZWw+XG5cdFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdFx0PC9maWVsZHNldD5cblx0XHRcdFx0XHRcdCR7R1JPVVBTLm1hcCgoZ3JvdXApID0+IHRoaXMuZmllbGRzZXQodChncm91cC5sZWdlbmQpLCBncm91cC50b2tlbnMuZmlsdGVyKChba2V5XSkgPT4gdGhpcy5yb2xlc1trZXldKS5tYXAoKFtrZXksIGxhYmVsXSkgPT4gW2tleSwgdChsYWJlbCldKSkpLmpvaW4oXCJcIil9XG5cdFx0XHRcdFx0XHQ8ZGV0YWlscyBjbGFzcz1cImFkdmFuY2VkXCIgbmFtZT1cInRoZW1lLXBhbmVsLXNlY3Rpb25cIj5cblx0XHRcdFx0XHRcdFx0PHN1bW1hcnk+JHt0KFwiZXZlcnlDb2xvclwiKX08L3N1bW1hcnk+XG5cdFx0XHRcdFx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0XHRcdFx0JHt0aGlzLmZpZWxkc2V0KHQoXCJhbGxUb2tlbnNcIiksIHRoaXMudG9rZW5zLm1hcCgodG9rZW4pID0+IFt0b2tlbi5rZXksIHRva2VuLnJvbGVdKSwgdHJ1ZSl9XG5cdFx0XHRcdFx0XHRcdFx0JHt0aGlzLmNvbnRleHQgPT09IFwic2l0ZVwiID8gYDxmaWVsZHNldD48bGVnZW5kPiR7dChcImdyYWRpZW50XCIpfTwvbGVnZW5kPjxkaXYgY2xhc3M9XCJzdG9wc1wiPjwvZGl2PjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwiYWRkLXN0b3BcIj4ke3QoXCJhZGRBQ29sb3JcIil9PC9idXR0b24+PC9maWVsZHNldD5gIDogXCJcIn1cblx0XHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0XHQ8L2RldGFpbHM+XG5cdFx0XHRcdFx0XHQ8bWVudT5cblx0XHRcdFx0XHRcdFx0PGxpPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwidW5kb1wiPiR7dChcInVuZG9cIil9PC9idXR0b24+PC9saT5cblx0XHRcdFx0XHRcdFx0PGxpPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwicmVzZXRcIj4ke3QoXCJyZXNldFwiKX08L2J1dHRvbj48L2xpPlxuXHRcdFx0XHRcdFx0XHQ8bGk+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJzYXZlXCIgZGF0YS1hY3Rpb249XCJzYXZlXCI+JHt0KFwic2F2ZVwiKX08L2J1dHRvbj48L2xpPlxuXHRcdFx0XHRcdFx0XHQ8bGk+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJkb3dubG9hZFwiPiR7dChcImRvd25sb2FkXCIpfTwvYnV0dG9uPjwvbGk+XG5cdFx0XHRcdFx0XHQ8L21lbnU+XG5cdFx0XHRcdFx0XHQ8b3V0cHV0IGNsYXNzPVwic3RhdHVzXCIgcm9sZT1cInN0YXR1c1wiPjwvb3V0cHV0PlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2RldGFpbHM+XG5cdFx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2xvc2VcIiBhcmlhLWxhYmVsPVwiJHt0KFwiaGlkZVRoZVRoZW1lUGFuZWxcIil9XCIgJHtzdXBwb3J0c1BvcG92ZXIgPyAncG9wb3ZlcnRhcmdldD1cInBhbmVsXCIgcG9wb3ZlcnRhcmdldGFjdGlvbj1cImhpZGVcIicgOiBcIlwifT4mdGltZXM7PC9idXR0b24+XG5cdFx0XHQ8L2FzaWRlPlxuXHRcdFx0PGRpdiBjbGFzcz1cInByb2JlXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9kaXY+YDtcblxuXHRcdHRoaXMucGFuZWwgPSByb290LnF1ZXJ5U2VsZWN0b3IoXCIucGFuZWxcIik7XG5cdFx0dGhpcy5tYWluID0gcm9vdC5xdWVyeVNlbGVjdG9yKFwiLm1haW5cIik7XG5cdFx0dGhpcy5zdGF0dXMgPSByb290LnF1ZXJ5U2VsZWN0b3IoXCIuc3RhdHVzXCIpO1xuXG5cdFx0Y29uc3Qgb3BlbiA9IHJlYWQobG9jYWxTdG9yYWdlLCBcIm9wZW5cIiwgZmFsc2UpO1xuXHRcdGNvbnN0IGV4cGFuZGVkID0gcmVhZChsb2NhbFN0b3JhZ2UsIFwiZXhwYW5kZWRcIiwgdHJ1ZSk7XG5cdFx0dGhpcy5tYWluLm9wZW4gPSBleHBhbmRlZDtcblx0XHRpZiAob3BlbikgdGhpcy5zaG93KCk7XG5cblx0XHRpZiAoIXN1cHBvcnRzUG9wb3Zlcikge1xuXHRcdFx0cm9vdC5xdWVyeVNlbGVjdG9yKFwiLmxhdW5jaGVyXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNob3coKSk7XG5cdFx0XHRyb290LnF1ZXJ5U2VsZWN0b3IoXCIuY2xvc2VcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKTtcblx0XHR9XG5cdFx0Y29uc3QgbGF1bmNoZXIgPSByb290LnF1ZXJ5U2VsZWN0b3IoXCIubGF1bmNoZXJcIik7XG5cdFx0dGhpcy5wYW5lbC5hZGRFdmVudExpc3RlbmVyKFwidG9nZ2xlXCIsIChldmVudCkgPT4ge1xuXHRcdFx0bGF1bmNoZXIuaGlkZGVuID0gZXZlbnQubmV3U3RhdGUgPT09IFwib3BlblwiO1xuXHRcdFx0d3JpdGUobG9jYWxTdG9yYWdlLCBcIm9wZW5cIiwgZXZlbnQubmV3U3RhdGUgPT09IFwib3BlblwiKTtcblx0XHR9KTtcblx0XHR0aGlzLm1haW4uYWRkRXZlbnRMaXN0ZW5lcihcInRvZ2dsZVwiLCAoKSA9PiB3cml0ZShsb2NhbFN0b3JhZ2UsIFwiZXhwYW5kZWRcIiwgdGhpcy5tYWluLm9wZW4pKTtcblx0XHR0aGlzLnBhbmVsLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldmVudCkgPT4ge1xuXHRcdFx0aWYgKGV2ZW50LmtleSA9PT0gXCJFc2NhcGVcIiAmJiB0aGlzLm1haW4ub3Blbikge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR0aGlzLm1haW4ub3BlbiA9IGZhbHNlO1xuXHRcdFx0XHR0aGlzLm1haW4ucXVlcnlTZWxlY3RvcihcInN1bW1hcnlcIikuZm9jdXMoKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGZvciAoY29uc3QgcmFkaW8gb2Ygcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFtuYW1lPVwibW9kZVwiXScpKSB7XG5cdFx0XHRyYWRpby5jaGVja2VkID0gcmFkaW8udmFsdWUgPT09IHRoaXMubW9kZTtcblx0XHRcdHJhZGlvLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xuXHRcdFx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY29sb3JTY2hlbWUgPSByYWRpby52YWx1ZTtcblx0XHRcdFx0dGhpcy5yZWZyZXNoKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyb290LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoZXZlbnQpID0+IHtcblx0XHRcdGNvbnN0IGlucHV0ID0gZXZlbnQudGFyZ2V0O1xuXHRcdFx0aWYgKCFpbnB1dC5kYXRhc2V0LmtleSkgcmV0dXJuO1xuXHRcdFx0aWYgKGlucHV0LnR5cGUgPT09IFwiY29sb3JcIikgdGhpcy5zZXQoaW5wdXQuZGF0YXNldC5rZXksIGlucHV0LnZhbHVlKTtcblx0XHR9KTtcblx0XHRyb290LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKGV2ZW50KSA9PiB7XG5cdFx0XHRjb25zdCBpbnB1dCA9IGV2ZW50LnRhcmdldDtcblx0XHRcdGlmIChpbnB1dC50eXBlICE9PSBcInRleHRcIikgcmV0dXJuO1xuXHRcdFx0aWYgKGlucHV0LmRhdGFzZXQuc3RvcCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5zZXRTdG9wKE51bWJlcihpbnB1dC5kYXRhc2V0LnN0b3ApLCBpbnB1dC52YWx1ZS50cmltKCkpO1xuXHRcdFx0aWYgKCFpbnB1dC5kYXRhc2V0LmtleSkgcmV0dXJuO1xuXHRcdFx0Y29uc3QgdmFsdWUgPSBpbnB1dC52YWx1ZS50cmltKCk7XG5cdFx0XHRpbnB1dC5zZXRDdXN0b21WYWxpZGl0eShDU1Muc3VwcG9ydHMoXCJjb2xvclwiLCB2YWx1ZSkgPyBcIlwiIDogdChcIm5vdEFDc3NDb2xvclwiKSk7XG5cdFx0XHRpZiAoaW5wdXQuY2hlY2tWYWxpZGl0eSgpKSB0aGlzLnNldChpbnB1dC5kYXRhc2V0LmtleSwgdmFsdWUpO1xuXHRcdFx0ZWxzZSBpbnB1dC5yZXBvcnRWYWxpZGl0eSgpO1xuXHRcdH0pO1xuXHRcdHJvb3QuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdFx0Y29uc3QgYWN0aW9uID0gZXZlbnQudGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1hY3Rpb25dXCIpPy5kYXRhc2V0LmFjdGlvbjtcblx0XHRcdGlmIChhY3Rpb24pIHRoaXNbYWN0aW9uID09PSBcImFkZC1zdG9wXCIgPyBcImFkZFN0b3BcIiA6IGFjdGlvbiA9PT0gXCJyZW1vdmUtc3RvcFwiID8gXCJyZW1vdmVTdG9wXCIgOiBhY3Rpb25dKGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtYWN0aW9uXVwiKSk7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IGxlZ2VuZFxuXHQgKiBAcGFyYW0ge1tzdHJpbmcsIHN0cmluZ11bXX0gdG9rZW5zIGtleSBhbmQgbGFiZWxcblx0ICogQHBhcmFtIHtib29sZWFufSBbcm9sZXNdIGxhYmVsIHJvd3MgYnkgdG9rZW4gbmFtZSBhbmQgc2hvdyB0aGUgcm9sZVxuXHQgKi9cblx0ZmllbGRzZXQobGVnZW5kLCB0b2tlbnMsIHJvbGVzID0gZmFsc2UpIHtcblx0XHRjb25zdCByb3dzID0gdG9rZW5zLm1hcCgoW2tleSwgbGFiZWxdKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9IGAke3JvbGVzID8gXCJhbGxcIiA6IFwibWFpblwifS0ke2tleX1gO1xuXHRcdFx0Y29uc3QgbmFtZSA9IHJvbGVzID8gYC0tY29sb3ItJHtrZXl9YCA6IGxhYmVsO1xuXHRcdFx0cmV0dXJuIGA8ZGl2IGNsYXNzPVwicm93XCI+XG5cdFx0XHRcdDxsYWJlbCBmb3I9XCIke2lkfVwiPiR7bmFtZX08L2xhYmVsPlxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cImNvbG9yXCIgaWQ9XCIke2lkfVwiIGRhdGEta2V5PVwiJHtrZXl9XCIgdGl0bGU9XCIke3RoaXMucm9sZXNba2V5XX1cIj5cblx0XHRcdFx0PGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1rZXk9XCIke2tleX1cIiBhcmlhLWxhYmVsPVwiJHt0KFwiY3NzVmFsdWVcIiwgeyBuYW1lIH0pfVwiIHNwZWxsY2hlY2s9XCJmYWxzZVwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiPlxuXHRcdFx0XHQke3JvbGVzID8gYDxzcGFuIGNsYXNzPVwicm9sZVwiPiR7bGFiZWx9PC9zcGFuPmAgOiBgPG91dHB1dCBmb3I9XCIke2lkfVwiIGRhdGEtY29udHJhc3Q9XCIke2tleX1cIj48L291dHB1dD5gfVxuXHRcdFx0PC9kaXY+YDtcblx0XHR9KTtcblx0XHRyZXR1cm4gYDxmaWVsZHNldD48bGVnZW5kPiR7bGVnZW5kfTwvbGVnZW5kPiR7cm93cy5qb2luKFwiXCIpfTwvZmllbGRzZXQ+YDtcblx0fVxuXG5cdHNob3coKSB7XG5cdFx0aWYgKHRoaXMucGFuZWwuc2hvd1BvcG92ZXIpIHRoaXMucGFuZWwuc2hvd1BvcG92ZXIoKTtcblx0XHRlbHNlIHRoaXMucGFuZWwuaGlkZGVuID0gZmFsc2U7XG5cdFx0dGhpcy5zaGFkb3dSb290LnF1ZXJ5U2VsZWN0b3IoXCIubGF1bmNoZXJcIikuaGlkZGVuID0gdHJ1ZTtcblx0XHR3cml0ZShsb2NhbFN0b3JhZ2UsIFwib3BlblwiLCB0cnVlKTtcblx0fVxuXG5cdGhpZGUoKSB7XG5cdFx0aWYgKHRoaXMucGFuZWwuaGlkZVBvcG92ZXIpIHRoaXMucGFuZWwuaGlkZVBvcG92ZXIoKTtcblx0XHRlbHNlIHRoaXMucGFuZWwuaGlkZGVuID0gdHJ1ZTtcblx0XHR0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcihcIi5sYXVuY2hlclwiKS5oaWRkZW4gPSBmYWxzZTtcblx0XHR3cml0ZShsb2NhbFN0b3JhZ2UsIFwib3BlblwiLCBmYWxzZSk7XG5cdH1cblxuXHQvKiogVGhlIHNjb3BlIGEga2V5IGlzIGVkaXRlZCBpbjogdGhpcyBjb250ZXh0J3Mgc2VjdGlvbiBpZiBpdCBhbHJlYWR5IGhvbGRzIHRoZSBrZXksIGVsc2UgdGhlIHRvcCBsZXZlbC4gKi9cblx0c2NvcGUoa2V5KSB7XG5cdFx0cmV0dXJuIHRoaXMuZHJhZnRbdGhpcy5jb250ZXh0XSAmJiBrZXkgaW4gdGhpcy5kcmFmdFt0aGlzLmNvbnRleHRdID8gdGhpcy5kcmFmdFt0aGlzLmNvbnRleHRdIDogdGhpcy5kcmFmdDtcblx0fVxuXG5cdC8qKiBUaGUgcmVzb2x2ZWQgUkdCQSBvZiBhIENTUyBjb2xvciBpbiBvbmUgbW9kZS4gKi9cblx0cmVzb2x2ZSh2YWx1ZSwgbW9kZSkge1xuXHRcdGNvbnN0IHByb2JlID0gdGhpcy5zaGFkb3dSb290LnF1ZXJ5U2VsZWN0b3IoXCIucHJvYmVcIik7XG5cdFx0cHJvYmUuc3R5bGUuY29sb3JTY2hlbWUgPSBtb2RlO1xuXHRcdHByb2JlLnN0eWxlLmNvbG9yID0gXCJ0cmFuc3BhcmVudFwiO1xuXHRcdHByb2JlLnN0eWxlLmNvbG9yID0gdmFsdWU7XG5cdFx0Y29uc3QgY2FudmFzID0gKHRoaXMuY2FudmFzID8/PSBuZXcgT2Zmc2NyZWVuQ2FudmFzKDEsIDEpKTtcblx0XHRjb25zdCBjb250ZXh0ID0gKHRoaXMuY29udGV4dDJkID8/PSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIsIHsgd2lsbFJlYWRGcmVxdWVudGx5OiB0cnVlIH0pKTtcblx0XHRjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAxLCAxKTtcblx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IGdldENvbXB1dGVkU3R5bGUocHJvYmUpLmNvbG9yO1xuXHRcdGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgMSwgMSk7XG5cdFx0cmV0dXJuIFsuLi5jb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCAxLCAxKS5kYXRhXTtcblx0fVxuXG5cdC8qKiBTZXQgb25lIHRva2VuIGZvciB0aGUgcHJldmlld2VkIG1vZGUsIGtlZXBpbmcgdGhlIG90aGVyIG1vZGUgYXMgaXQgY3VycmVudGx5IGxvb2tzLiAqL1xuXHRzZXQoa2V5LCB2YWx1ZSkge1xuXHRcdHRoaXMucmVtZW1iZXIoKTtcblx0XHRjb25zdCBzY29wZSA9IHRoaXMuc2NvcGUoa2V5KTtcblx0XHRjb25zdCBvdGhlciA9IHRoaXMubW9kZSA9PT0gXCJsaWdodFwiID8gXCJkYXJrXCIgOiBcImxpZ2h0XCI7XG5cdFx0Y29uc3QgY3VycmVudCA9IHNjb3BlW2tleV07XG5cdFx0Y29uc3Qgb3RoZXJWYWx1ZSA9IGN1cnJlbnQgJiYgdHlwZW9mIGN1cnJlbnQgPT09IFwib2JqZWN0XCIgPyBjdXJyZW50W290aGVyXSA6IGhleCh0aGlzLnJlc29sdmUoYHZhcigtLWNvbG9yLSR7a2V5fSlgLCBvdGhlcikpO1xuXHRcdHNjb3BlW2tleV0gPSB0aGlzLm1vZGUgPT09IFwibGlnaHRcIiA/IHsgbGlnaHQ6IHZhbHVlLCBkYXJrOiBvdGhlclZhbHVlIH0gOiB7IGxpZ2h0OiBvdGhlclZhbHVlLCBkYXJrOiB2YWx1ZSB9O1xuXHRcdHRoaXMuY2hhbmdlZCgpO1xuXHR9XG5cblx0Z3JhZGllbnQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZHJhZnQuZ3JhZGllbnQgPz8gdGhpcy5kZWZhdWx0R3JhZGllbnQ7XG5cdH1cblxuXHRzZXRTdG9wKGluZGV4LCB2YWx1ZSkge1xuXHRcdGlmICghQ1NTLnN1cHBvcnRzKFwiY29sb3JcIiwgdmFsdWUpKSByZXR1cm47XG5cdFx0dGhpcy5yZW1lbWJlcigpO1xuXHRcdGNvbnN0IHN0b3BzID0gY2xvbmUodGhpcy5ncmFkaWVudCgpKTtcblx0XHRzdG9wc1tpbmRleF0gPSB2YWx1ZTtcblx0XHR0aGlzLmRyYWZ0LmdyYWRpZW50ID0gc3RvcHM7XG5cdFx0dGhpcy5jaGFuZ2VkKCk7XG5cdH1cblxuXHRhZGRTdG9wKCkge1xuXHRcdGNvbnN0IHN0b3BzID0gY2xvbmUodGhpcy5ncmFkaWVudCgpKTtcblx0XHRpZiAoc3RvcHMubGVuZ3RoID49IDQpIHJldHVybjtcblx0XHR0aGlzLnJlbWVtYmVyKCk7XG5cdFx0dGhpcy5kcmFmdC5ncmFkaWVudCA9IFsuLi5zdG9wcywgc3RvcHMuYXQoLTEpXTtcblx0XHR0aGlzLmNoYW5nZWQoKTtcblx0fVxuXG5cdHJlbW92ZVN0b3AoYnV0dG9uKSB7XG5cdFx0Y29uc3Qgc3RvcHMgPSBjbG9uZSh0aGlzLmdyYWRpZW50KCkpO1xuXHRcdGlmIChzdG9wcy5sZW5ndGggPD0gMSkgcmV0dXJuO1xuXHRcdHRoaXMucmVtZW1iZXIoKTtcblx0XHRzdG9wcy5zcGxpY2UoTnVtYmVyKGJ1dHRvbi5kYXRhc2V0LnN0b3ApLCAxKTtcblx0XHR0aGlzLmRyYWZ0LmdyYWRpZW50ID0gc3RvcHM7XG5cdFx0dGhpcy5jaGFuZ2VkKCk7XG5cdH1cblxuXHRyZW1lbWJlcigpIHtcblx0XHR0aGlzLmhpc3RvcnkucHVzaChjbG9uZSh0aGlzLmRyYWZ0KSk7XG5cdH1cblxuXHR1bmRvKCkge1xuXHRcdGlmICghdGhpcy5oaXN0b3J5Lmxlbmd0aCkgcmV0dXJuO1xuXHRcdHRoaXMuZHJhZnQgPSB0aGlzLmhpc3RvcnkucG9wKCk7XG5cdFx0dGhpcy5jaGFuZ2VkKCk7XG5cdH1cblxuXHRyZXNldCgpIHtcblx0XHR0aGlzLnJlbWVtYmVyKCk7XG5cdFx0dGhpcy5kcmFmdCA9IGNsb25lKHRoaXMuc2F2ZWQpO1xuXHRcdHRoaXMuY2hhbmdlZCgpO1xuXHRcdHRoaXMuc2F5KHQoXCJiYWNrVG9UaGVTYXZlZFwiKSk7XG5cdH1cblxuXHRjaGFuZ2VkKCkge1xuXHRcdHdyaXRlKHNlc3Npb25TdG9yYWdlLCBcImRyYWZ0XCIsIHRoaXMuZGlydHkgPyB0aGlzLmRyYWZ0IDogdW5kZWZpbmVkKTtcblx0XHR0aGlzLmFwcGx5UHJldmlldygpO1xuXHRcdHRoaXMucmVmcmVzaCgpO1xuXHR9XG5cblx0Z2V0IGRpcnR5KCkge1xuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLmRyYWZ0KSAhPT0gSlNPTi5zdHJpbmdpZnkodGhpcy5zYXZlZCk7XG5cdH1cblxuXHQvKiogV3JpdGUgdGhlIGRyYWZ0IG9udG8gdGhlIHBhZ2UgYXMgaW5saW5lIGN1c3RvbSBwcm9wZXJ0aWVzLiAqL1xuXHRhcHBseVByZXZpZXcoKSB7XG5cdFx0Y29uc3Qgc3R5bGUgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGU7XG5cdFx0Zm9yIChjb25zdCB0b2tlbiBvZiB0aGlzLnRva2Vucykge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSB0aGlzLmRyYWZ0W3RoaXMuY29udGV4dF0/Llt0b2tlbi5rZXldID8/IHRoaXMuZHJhZnRbdG9rZW4ua2V5XTtcblx0XHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSBzdHlsZS5yZW1vdmVQcm9wZXJ0eShgLS1jb2xvci0ke3Rva2VuLmtleX1gKTtcblx0XHRcdGVsc2Ugc3R5bGUuc2V0UHJvcGVydHkoYC0tY29sb3ItJHt0b2tlbi5rZXl9YCwgdG9Dc3ModmFsdWUpKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuY29udGV4dCA9PT0gXCJzaXRlXCIpIHtcblx0XHRcdGNvbnN0IHN0b3BzID0gdGhpcy5ncmFkaWVudCgpO1xuXHRcdFx0Zm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IDQ7IGluZGV4KyspIHtcblx0XHRcdFx0aWYgKGluZGV4IDwgc3RvcHMubGVuZ3RoKSBzdHlsZS5zZXRQcm9wZXJ0eShgLS1jb2xvci1ncmFkaWVudC0ke2luZGV4ICsgMX1gLCB0b0NzcyhzdG9wc1tpbmRleF0pKTtcblx0XHRcdFx0ZWxzZSBzdHlsZS5yZW1vdmVQcm9wZXJ0eShgLS1jb2xvci1ncmFkaWVudC0ke2luZGV4ICsgMX1gKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IG5hbWVzID0gc3RvcHMubWFwKChfLCBpbmRleCkgPT4gYHZhcigtLWNvbG9yLWdyYWRpZW50LSR7aW5kZXggKyAxfSlgKTtcblx0XHRcdGlmIChuYW1lcy5sZW5ndGggPT09IDEpIG5hbWVzLnB1c2gobmFtZXNbMF0pO1xuXHRcdFx0c3R5bGUuc2V0UHJvcGVydHkoXCItLWdyYWRpZW50LXN0b3BzXCIsIG5hbWVzLmpvaW4oXCIsIFwiKSk7XG5cdFx0fVxuXHR9XG5cblx0LyoqIFVwZGF0ZSBldmVyeSBpbnB1dCwgY29udHJhc3QgcmVzdWx0IGFuZCBidXR0b24gdG8gbWF0Y2ggdGhlIGRyYWZ0IGFuZCB0aGUgcHJldmlld2VkIG1vZGUuICovXG5cdHJlZnJlc2goKSB7XG5cdFx0Y29uc3Qgcm9vdCA9IHRoaXMuc2hhZG93Um9vdDtcblx0XHRjb25zdCBtb2RlID0gdGhpcy5tb2RlO1xuXHRcdGZvciAoY29uc3QgcmFkaW8gb2Ygcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFtuYW1lPVwibW9kZVwiXScpKSByYWRpby5jaGVja2VkID0gcmFkaW8udmFsdWUgPT09IG1vZGU7XG5cdFx0Zm9yIChjb25zdCBpbnB1dCBvZiByb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbnB1dFtkYXRhLWtleV1cIikpIHtcblx0XHRcdGNvbnN0IGtleSA9IGlucHV0LmRhdGFzZXQua2V5O1xuXHRcdFx0Y29uc3QgcmdiYSA9IHRoaXMucmVzb2x2ZShgdmFyKC0tY29sb3ItJHtrZXl9KWAsIG1vZGUpO1xuXHRcdFx0aWYgKGlucHV0LnR5cGUgPT09IFwiY29sb3JcIikgaW5wdXQudmFsdWUgPSBoZXgocmdiYSk7XG5cdFx0XHRlbHNlIGlmIChpbnB1dCAhPT0gcm9vdC5hY3RpdmVFbGVtZW50KSB7XG5cdFx0XHRcdGNvbnN0IHZhbHVlID0gdGhpcy5zY29wZShrZXkpW2tleV07XG5cdFx0XHRcdGlucHV0LnZhbHVlID0gdmFsdWUgPT09IHVuZGVmaW5lZCA/IChyZ2JhWzNdID09PSAyNTUgPyBoZXgocmdiYSkgOiBgcmdiKCR7cmdiYS5zbGljZSgwLCAzKS5qb2luKFwiIFwiKX0gLyAkeyhyZ2JhWzNdIC8gMjU1KS50b0ZpeGVkKDIpfSlgKSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHZhbHVlIDogdmFsdWVbbW9kZV07XG5cdFx0XHRcdGlucHV0LnNldEN1c3RvbVZhbGlkaXR5KFwiXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRmb3IgKGNvbnN0IG91dHB1dCBvZiByb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCJvdXRwdXRbZGF0YS1jb250cmFzdF1cIikpIHtcblx0XHRcdGNvbnN0IHBhaXIgPSBDT05UUkFTVC5maW5kKChbdGV4dF0pID0+IHRleHQgPT09IG91dHB1dC5kYXRhc2V0LmNvbnRyYXN0KTtcblx0XHRcdGlmICghcGFpciB8fCAhdGhpcy5yb2xlc1twYWlyWzFdXSkge1xuXHRcdFx0XHRvdXRwdXQudGV4dENvbnRlbnQgPSBcIlwiO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IFt0ZXh0LCBiYWNrZ3JvdW5kLCBtaW5pbXVtXSA9IHBhaXI7XG5cdFx0XHRjb25zdCBiYWNrID0gb3Zlcih0aGlzLnJlc29sdmUoYHZhcigtLWNvbG9yLSR7YmFja2dyb3VuZH0pYCwgbW9kZSksIFsyNTUsIDI1NSwgMjU1XSk7XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHJhdGlvKG92ZXIodGhpcy5yZXNvbHZlKGB2YXIoLS1jb2xvci0ke3RleHR9KWAsIG1vZGUpLCBiYWNrKSwgYmFjayk7XG5cdFx0XHRjb25zdCBwYXNzID0gdmFsdWUgPj0gbWluaW11bTtcblx0XHRcdG91dHB1dC5kYXRhc2V0LnBhc3MgPSBTdHJpbmcocGFzcyk7XG5cdFx0XHRvdXRwdXQudGV4dENvbnRlbnQgPSB0KFwiY29udHJhc3RcIiwgeyByYXRpbzogdmFsdWUudG9GaXhlZCgxKSwgZ3JvdW5kOiBiYWNrZ3JvdW5kID09PSBcInBhZ2VcIiA/IHQoXCJ0aGVQYWdlXCIpIDogdChcInRoZUJyYW5kQ29sb3JcIiksIHZlcmRpY3Q6IHBhc3MgPyB0KFwicGFzc2VzXCIpIDogdChcImJlbG93XCIsIHsgbWluaW11bSB9KSB9KTtcblx0XHR9XG5cdFx0Y29uc3Qgc3RvcHMgPSByb290LnF1ZXJ5U2VsZWN0b3IoXCIuc3RvcHNcIik7XG5cdFx0aWYgKHN0b3BzKSB7XG5cdFx0XHRjb25zdCBsaXN0ID0gdGhpcy5ncmFkaWVudCgpO1xuXHRcdFx0c3RvcHMuaW5uZXJIVE1MID0gbGlzdFxuXHRcdFx0XHQubWFwKFxuXHRcdFx0XHRcdChzdG9wLCBpbmRleCkgPT4gYDxkaXYgY2xhc3M9XCJzdG9wXCI+XG5cdFx0XHRcdFx0XHQ8bGFiZWwgZm9yPVwic3RvcC0ke2luZGV4fVwiPiR7dChcImNvbG9yXCIsIHsgbjogaW5kZXggKyAxIH0pfTwvbGFiZWw+XG5cdFx0XHRcdFx0XHQ8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cInN0b3AtJHtpbmRleH1cIiBkYXRhLXN0b3A9XCIke2luZGV4fVwiIHZhbHVlPVwiJHt0b0NzcyhzdG9wKX1cIiBzcGVsbGNoZWNrPVwiZmFsc2VcIiBhdXRvY29tcGxldGU9XCJvZmZcIj5cblx0XHRcdFx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwicmVtb3ZlLXN0b3BcIiBkYXRhLXN0b3A9XCIke2luZGV4fVwiIGFyaWEtbGFiZWw9XCIke3QoXCJyZW1vdmVDb2xvclwiLCB7IG46IGluZGV4ICsgMSB9KX1cIiAke2xpc3QubGVuZ3RoIDw9IDEgPyBcImRpc2FibGVkXCIgOiBcIlwifT4mbWludXM7PC9idXR0b24+XG5cdFx0XHRcdFx0PC9kaXY+YCxcblx0XHRcdFx0KVxuXHRcdFx0XHQuam9pbihcIlwiKTtcblx0XHRcdHJvb3QucXVlcnlTZWxlY3RvcignW2RhdGEtYWN0aW9uPVwiYWRkLXN0b3BcIl0nKS5kaXNhYmxlZCA9IGxpc3QubGVuZ3RoID49IDQ7XG5cdFx0fVxuXHRcdHJvb3QucXVlcnlTZWxlY3RvcignW2RhdGEtYWN0aW9uPVwidW5kb1wiXScpLmRpc2FibGVkID0gIXRoaXMuaGlzdG9yeS5sZW5ndGg7XG5cdFx0cm9vdC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hY3Rpb249XCJyZXNldFwiXScpLmRpc2FibGVkID0gIXRoaXMuZGlydHk7XG5cdFx0cm9vdC5xdWVyeVNlbGVjdG9yKFwiLmZsYWdcIikuaGlkZGVuID0gIXRoaXMuZGlydHk7XG5cdH1cblxuXHRhc3luYyBzYXZlKCkge1xuXHRcdHRoaXMuc2F5KHQoXCJzYXZpbmdcIikpO1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKEVORFBPSU5ULCB7IG1ldGhvZDogXCJQT1NUXCIsIGhlYWRlcnM6IHsgXCJjb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSwgYm9keTogSlNPTi5zdHJpbmdpZnkodGhpcy5kcmFmdCkgfSk7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG5cdFx0XHRpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yKTtcblx0XHRcdHRoaXMuc2F2ZWQgPSBjbG9uZSh0aGlzLmRyYWZ0KTtcblx0XHRcdHRoaXMuaGlzdG9yeSA9IFtdO1xuXHRcdFx0d3JpdGUoc2Vzc2lvblN0b3JhZ2UsIFwiZHJhZnRcIiwgdW5kZWZpbmVkKTtcblx0XHRcdHRoaXMucmVmcmVzaCgpO1xuXHRcdFx0dGhpcy5zYXkodChcInNhdmVkVG9UaGVcIiwgeyBmaWxlOiByZXN1bHQuZmlsZSB9KSk7XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdHRoaXMuc2F5KHQoXCJub3RTYXZlZFwiLCB7IG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSkpO1xuXHRcdH1cblx0fVxuXG5cdGRvd25sb2FkKCkge1xuXHRcdGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbYCR7SlNPTi5zdHJpbmdpZnkodGhpcy5kcmFmdCwgbnVsbCwgXCJcXHRcIil9XFxuYF0sIHsgdHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSk7XG5cdFx0Y29uc3QgbGluayA9IE9iamVjdC5hc3NpZ24oZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIiksIHsgaHJlZjogVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKSwgZG93bmxvYWQ6IFwidGhlbWUuanNvblwiIH0pO1xuXHRcdGxpbmsuY2xpY2soKTtcblx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKGxpbmsuaHJlZik7XG5cdFx0dGhpcy5zYXkodChcImRvd25sb2FkZWRQdXRJdEluXCIsIHsgZm9sZGVyOiB0aGlzLmZpbGUucmVwbGFjZSgvdGhlbWVcXC5qc29uJC8sIFwiXCIpIH0pKTtcblx0fVxuXG5cdHNheShtZXNzYWdlKSB7XG5cdFx0dGhpcy5zdGF0dXMudGV4dENvbnRlbnQgPSBtZXNzYWdlO1xuXHR9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KFwidGhlbWUtcGFuZWxcIikpIGN1c3RvbUVsZW1lbnRzLmRlZmluZShcInRoZW1lLXBhbmVsXCIsIFRoZW1lUGFuZWwpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUtBLElBQU0sV0FBVztBQUdqQixJQUFNLE9BQU8sS0FBSyxNQUFNLFNBQVMsZUFBZSxXQUFXLEdBQUcsZUFBZSxJQUFJO0FBRWpGLElBQU0sSUFBSSxD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SSxJQUFJO0FBQ2QsU0FBTyxDQUFDLEtBQUssTUFBTSxJQUFJQSxLQUFJLE1BQU0sSUFBSUEsR0FBRSxHQUFHLEtBQUssTUFBTSxJQUFJQSxLQUFJLE1BQU0sSUFBSUEsR0FBRSxHQUFHLEtBQUssTUFBTSxJQUFJQSxLQUFJLE1BQU0sSUFBSUEsR0FBRSxHQUFHLEdBQUc7QUFDbEg7QUFFQSxJQUFNLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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QkFBdUIsRUFBRSxXQUFXLENBQUMsS0FBSztBQUM3RCxTQUFLLGNBQWMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxLQUFLO0FBQUEsRUFDNUM7QUFBQSxFQUVBLE1BQU0sT0FBTztBQUNaLFNBQUssSUFBSSxFQUFFLFFBQVEsQ0FBQztBQUNwQixRQUFJO0FBQ0gsWUFBTSxXQUFXLE1BQU0sTUFBTSxVQUFVLEVBQUUsUUFBUSxRQUFRLFNBQVMsRUFBRSxnQkFBZ0IsbUJBQW1CLEdBQUcsTUFBTSxLQUFLLFVBQVUsS0FBSyxLQUFLLEVBQUUsQ0FBQztBQUM1SSxZQUFNLFNBQVMsTUFBTSxTQUFTLEtBQUs7QUFDbkMsVUFBSSxDQUFDLFNBQVMsR0FBSSxPQUFNLElBQUksTUFBTSxPQUFPLEtBQUs7QUFDOUMsV0FBSyxRQUFRLE1BQU0sS0FBSyxLQUFLO0FBQzdCLFdBQUssVUFBVSxDQUFDO0FBQ2hCLFlBQU0sZ0JBQWdCLFNBQVMsTUFBUztBQUN4QyxXQUFLLFFBQVE7QUFDYixXQUFLLElBQUksRUFBRSxjQUFjLEVBQUUsTUFBTSxPQUFPLEtBQUssQ0FBQyxDQUFDO0FBQUEsSUFDaEQsU0FBUyxPQUFPO0FBQ2YsV0FBSyxJQUFJLEVBQUUsWUFBWSxFQUFFLFNBQVMsTUFBTSxRQUFRLENBQUMsQ0FBQztBQUFBLElBQ25EO0FBQUEsRUFDRDtBQUFBLEVBRUEsV0FBVztBQUNWLFVBQU0sT0FBTyxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssVUFBVSxLQUFLLE9BQU8sTUFBTSxHQUFJLENBQUM7QUFBQSxDQUFJLEdBQUcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ25HLFVBQU0sT0FBTyxPQUFPLE9BQU8sU0FBUyxjQUFjLEdBQUcsR0FBRyxFQUFFLE1BQU0sSUFBSSxnQkFBZ0IsSUFBSSxHQUFHLFVBQVUsYUFBYSxDQUFDO0FBQ25ILFNBQUssTUFBTTtBQUNYLFFBQUksZ0JBQWdCLEtBQUssSUFBSTtBQUM3QixTQUFLLElBQUksRUFBRSxxQkFBcUIsRUFBRSxRQUFRLEtBQUssS0FBSyxRQUFRLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQUEsRUFDbkY7QUFBQSxFQUVBLElBQUksU0FBUztBQUNaLFNBQUssT0FBTyxjQUFjO0FBQUEsRUFDM0I7QUFDRDtBQUVBLElBQUksQ0FBQyxlQUFlLElBQUksYUFBYSxFQUFHLGdCQUFlLE9BQU8sZUFBZSxVQUFVOyIsCiAgIm5hbWVzIjogWyJ0IiwgInRleHQiXQp9Cg==
