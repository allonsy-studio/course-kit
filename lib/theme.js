/** Brand palette and accent presets, rendered into the stylesheets' token markers. See the README. */

/** Brand neutrals. */
export const BRAND = {
	ink: "#33394E",
	slate: "#414C75",
	paper: "#FBF9F3",
	cream: "#EFEBDF",
	latte: "#C2B1A6",
};

/** Accent presets: `ui` fill, `text` tone for type, optional `on` color for text on a fill. */
export const PRESETS = {
	magenta: { ui: "#C92C6B", text: "light-dark(hsl(336deg 68% 40%), hsl(336deg 72% 72%))", on: "var(--static-paper)" },
	orange: { ui: "#FF9A56", text: "light-dark(hsl(22deg 82% 37%), hsl(28deg 100% 72%))" },
	cyan: { ui: "#7BD1E6", text: "light-dark(hsl(193deg 58% 31%), hsl(192deg 68% 72%))" },
	yellow: { ui: "light-dark(#FFD36C, #FFC233)", text: "light-dark(hsl(38deg 88% 32%), hsl(45deg 100% 64%))" },
	purple: { ui: "light-dark(#6B3FA0, #B9A3E3)", text: "light-dark(hsl(267deg 43% 40%), hsl(267deg 60% 78%))" },
};

/** Preset order in the generated rule blocks. */
const BLOCK_ORDER = ["magenta", "cyan", "orange", "yellow", "purple"];

/** Preset order in the palette declarations. */
const PALETTE_ORDER = ["magenta", "orange", "cyan", "yellow", "purple"];

/** Page surfaces; `white` is the base stylesheet's default and renders nothing. */
const SURFACES = {
	white: "",
	paper: `
:root {
	--ui-light: light-dark(var(--static-latte), hsl(228deg 14% 32%));
	--bg: light-dark(var(--static-paper), hsl(228deg 20% 12%));
	--bg-light: light-dark(var(--static-cream), hsl(228deg 18% 17%));
	--bg-accent: light-dark(color-mix(in oklab, var(--static-cream) 50%, transparent), hsl(228deg 18% 17% / 50%));
	--bg-subtle: light-dark(color-mix(in oklab, var(--static-cream) 22%, transparent), hsl(228deg 18% 20% / 30%));
	--bg-overlay: light-dark(var(--static-paper), hsl(228deg 15% 30%));
}

:where(th) {
	background-color: var(--bg-accent);
}
`,
};

const NAME = /^[a-z][a-z0-9-]*$/;

/**
 * Validate the theme option and merge custom presets over the built-in ones.
 * @param {{ surface?: "white" | "paper", presets?: Record<string, { ui: string, text: string, on?: string }> }} [theme]
 * @returns {{ surface: string, presets: Record<string, { ui: string, text: string, on?: string }> }}
 */
export function resolveTheme({ surface = "white", presets = {} } = {}) {
	if (!(surface in SURFACES)) throw new Error(`course-kit: theme.surface must be one of ${Object.keys(SURFACES).join(", ")}, not "${surface}"`);
	for (const [name, preset] of Object.entries(presets)) {
		if (!NAME.test(name)) throw new Error(`course-kit: theme preset name "${name}" must be lowercase letters, digits and hyphens`);
		if (!preset?.ui || !preset?.text) throw new Error(`course-kit: theme preset "${name}" needs both \`ui\` and \`text\``);
	}
	return { surface, presets: { ...PRESETS, ...presets } };
}

/**
 * @param {Record<string, object>} presets
 * @returns {string[]} preset names: the built-ins first, then any added
 */
const blockNames = (presets) => [...BLOCK_ORDER, ...Object.keys(presets).filter((name) => !BLOCK_ORDER.includes(name))].filter((name) => name in presets);

const paletteNames = (presets) => [...PALETTE_ORDER, ...Object.keys(presets).filter((name) => !PALETTE_ORDER.includes(name))].filter((name) => name in presets);

/** @type {Record<string, (theme: ReturnType<typeof resolveTheme>) => string>} */
const RENDERERS = {
	palette: ({ presets }) =>
		[
			...Object.entries(BRAND).map(([name, value]) => `--static-${name}: ${value};`),
			...paletteNames(presets).flatMap((name) => [
				`--static-${name}: ${presets[name].ui};`,
				...(presets[name].on ? [`--on-brand-${name}: ${presets[name].on};`] : []),
				`--text-${name}: ${presets[name].text};`,
			]),
		].join("\n"),

	"section-presets": ({ presets }) =>
		blockNames(presets)
			.map((name) => `[data-accent="${name}"] {\n\t--section-ui: var(--static-${name});\n\t--section-text: var(--text-${name});\n}`)
			.join("\n\n"),

	surface: ({ surface }) => SURFACES[surface],

	"deck-palette": ({ presets }) =>
		[
			`--accent-ui: ${presets.magenta.ui};`,
			`--accent-text: ${presets.magenta.text};`,
			"",
			`--bg: light-dark(${BRAND.paper}, #14131a);`,
			"--bg-raised: light-dark(#fff, #1e1d26);",
			`--ink: light-dark(${BRAND.ink}, #f2f0f6);`,
			`--ink-muted: light-dark(${BRAND.slate}, #a8a4b4);`,
			`--rule: light-dark(${BRAND.cream}, #33313e);`,
		].join("\n"),

	"accent-presets": ({ presets }) =>
		blockNames(presets)
			.map((name) => `${name === "magenta" ? ':root,\n' : ""}[data-accent="${name}"] {\n--accent-ui: ${presets[name].ui};\n--accent-text: ${presets[name].text};\n}`)
			.join("\n\n"),
};

const MARKER = /\/\*\s*tokens:([a-z-]+)\s*\*\//g;

/**
 * Replace every `/* tokens:NAME *\/` marker in a stylesheet.
 * @param {string} css
 * @param {ReturnType<typeof resolveTheme>} theme
 * @returns {string}
 */
export function applyTokens(css, theme) {
	return css.replace(MARKER, (_, name) => {
		if (!RENDERERS[name]) throw new Error(`course-kit: unknown theme token "${name}"`);
		return RENDERERS[name](theme);
	});
}
