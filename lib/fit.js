/*
 * Slide fit check — reports each deck slide whose content leaves the slide
 * box. CHECK_FIT=1 warns, CHECK_FIT=strict fails the build; unset skips it
 * (Puppeteer is imported lazily, so no Chromium launch). See AGENTS.md.
 */
import { resolve } from "node:path";

import { servePublic } from "./pdf.js";

/** Projector size the decks are authored against. */
export const VIEWPORT = { width: 1280, height: 720 };

/**
 * Whether a build result is a deck page: `<decksDir>/*.md`, never the index.
 * @param {string} decksDir
 * @returns {(result: { inputPath: string }) => boolean}
 */
const deckMatcher = (decksDir) => {
	const escaped = decksDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = new RegExp(`^\\./${escaped}/[^/]+\\.md$`);
	return (result) => pattern.test(result.inputPath);
};

/**
 * Runs inside the page. Bounds are relative to the top of each slide's 16:9
 * box, so anything outside 0..box height spills.
 */
/* global document */
const measureSlides = () =>
	[...document.querySelectorAll(".slide")].map((slide) => {
		const box = slide.querySelector(".slide-body").getBoundingClientRect();
		let min = Infinity;
		let max = -Infinity;
		for (const element of slide.querySelectorAll(".slide-body *")) {
			const rect = element.getBoundingClientRect();
			if (!rect.height) continue;
			min = Math.min(min, rect.top - box.top);
			max = Math.max(max, rect.bottom - box.top);
		}
		return {
			id: slide.id,
			heading: slide.querySelector("h1, h2")?.textContent.trim() ?? "",
			above: Math.max(0, Math.round(-min)),
			below: Math.max(0, Math.round(max - box.height)),
		};
	});

/**
 * Register the `eleventy.after` handler that measures every deck.
 * @param {import('@11ty/eleventy').TemplateConfig} config
 * @param {{ outputDir?: string, decksDir?: string }} [options]
 */
export default function registerSlideFitCheck(config, { outputDir = "public", decksDir = "content/slides" } = {}) {
	const isDeck = deckMatcher(decksDir);
	config.on("eleventy.after", async ({ runMode, results }) => {
		const mode = process.env.CHECK_FIT;
		if (runMode !== "build" || !mode) return;
		const decks = (results ?? []).filter(isDeck);
		if (!decks.length) return;

		const root = resolve(outputDir);
		const pathPrefix = config.pathPrefix ?? "/";
		const { default: puppeteer } = await import("puppeteer");

		const server = servePublic(root, pathPrefix);
		await new Promise((done) => server.listen(0, "127.0.0.1", done));
		const { port } = server.address();
		const browser = await puppeteer.launch({
			args: process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
		});

		const failures = [];
		let total = 0;
		try {
			const page = await browser.newPage();
			await page.setViewport(VIEWPORT);
			// Nothing mid-transition when the measurement runs.
			await page.emulateMediaFeatures([
				{ name: "prefers-reduced-motion", value: "reduce" },
				{ name: "prefers-color-scheme", value: "light" },
			]);
			for (const deck of decks) {
				await page.goto(`http://127.0.0.1:${port}${pathPrefix.replace(/\/$/, "")}${deck.url}`, { waitUntil: "load" });
				await page.evaluateHandle("document.fonts.ready");
				const slides = await page.evaluate(measureSlides);
				total += slides.length;
				for (const slide of slides) {
					if (!slide.above && !slide.below) continue;
					const where = [slide.above && `${slide.above}px over the top`, slide.below && `${slide.below}px over the bottom`].filter(Boolean).join(", ");
					failures.push(`${deck.inputPath.replace(/^\.\//, "")} #${slide.id} “${slide.heading}”: ${where}`);
				}
			}
			await page.close();
		} finally {
			await browser.close();
			server.close();
		}

		const size = `${VIEWPORT.width}×${VIEWPORT.height}`;
		for (const failure of failures) process.stderr.write(`[slide-fit] ${failure}\n`);
		const summary = `[slide-fit] ${failures.length} of ${total} slides overflow at ${size}`;
		if (failures.length && mode === "strict") throw new Error(`${summary} — set CHECK_FIT=1 to warn instead`);
		process.stdout.write(`${summary}${failures.length ? " (CHECK_FIT=strict fails the build)" : ""}\n`);
	});
}
