// Token overrides for the preview, loaded by every page and frame. They live in localStorage under one key,
// so a change reaches the other open tabs and frames through the `storage` event.
(() => {
	const KEY = "kit-preview-tokens";
	const PREFIX = "--color-";
	const sheet = new CSSStyleSheet();
	sheet.insertRule(":root {}");
	const rule = sheet.cssRules[0];
	document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
	let state = {};

	const load = () => {
		try {
			const stored = JSON.parse(localStorage.getItem(KEY));
			return stored && typeof stored === "object" ? stored : {};
		} catch {
			return state;
		}
	};
	const save = () => {
		try {
			if (Object.keys(state).length) localStorage.setItem(KEY, JSON.stringify(state));
			else localStorage.removeItem(KEY);
		} catch {
			// Storage is blocked: overrides last for this page only.
		}
	};
	const apply = () => {
		rule.style.cssText = "";
		for (const [name, value] of Object.entries(state)) rule.style.setProperty(name, value);
		window.dispatchEvent(new CustomEvent("previewtokenschange"));
	};

	window.previewTokens = {
		get: () => ({ ...state }),
		set(name, value) {
			if (!name.startsWith(PREFIX)) return;
			if (value.trim()) state[name] = value.trim();
			else delete state[name];
			save();
			apply();
		},
		reset() {
			state = {};
			save();
			apply();
		},
	};
	window.addEventListener("storage", (event) => {
		if (event.key !== KEY && event.key !== null) return;
		state = load();
		apply();
	});
	state = load();
	apply();
})();
