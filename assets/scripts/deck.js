/*
 * Slide deck controller: which slide is showing, and the theme. Speaker
 * notes never reach a deck; they live on the instructor notes sheet.
 * Loaded only by _layouts/deck.webc, a standalone document with none of the
 * site chrome (masthead, base.css).
 *
 * Keys: → ↓ Space PageDown next, ← ↑ PageUp previous, Home/End ends,
 * Enter reveal, T theme, F fullscreen.
 */

const deck = document.querySelector(".deck");
const slides = [...document.querySelectorAll(".slide")];
const counter = document.querySelector("[data-count]");
const fullscreenToggle = document.querySelector("[data-toggle-fullscreen]");
const root = document.documentElement;

/* The deck's own light/dark/system choice, kept for the next time it opens.
   The site has no switcher and always follows the system. */
const THEME_KEY = "theme";
const THEMES = ["system", "light", "dark"];

const readTheme = () => {
	try {
		const stored = localStorage.getItem(THEME_KEY);
		return THEMES.includes(stored) ? stored : "system";
	} catch {
		return "system";
	}
};

const applyTheme = (theme) => {
	root.style.colorScheme = theme === "system" ? "light dark" : theme;
	root.dataset.theme = theme;
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch {
		/* Private browsing: the deck still themes, it just won't be remembered. */
	}
};

const cycleTheme = () => applyTheme(THEMES[(THEMES.indexOf(readTheme()) + 1) % THEMES.length]);

/* lock() needs fullscreen and is Android-only; iOS has neither. Every step
   is feature-detected and fails quietly. */
const toggleFullscreen = async () => {
	if (document.fullscreenElement) {
		await document.exitFullscreen();
		try {
			screen.orientation?.unlock?.();
		} catch {
			/* Nothing to unlock, or the browser doesn't support it. */
		}
		return;
	}
	await document.body.requestFullscreen().catch(() => {});
	try {
		await screen.orientation?.lock?.("landscape");
	} catch {
		/* Not supported (iOS), or the device is locked to portrait. */
	}
};

let index = 0;

// While a programmatic scroll is in flight the observer would report the slides
// we are passing over, clobbering the target. Ignore it until the scroll settles.
let settleAt = 0;

const setIndex = (i, scroll = true) => {
	index = Math.max(0, Math.min(slides.length - 1, i));
	if (scroll) {
		settleAt = performance.now() + 800;
		slides[index].scrollIntoView({ block: "start" });
	}
	counter.textContent = `${index + 1} / ${slides.length}`;
	root.style.setProperty("--progress", slides.length > 1 ? index / (slides.length - 1) : 1);
	if (location.hash !== `#s${index + 1}`) history.replaceState(null, "", `#s${index + 1}`);
};

/* Uncovers this slide's `::: answer` blocks one at a time before advancing;
   Enter reveals without advancing. Going back leaves them revealed. */
const reveal = () => {
	const answer = slides[index].querySelector(".answer:not(.is-revealed)");
	if (!answer) return false;
	answer.classList.add("is-revealed");
	return true;
};

const next = () => {
	if (!reveal()) setIndex(index + 1);
};

// Keep the counter honest when the user scrolls or swipes instead of pressing a key.
const observer = new IntersectionObserver(
	(entries) => {
		if (performance.now() < settleAt) return;
		for (const entry of entries) {
			const fills = entry.intersectionRect.height > (entry.rootBounds?.height ?? Infinity) * 0.55;
			if (entry.isIntersecting && (entry.intersectionRatio > 0.55 || fills)) {
				setIndex(slides.indexOf(entry.target), false);
			}
		}
	},
	{ root: deck, threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
);
slides.forEach((slide) => observer.observe(slide));

const isTyping = (element) => element && /^(input|textarea|select)$/i.test(element.tagName);

document.addEventListener("keydown", (event) => {
	if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
	const go = (i) => {
		event.preventDefault();
		setIndex(i);
	};
	switch (event.key) {
		case "ArrowRight":
		case "ArrowDown":
		case "PageDown":
		case " ":
			event.preventDefault();
			return next();
		case "Enter":
			event.preventDefault();
			return reveal();
		case "ArrowLeft":
		case "ArrowUp":
		case "PageUp":
			return go(index - 1);
		case "Home":
			return go(0);
		case "End":
			return go(slides.length - 1);
		case "t":
		case "T":
			return cycleTheme();
		case "f":
		case "F":
			event.preventDefault();
			return toggleFullscreen();
	}
});

document.addEventListener("fullscreenchange", () => {
	if (!document.fullscreenElement) screen.orientation?.unlock?.();
	fullscreenToggle?.setAttribute("aria-pressed", String(Boolean(document.fullscreenElement)));
});

// Hidden until we know fullscreen exists here (it doesn't on iPhone).
if (fullscreenToggle && document.fullscreenEnabled) {
	fullscreenToggle.hidden = false;
	fullscreenToggle.addEventListener("click", toggleFullscreen);
}
document.querySelector("[data-toggle-theme]").addEventListener("click", cycleTheme);
document.querySelector("[data-prev]").addEventListener("click", () => setIndex(index - 1));
document.querySelector("[data-next]").addEventListener("click", next);

applyTheme(readTheme());

const fromHash = Number.parseInt(location.hash.replace("#s", ""), 10);
setIndex(Number.isFinite(fromHash) ? fromHash - 1 : 0, Number.isFinite(fromHash));
