import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import postcss from "postcss";

import { packageRoot } from "../lib/paths.js";

const read = (...parts) => fs.readFileSync(path.join(packageRoot, ...parts), "utf8");

const script = read("assets", "scripts", "deck.js");
const css = postcss.parse(read("assets", "styles", "deck.css"));

/** Every at-rule and rule a node sits in, innermost first. */
const ancestors = (node) => (node.parent && node.parent.type !== "root" ? [node.parent, ...ancestors(node.parent)] : []);

/** A node's selector with each enclosing rule's selector in front, so `&.is-revealed` reads in full. */
const fullSelector = (rule) => [rule, ...ancestors(rule)].filter((node) => node.type === "rule").reverse().map((node) => node.selector).join(" ").replaceAll(" &", "");

/** A selector list's parts, split on the commas outside parentheses. */
const parts = (selector) => selector.split(/,\s*(?![^()]*\))/).map((part) => part.trim());

const inMedia = (node, query) => ancestors(node).some((parent) => parent.type === "atrule" && parent.name === "media" && parent.params.includes(query));

const inPrint = (node) => inMedia(node, "print") && ancestors(node).some((parent) => parent.type === "atrule" && parent.name === "layer" && parent.params === "print");

/** The declarations of every rule whose full selector passes `match`, as `{ prop: value }` per rule. */
const rules = (match) => {
	const found = [];
	css.walkRules((rule) => {
		if (ancestors(rule).some((parent) => parent.type === "atrule" && parent.name === "keyframes")) return;
		if (match(fullSelector(rule), rule)) found.push({ rule, selector: fullSelector(rule), decls: Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((decl) => [decl.prop, decl.value])) });
	});
	return found;
};

/** A keyframes block as `{ "from": { prop: value }, … }`. */
const keyframes = (name) => {
	const frames = {};
	css.walkAtRules("keyframes", (rule) => {
		if (rule.params !== name) return;
		for (const frame of rule.nodes) frames[frame.selector] = Object.fromEntries(frame.nodes.map((decl) => [decl.prop, decl.value]));
	});
	return frames;
};

test("the next-slide key uncovers a figure's steps in the same sequence as the slide's answers", () => {
	const hidden = /slides\[index\]\.querySelector\("([^"]+)"\)/.exec(script)?.[1];
	assert.deepEqual(hidden?.split(/,\s*/), [".answer:not(.is-revealed)", "svg .step:not(.is-revealed)"], "one selector list, so reveal() takes whichever comes first in the source of the current slide");
	assert.match(script, /classList\.add\("is-revealed"\)/);
});

test("the script only answers the keys: the fade, the pop and the draw are CSS", () => {
	assert.doesNotMatch(script, /pathLength|\.animate\(|requestAnimationFrame|getTotalLength/, "deck.js measures and animates nothing");
	assert.equal(script.match(/is-revealed/g).length, 3, "one class, named twice in the selector and added in one place");
});

test("a step is hidden until it is revealed, and only inside an svg", () => {
	const [hidden] = rules((selector, rule) => parts(selector).includes("svg .step") && !inPrint(rule) && !inMedia(rule, "prefers-reduced-motion"));
	assert.deepEqual(hidden?.decls, { visibility: "hidden", opacity: "0" });
	const revealed = hidden.rule.nodes.find((node) => node.type === "rule" && node.selector === "&.is-revealed");
	assert.deepEqual(Object.fromEntries(revealed.nodes.map((decl) => [decl.prop, decl.value])), { visibility: "visible", opacity: "1" });
	for (const { selector } of rules((selector) => /\.step\b/.test(selector))) {
		for (const part of parts(selector)) if (/\.step\b/.test(part)) assert.match(part, /\bsvg\b.*\.step\b/, `"${part}" would style a \`::: step\` block`);
	}
});

test("an answer and a step share one set of rules: hidden, revealed, faded, popped and drawn alike", () => {
	const hiding = rules((selector, rule) => !inPrint(rule) && rule.nodes.some((node) => node.prop === "visibility" && node.value === "hidden"));
	assert.deepEqual(hiding.map(({ selector }) => parts(selector)), [[".answer", "svg .step"]], "one rule hides both");
	const [fade] = rules((selector, rule) => inMedia(rule, "prefers-reduced-motion: no-preference") && rule.nodes.some((node) => node.prop === "transition") && parts(selector).includes("svg .step"));
	assert.deepEqual({ selector: parts(fade?.selector ?? ""), transition: fade?.decls.transition }, { selector: [".answer", "svg .step"], transition: "opacity 180ms ease-out" });
	for (const name of ["pop", "draw"]) {
		const animated = rules((selector) => new RegExp(`\\.is-revealed \\.${name}(\\[[^\\]]+\\])?$`).test(selector));
		assert.equal(animated.length, 1, `.${name} has one rule`);
		assert.match(animated[0].selector, /^svg :is\(\.answer, \.step\)\.is-revealed /, `.${name} runs in a revealed answer or step`);
	}
});

test("print shows every step", () => {
	const [printed] = rules((selector, rule) => inPrint(rule) && parts(selector).includes("svg .step"));
	assert.deepEqual(printed?.decls, { visibility: "visible", opacity: "1" });
	assert.ok(parts(printed.selector).includes(".answer"), "with the answers");
});

test("the fade, the pop and the draw run only when the reader has not asked for less motion", () => {
	const moving = [];
	css.walkDecls(/^(animation|transition)/, (decl) => {
		const selector = fullSelector(decl.parent);
		if (!/\.(step|pop|draw)\b/.test(selector)) return;
		moving.push(selector);
		assert.ok(inMedia(decl, "prefers-reduced-motion: no-preference"), `\`${decl.prop}\` on "${selector}" is outside (prefers-reduced-motion: no-preference)`);
	});
	for (const name of ["step", "pop", "draw"]) assert.ok(moving.some((selector) => new RegExp(`\\.${name}(\\[[^\\]]+\\])?$`).test(selector)), `.${name} has motion to guard`);
});

test("a drawn line starts empty, and its arrowhead waits for the stroke to arrive", () => {
	const [drawn] = rules((selector) => /\.is-revealed \.draw\b/.test(selector));
	assert.match(drawn.selector, /\.draw\[pathLength="1"\]$/, "the dash offsets below are fractions of a path length of 1, so only a stroke that says so in its markup is drawn on");
	const { from, to, ...between } = keyframes("draw-on");
	assert.deepEqual(from, { "stroke-dasharray": "1", "stroke-dashoffset": "1", marker: "none" });
	assert.deepEqual(to, { "stroke-dasharray": "1", "stroke-dashoffset": "0" }, "the last frame leaves the marker to the figure's own marker-end");
	const stops = Object.entries(between);
	assert.ok(stops.length > 0 && stops.every(([, frame]) => frame.marker === "none"), "the marker is held off between the first and the last frame");
	assert.ok(stops.some(([offset]) => Number.parseFloat(offset) >= 95), "and comes back only at the end");
	const dashed = [];
	css.walkDecls(/^stroke-dash/, (decl) => {
		if (!ancestors(decl).some((parent) => parent.type === "atrule" && parent.name === "keyframes")) dashed.push(fullSelector(decl.parent));
	});
	assert.deepEqual(dashed, [], "no dash outside the keyframes, so a still or printed line is whole");
});

/** Seconds in a CSS time (`180ms`, `0.4s`). */
const seconds = (time) => Number.parseFloat(time) / (time.endsWith("ms") ? 1000 : 1);

test("every transition and animation in a deck can be turned off, runs once and is over in a moment", () => {
	const moving = [];
	css.walkDecls(/^(animation|transition)(-|$)/, (decl) => {
		if (decl.value === "none") return;
		const selector = fullSelector(decl.parent);
		moving.push(selector);
		// 2.3.3: on only when the reader has not asked for less motion, or switched off in the same rule when they have.
		const override = decl.parent.nodes.find((node) => node.type === "atrule" && node.name === "media" && node.params.includes("prefers-reduced-motion: reduce"));
		const off = override?.nodes.some((node) => node.prop === decl.prop && node.value === "none");
		assert.ok(inMedia(decl, "prefers-reduced-motion: no-preference") || off, `\`${decl.prop}\` on "${selector}" runs for a reader who asked for less motion`);
		// 2.2.2: nothing loops or runs back and forth, and nothing lasts five seconds.
		assert.doesNotMatch(decl.value, /\b(infinite|alternate|alternate-reverse)\b/, `"${selector}" repeats`);
		assert.doesNotMatch(decl.prop, /iteration-count|direction/, `"${selector}" sets how often or which way it runs`);
		const times = decl.value.match(/\b[\d.]+m?s\b/g) ?? [];
		assert.ok(times.length > 0, `"${selector}" names no duration`);
		assert.ok(times.reduce((sum, time) => sum + seconds(time), 0) < 1, `"${selector}" runs for a second or more`);
	});
	assert.ok(moving.length >= 4, `found ${moving.length} of the deck's transitions and animations`);
	assert.doesNotMatch(read("assets", "styles", "deck.css"), /scroll-behavior:\s*smooth(?![\s\S]*prefers-reduced-motion: reduce[\s\S]*scroll-behavior:\s*auto)/, "the slide scroll is instant for a reader who asked for less motion");
});

test("no deck animation blinks: each keyframe set moves one way and changes no color", () => {
	const still = new Set(["scale", "stroke-dasharray", "stroke-dashoffset", "marker"]);
	let count = 0;
	css.walkAtRules("keyframes", (rule) => {
		count += 1;
		const frames = keyframes(rule.params);
		for (const [offset, frame] of Object.entries(frames)) for (const prop of Object.keys(frame)) assert.ok(still.has(prop), `@keyframes ${rule.params} animates \`${prop}\` at ${offset}; opacity, visibility and color can flash`);
		// A property set at more than two stops could go there and back; only a held value may.
		for (const prop of still) {
			const values = Object.values(frames).map((frame) => frame[prop]).filter(Boolean);
			assert.ok(values.length <= 2 || new Set(values).size === 1, `@keyframes ${rule.params} moves \`${prop}\` through ${values.join(", ")}`);
		}
	});
	assert.equal(count, 2, "pop-in and draw-on");
});

test("docs/slides.md documents the classes beside SVG reveals", () => {
	const docs = read("docs", "slides.md");
	const section = docs.slice(docs.indexOf("**SVG reveals.**"), docs.indexOf("**Reading size.**"));
	for (const name of ["step", "pop", "draw"]) assert.match(section, new RegExp(`\\| \`${name}\` \\|`), `no row for \`${name}\``);
	for (const text of ['<g class="step">', 'class="stroke-accent draw"', '<g class="pop">', "prefers-reduced-motion: no-preference", '<g class="answer">', "2.3.3", "2.2.2", "2.3.2", "The finished figure says everything"]) assert.ok(section.includes(text), `the section is missing ${text}`);
});
