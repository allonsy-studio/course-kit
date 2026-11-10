/**
 * The course glossary: Review and Flashcards over one tagged, filterable list.
 *
 * Enhances the plain list `<glossary-panel>` renders on the server. It
 * reads the terms from the page's JSON, builds the controls, and removes the
 * static list once it has rendered. The page never reads the clock. The query
 * string (`mode`, `group`, `test`, `reading`, `meeting`, `q`) sets the starting
 * state and is kept in step as the reader changes it.
 */

/**
 * @typedef {object} Tag
 * @property {string} key
 * @property {string} label
 * @property {number} order
 * @property {string} [when] the date for display
 * @property {string} [deck] deck title (meeting)
 * @property {number} [n] terms carrying the tag under the other row's filter
 *
 * @typedef {object} Place
 * @property {number} week
 * @property {number} slide
 * @property {string} weekday
 * @property {string} href
 *
 * @typedef {object} Term
 * @property {string} id
 * @property {string} term HTML
 * @property {string} plain
 * @property {string} key letters and digits only, lowercased: the sort and search key
 * @property {number} azOrder position in A to Z order, from the loader
 * @property {{ key: string, label: string }} azGroup "0 to 9", a letter or "Symbols"
 * @property {string} group
 * @property {string} definition HTML
 * @property {string} example HTML
 * @property {string} meta HTML
 * @property {string} sig HTML
 * @property {{ label: string, href: string }|null} ref
 * @property {Record<string, Tag[]>} tags
 * @property {Place[]} taught
 */

const KINDS = ["test", "chapter", "meeting", "topic"];
/** The two kinds with a chip row. */
const FILTERS = ["test", "chapter"];
/** Every kind a link can filter by; `meeting` has a removable pill instead of a row. */
const FILTERED = ["test", "chapter", "meeting"];
const PARAMS = ["mode", "group", "test", "reading", "meeting", "q"];

/** Site root (or the Pages path prefix), taken from where this script is served. */
const BASE = new URL("../", import.meta.url).pathname;

/** @param {unknown} text */
const esc = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** @param {string} text */
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** localStorage that never throws (private windows, blocked storage). */
const store = {
	/** @param {string} key */
	get(key) {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	/**
	 * @param {string} key
	 * @param {string} value
	 */
	set(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch {
			// Progress just won't persist.
		}
	},
};

/**
 * Build the glossary's controls inside its element, and remove the static list.
 * @param {HTMLElement} root the `<glossary-app>` element
 * @param {AbortSignal} signal ends the page-level listeners when the element leaves the page
 */
function mount(root, signal) {
	const app = /** @type {HTMLElement | null} */ (root.querySelector("[data-app]"));
	const source = root.querySelector('script[type="application/json"]');
	if (!app || !source) return;

	const data = JSON.parse(source.textContent);
	const label = data.readingLabel;
	const dims = [
		["az", "A to Z"],
		["test", "Test"],
		["chapter", label],
		["meeting", "Class meeting"],
	];

	const tagsOf = Object.fromEntries(KINDS.map((kind) => [kind, new Map(data.tags[kind].map((tag) => [tag.key, tag]))]));

	/** @type {Term[]} */
	const terms = data.terms.map((term) => ({
		...term,
		tags: Object.fromEntries(KINDS.map((kind) => [kind, term.tags[kind].map((key) => tagsOf[kind].get(key))])),
	}));

	// ---- The starting state, from the query string (untrusted: matched against known keys only) ----

	const params = new URLSearchParams(location.search);
	const listOf = (name) => params.getAll(name).flatMap((value) => value.split(",")).map((value) => value.trim().toLowerCase()).filter(Boolean);
	const lastNumber = (text) => text.match(/(\d+)\s*$/)?.[1];

	/**
	 * The tag keys of `kind` that the values name: a key, its slug or label slug, `n` for `test-n`,
	 * or a bare number where a label ends in one.
	 * @param {string} kind
	 * @param {string[]} values
	 */
	const resolve = (kind, values) =>
		new Set(
			data.tags[kind]
				.filter((tag) =>
					values.some(
						(value) =>
							tag.key.toLowerCase() === value ||
							slug(tag.key) === slug(value) ||
							slug(tag.label) === slug(value) ||
							(kind === "test" && tag.key === `test-${value}`) ||
							(/^\d+$/.test(value) && lastNumber(tag.label) === value),
					),
				)
				.map((tag) => tag.key),
		);

	const startBy = (() => {
		const value = params.get("group")?.trim().toLowerCase();
		if (value === "reading" || value === label.toLowerCase()) return "chapter";
		return dims.some(([dim]) => dim === value) ? value : "az";
	})();
	const startMode = ["study", "flashcards"].includes(params.get("mode")?.toLowerCase()) ? "study" : params.get("mode")?.toLowerCase() === "review" ? "review" : location.hash === "#study" ? "study" : "review";

	const knownKey = `${data.code.toLowerCase()}-glossary-known`;
	const state = {
		by: startBy,
		mode: startMode,
		q: params.get("q")?.slice(0, 200) ?? "",
		filters: { test: resolve("test", listOf("test")), chapter: resolve("chapter", listOf("reading")), meeting: resolve("meeting", listOf("meeting")) },
		known: new Set(),
		deck: /** @type {Term[]} */ ([]),
		idx: 0,
		revealed: false,
		direction: "term",
		shuffle: false,
	};

	try {
		state.known = new Set(JSON.parse(store.get(knownKey) ?? "[]"));
	} catch {
		state.known = new Set();
	}
	const saveKnown = () => store.set(knownKey, JSON.stringify([...state.known]));

	app.innerHTML = `
		<div class="bar">
			<div class="bar-group">
				<span class="label" id="glossary-by">Group by</span>
				<div class="seg" role="radiogroup" aria-labelledby="glossary-by" data-by></div>
			</div>
			<div class="seg modes" role="tablist" aria-label="Mode" data-modes>
				<button type="button" role="tab" id="glossary-tab-review" aria-controls="glossary-panel-review" data-mode="review">Review</button>
				<button type="button" role="tab" id="glossary-tab-study" aria-controls="glossary-panel-study" data-mode="study">Flashcards</button>
			</div>
		</div>
		<div class="search">
			<label class="label" for="glossary-q">Search terms</label>
			<div class="field">
				<input type="search" id="glossary-q" name="q" autocomplete="off" spellcheck="false" data-q>
				<button type="button" class="clear-search" data-clear-q hidden>Clear<span class="sr-only"> search</span></button>
			</div>
		</div>
		<details class="filters" data-filters>
			<summary data-summary></summary>
			<div class="filter-rows">
				${FILTERS.map(
					(kind) => `<div class="filter-row">
					<span class="label" id="glossary-f-${kind}">${esc(kind === "test" ? "Test" : label)}</span>
					<div class="chips" role="group" aria-labelledby="glossary-f-${kind}" data-chips="${kind}"></div>
				</div>`,
				).join("")}
				<div class="filter-row" data-pills-row hidden>
					<span class="label" id="glossary-f-meeting">Class meeting</span>
					<div class="chips" role="group" aria-labelledby="glossary-f-meeting" data-pills></div>
				</div>
			</div>
		</details>
		<p class="status" aria-live="polite" data-status></p>
		<div role="tabpanel" id="glossary-panel-review" aria-labelledby="glossary-tab-review" data-review></div>
		<div role="tabpanel" id="glossary-panel-study" aria-labelledby="glossary-tab-study" class="study" data-study hidden></div>
		<p class="sr-only" role="status" data-announce></p>`;

	const q = (selector) => app.querySelector(selector);
	const els = {
		by: q("[data-by]"),
		modes: q("[data-modes]"),
		summary: q("[data-summary]"),
		details: q("[data-filters]"),
		q: q("[data-q]"),
		clearQ: q("[data-clear-q]"),
		pills: q("[data-pills]"),
		pillsRow: q("[data-pills-row]"),
		status: q("[data-status]"),
		review: q("[data-review]"),
		study: q("[data-study]"),
		announce: q("[data-announce]"),
	};

	/** @param {Term} term @param {string} kind */
	const hasAny = (term, kind) => !state.filters[kind].size || term.tags[kind].some((tag) => state.filters[kind].has(tag.key));

	// ---- Search: the term first (forgiving), then the definition (plain words) ----

	/** @param {string} text letters and digits only, lowercased, no accents */
	const alnum = (text) => text.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");

	/** @param {string} html */
	const textOf = (html) => {
		const box = document.createElement("template");
		box.innerHTML = html;
		return box.content.textContent.toLowerCase();
	};

	const definitions = new Map(terms.map((term) => [term.id, textOf(term.definition)]));
	const names = new Map(terms.map((term) => [term.id, textOf(term.term)]));

	/** Whether `a` is `b` with one letter added, dropped, changed or two swapped. */
	const near = (a, b) => {
		if (a === b) return true;
		const gap = a.length - b.length;
		if (Math.abs(gap) > 1) return false;
		let i = 0;
		while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
		if (gap === 0) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
		return gap > 0 ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
	};

	const range = (from, length) => new Set(Array.from({ length }, (_, i) => from + i));

	/**
	 * How well a term matches: 0 exact, 1 prefix, 2 inside the name, 3 letters in order
	 * ("qsa" finds querySelectorAll), 4 one typo (4+ characters), 5 the definition.
	 * `marks` are the positions in the term's key to highlight.
	 * @param {Term} term
	 * @param {string} raw the query as typed
	 * @returns {{ score: number, marks: Set<number>|null }|null}
	 */
	const match = (term, raw) => {
		const wanted = alnum(raw);
		const at = term.key.indexOf(wanted);
		if (!wanted) return names.get(term.id).includes(raw.toLowerCase()) ? { score: 2, marks: null } : null;
		if (term.key === wanted) return { score: 0, marks: range(0, wanted.length) };
		if (at === 0) return { score: 1, marks: range(0, wanted.length) };
		if (at > 0) return { score: 2, marks: range(at, wanted.length) };
		if (wanted.length >= 3) {
			const marks = new Set();
			let from = 0;
			for (const char of wanted) {
				from = term.key.indexOf(char, from);
				if (from < 0) break;
				marks.add(from);
				from += 1;
			}
			if (marks.size === wanted.length) return { score: 3, marks };
		}
		if (wanted.length >= 4 && [0, 1, -1].some((extra) => near(wanted, term.key.slice(0, wanted.length + extra)) || near(wanted, term.key))) return { score: 4, marks: null };
		const lower = raw.toLowerCase();
		const text = definitions.get(term.id);
		const found = lower.length >= 3 ? text.includes(lower) : new RegExp(`\\b${lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text);
		return found ? { score: 5, marks: null } : null;
	};

	/** Matches for the current query, or null with no query. @returns {Map<string, { score: number, marks: Set<number>|null }>|null} */
	const search = () => {
		const raw = state.q.trim();
		if (!raw) return null;
		const hits = new Map();
		for (const term of terms) {
			const hit = match(term, raw);
			if (hit) hits.set(term.id, hit);
		}
		return hits;
	};

	/** @type {Map<string, { score: number, marks: Set<number>|null }>|null} */
	let hits = null;
	/** @type {Term[]|null} */
	let view = null;

	const passes = (term, skip) => (!hits || hits.has(term.id)) && FILTERED.every((kind) => kind === skip || hasAny(term, kind));

	/** The terms in view: filters and search together. */
	const filtered = () => (view ??= terms.filter((term) => passes(term)));

	/**
	 * Terms per tag of `kind`, under every other selection and the search.
	 * @param {string} kind
	 * @returns {Tag[]}
	 */
	const countTags = (kind) => {
		const counts = new Map();
		for (const term of terms) {
			if (!passes(term, kind)) continue;
			for (const tag of term.tags[kind]) counts.set(tag.key, (counts.get(tag.key) ?? 0) + 1);
		}
		return data.tags[kind].map((tag) => ({ ...tag, n: counts.get(tag.key) ?? 0 }));
	};

	/**
	 * Wrap the matched characters of a term's HTML in <mark>; the HTML comes back unchanged if the
	 * characters do not line up with the term's key.
	 * @param {Term} term
	 * @param {Set<number>|null|undefined} marks
	 */
	const highlight = (term, marks) => {
		if (!marks) return term.term;
		const box = document.createElement("template");
		box.innerHTML = term.term;
		const walker = document.createTreeWalker(box.content, NodeFilter.SHOW_TEXT);
		const nodes = [];
		while (walker.nextNode()) nodes.push(walker.currentNode);
		let position = 0;
		const plans = [];
		for (const node of nodes) {
			const parts = [];
			for (const char of node.data) {
				const folded = alnum(char);
				if (folded.length > 1) return term.term;
				const on = folded.length === 1 && marks.has(position);
				if (folded.length === 1) position += 1;
				if (parts.at(-1)?.on === on) parts.at(-1).text += char;
				else parts.push({ text: char, on });
			}
			plans.push([node, parts]);
		}
		if (position !== term.key.length) return term.term;
		for (const [node, parts] of plans) {
			if (!parts.some((part) => part.on)) continue;
			const fragment = document.createDocumentFragment();
			for (const part of parts) {
				if (!part.on) fragment.append(part.text);
				else fragment.append(Object.assign(document.createElement("mark"), { textContent: part.text }));
			}
			node.replaceWith(fragment);
		}
		return box.innerHTML;
	};

	/**
	 * Group terms under the chosen order: A to Z (the loader's rank and groups) or a tag kind.
	 * A term with several tags of a kind appears under each. With a query, a group lists its
	 * best matches first.
	 * @param {Term[]} list
	 */
	const groups = (list) => {
		const sets = [];
		if (state.by === "az") {
			const byLetter = new Map();
			for (const term of [...list].sort((a, b) => a.azOrder - b.azOrder)) {
				if (!byLetter.has(term.azGroup.key)) byLetter.set(term.azGroup.key, { ...term.azGroup, items: [] });
				byLetter.get(term.azGroup.key).items.push(term);
			}
			sets.push(...byLetter.values());
		} else {
			const byTag = new Map();
			for (const term of list) {
				for (const tag of term.tags[state.by]) {
					if (!byTag.has(tag.key)) byTag.set(tag.key, { ...tag, items: [] });
					byTag.get(tag.key).items.push(term);
				}
			}
			sets.push(...[...byTag.values()].sort((a, b) => a.order - b.order));
		}
		if (hits) for (const set of sets) set.items.sort((a, b) => hits.get(a.id).score - hits.get(b.id).score);
		return sets;
	};

	/**
	 * Arrow keys move through a group of toggles, selecting as they go.
	 * @param {HTMLElement} container
	 * @param {string} selector the toggles
	 * @param {(button: HTMLElement) => void} select
	 * @param {boolean} [wrap] whether the ends loop round
	 */
	const roving = (container, selector, select, wrap = true) => {
		container.addEventListener("keydown", (event) => {
			const buttons = [...container.querySelectorAll(selector)];
			const at = buttons.indexOf(/** @type {HTMLElement} */ (document.activeElement));
			if (at < 0) return;
			const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
			const moved = at + (step ?? 0);
			const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : step ? (wrap ? (moved + buttons.length) % buttons.length : moved) : -1;
			if (next < 0 || next >= buttons.length) return;
			event.preventDefault();
			buttons[next].focus();
			select(buttons[next]);
		});
	};

	// ---- Controls, built once and updated in place so focus stays put ----

	els.by.innerHTML = dims.map(([dim, text]) => `<button type="button" role="radio" data-by="${dim}">${esc(text)}</button>`).join("");
	els.by.addEventListener("click", (event) => {
		const button = event.target.closest("[data-by]");
		if (button) selectBy(button);
	});
	roving(els.by, "[data-by]", (button) => selectBy(button));
	els.modes.addEventListener("click", (event) => {
		const button = event.target.closest("[data-mode]");
		if (button) setMode(button.dataset.mode);
	});
	roving(els.modes, "[data-mode]", (button) => setMode(button.dataset.mode), false);

	/** @param {HTMLElement} button */
	function selectBy(button) {
		state.by = button.dataset.by;
		render();
	}

	/** @type {Map<string, HTMLButtonElement>} */
	const chips = new Map();
	for (const kind of FILTERS) {
		const row = q(`[data-chips="${kind}"]`);
		for (const tag of data.tags[kind]) {
			const chip = document.createElement("button");
			chip.type = "button";
			chip.className = "chip";
			chip.dataset.kind = kind;
			chip.dataset.key = tag.key;
			chip.innerHTML = `<span class="t">${esc(tag.label)}</span><span class="n"></span>`;
			chips.set(`${kind}:${tag.key}`, chip);
			row.append(chip);
		}
		row.addEventListener("click", (event) => {
			const chip = event.target.closest("[data-key]");
			if (!chip) return;
			const set = state.filters[kind];
			if (!set.delete(chip.dataset.key)) set.add(chip.dataset.key);
			render();
		});
	}

	els.status.addEventListener("click", (event) => {
		if (!event.target.closest("[data-clear]")) return;
		for (const kind of FILTERED) state.filters[kind].clear();
		render();
		els.summary.focus();
	});

	els.pills.addEventListener("click", (event) => {
		const pill = event.target.closest("[data-key]");
		if (!pill) return;
		state.filters.meeting.delete(pill.dataset.key);
		render();
		(els.pillsRow.hidden ? els.summary : els.pills.querySelector("button"))?.focus();
	});

	let typing = 0;
	els.q.addEventListener("input", () => {
		clearTimeout(typing);
		typing = setTimeout(() => setQuery(els.q.value), 100);
	});
	els.q.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || !els.q.value) return;
		event.preventDefault();
		setQuery("");
	});
	els.clearQ.addEventListener("click", () => {
		setQuery("");
		els.q.focus();
	});

	/** @param {string} value */
	function setQuery(value) {
		clearTimeout(typing);
		els.q.value = value;
		state.q = value;
		render();
	}

	function renderControls() {
		for (const button of els.by.children) {
			const on = button.dataset.by === state.by;
			button.setAttribute("aria-checked", String(on));
			button.tabIndex = on ? 0 : -1;
		}
		for (const button of els.modes.children) {
			const on = button.dataset.mode === state.mode;
			button.setAttribute("aria-selected", String(on));
			button.tabIndex = on ? 0 : -1;
		}
		for (const kind of FILTERS) {
			for (const tag of countTags(kind)) {
				const chip = chips.get(`${kind}:${tag.key}`);
				const on = state.filters[kind].has(tag.key);
				chip.setAttribute("aria-pressed", String(on));
				chip.disabled = !tag.n && !on;
				chip.querySelector(".n").textContent = String(tag.n);
			}
		}
		const pills = [...state.filters.meeting].map((key) => tagsOf.meeting.get(key));
		els.pillsRow.hidden = !pills.length;
		els.pills.innerHTML = pills
			.map((tag) => `<button type="button" class="chip pill" data-kind="meeting" data-key="${esc(tag.key)}" aria-label="Remove class meeting filter: ${esc(tag.label)}">Class meeting: ${esc(tag.label)}</button>`)
			.join("");
		els.clearQ.hidden = !state.q;
		const active = FILTERED.reduce((sum, kind) => sum + state.filters[kind].size, 0);
		els.summary.textContent = `Filter by test or ${label.toLowerCase()}${active ? ` (${active} on)` : ""}`;
		els.status.innerHTML = `${filtered().length} of ${terms.length} terms${active ? " · <button type=\"button\" data-clear>Clear filters</button>" : ""}`;
		els.review.hidden = state.mode !== "review";
		els.study.hidden = state.mode !== "study";
	}

	// ---- Review ----

	/** @param {Term} term */
	const slideLinks = (term) =>
		term.taught.map((place) => `<a href="${esc(BASE + place.href.slice(1))}">Week ${place.week} · ${esc(place.weekday)}, slide ${place.slide}</a>`).join("") +
		(term.ref ? `<a href="${esc(term.ref.href)}">${esc(term.ref.label)}</a>` : "");

	/** @param {Term} term */
	const tagList = (term) =>
		`<ul class="tags" role="list">${KINDS.flatMap((kind) => term.tags[kind].map((tag) => `<li data-kind="${kind}">${esc(tag.label)}</li>`)).join("")}</ul>`;

	/**
	 * A to Z jump links above the A to Z groups. A letter with no term in view
	 * is shown but not linked, so the row keeps its shape as the list narrows.
	 * @param {{ key: string, label: string }[]} sets
	 * @param {(set: object) => string} id
	 */
	const jumpBar = (sets, id) => {
		const byLetter = new Map(sets.map((set) => [String(set.label).toUpperCase(), set]));
		const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
		const extra = sets.filter((set) => !letters.includes(String(set.label).toUpperCase()));
		const cell = (label, set) =>
			set
				? `<li><a href="#${id(set)}">${esc(label)}</a></li>`
				: `<li><span aria-disabled="true" title="No terms start with ${esc(label)}">${esc(label)}</span></li>`;
		return `<nav class="jump" aria-label="Jump to letter"><ul role="list">${extra.map((set) => cell(set.label, set)).join("")}${letters.map((letter) => cell(letter, byLetter.get(letter))).join("")}</ul></nav>`;
	};

	function renderReview() {
		const list = filtered();
		if (!list.length) {
			els.review.innerHTML = "<div class=\"empty\"><strong>No terms match.</strong><span>Clear the search or a filter to see more.</span></div>";
			return;
		}
		const sets = groups(list);
		const id = (set) => `g-${state.by}-${slug(set.key)}`;
		els.review.innerHTML = (state.by === "az" ? jumpBar(sets, id) : "") + sets
			.map(
				(set) => `<section class="group" id="${id(set)}"${state.by === "az" ? "" : ` data-kind="${state.by}"`} aria-labelledby="${id(set)}-h">
				<h2 class="heading" id="${id(set)}-h"><span class="name">${esc(set.label)}</span><span class="aside">${set.when ? `<span class="when">${esc(set.when)}</span>` : ""}${state.by === "meeting" ? `<span class="deck">${esc(set.deck)}</span>` : ""}<span class="count">${set.items.length} ${set.items.length === 1 ? "term" : "terms"}</span></span></h2>
				<dl>${set.items
					.map(
						(term) => `<div class="entry">
					<dt><span class="term">${highlight(term, hits?.get(term.id)?.marks)}</span>${term.group ? `<span class="api-group">${esc(term.group)}</span>` : ""}${state.known.has(term.id) ? "<span class=\"known\">✓ known</span>" : ""}</dt>
					<dd>${term.sig ? `<p class="sig">${term.sig}</p>` : ""}<p class="definition">${term.definition}</p>${term.meta ? `<p class="meta">${term.meta}</p>` : ""}${term.example ? `<p class="example"><span class="label">Example</span> ${term.example}</p>` : ""}${tagList(term)}<p class="links">${slideLinks(term)}</p></dd>
				</div>`,
					)
					.join("")}</dl>
			</section>`,
			)
			.join("");
	}

	// ---- Flashcards ----

	/** @param {Term} term */
	const termPart = (term) =>
		`<div class="front">${term.term}${term.group ? `<small>${esc(term.group)}</small>` : ""}${term.sig ? `<span class="sig">${term.sig}</span>` : ""}</div>`;
	/** @param {Term} term */
	const definitionPart = (term) => `<div class="back"><p class="definition">${term.definition}</p></div>`;
	/** @param {Term} term */
	const restPart = (term) =>
		`<div class="back">${term.meta ? `<p class="meta">${term.meta}</p>` : ""}${term.example ? `<p class="example"><span class="label">Example</span> ${term.example}</p>` : ""}<p class="links">${slideLinks(term)}</p></div>`;

	/** Visible, in Review order, one card per term, minus the ones known. */
	function startStudy() {
		const seen = new Set();
		const pool = [];
		for (const set of groups(filtered())) {
			for (const term of set.items) {
				if (seen.has(term.id) || state.known.has(term.id)) continue;
				seen.add(term.id);
				pool.push(term);
			}
		}
		if (state.shuffle) {
			for (let i = pool.length - 1; i > 0; i -= 1) {
				const j = Math.floor(Math.random() * (i + 1));
				[pool[i], pool[j]] = [pool[j], pool[i]];
			}
		}
		state.deck = pool;
		state.idx = 0;
		state.revealed = false;
		renderStudy(".reveal");
	}

	/** @param {string} [focus] selector to focus afterward; default, the control that had focus */
	function renderStudy(focus) {
		const act = document.activeElement?.closest?.("[data-act]")?.dataset.act;
		// Move focus only when the reader is already working in the cards.
		const working = els.study.contains(document.activeElement) || document.activeElement === document.body;
		const total = filtered().length;
		const knownCount = filtered().filter((term) => state.known.has(term.id)).length;
		const card = state.deck[state.idx];
		const top = `<div class="study-top"><span>${card ? `Card ${state.idx + 1} of ${state.deck.length}` : `${state.deck.length} to study`} · ${knownCount} of ${total} known</span>
			<div class="opts">
				<button type="button" class="chip" data-act="shuffle" aria-pressed="${state.shuffle}">Shuffle</button>
				<button type="button" class="chip" data-act="direction" aria-pressed="${state.direction === "def"}">Definition first</button>
				${knownCount && card ? "<button type=\"button\" class=\"chip\" data-act=\"reset\">Reset known</button>" : ""}
			</div></div>
			<div class="meter" role="progressbar" aria-label="Known terms" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${knownCount}"><i style="inline-size:${total ? Math.round((knownCount / total) * 100) : 0}%"></i></div>`;

		let html;
		if (!total) {
			html = `${top}<div class="empty"><strong>No terms match.</strong><span>Clear the search or a filter to study more.</span></div>`;
		} else if (!card) {
			html = `${top}<div class="done"><h2 class="heading">You know every card in this set.</h2><p>${knownCount} of ${total} marked known.</p><div class="verdict"><button type="button" data-act="again" class="primary">Start over with the ones I know</button></div></div>`;
		} else {
			const termFirst = state.direction === "term";
			const front = termFirst ? termPart(card) : definitionPart(card);
			const back = termFirst ? definitionPart(card) : termPart(card);
			const tests = card.tags.test.map((tag) => esc(tag.label)).join(", ");
			const chapters = card.tags.chapter.slice(0, 2).map((tag) => esc(tag.label)).join(", ");
			html = `${top}
				<div class="card" tabindex="-1">
					<div class="top"><span data-kind="test">${tests}</span><span data-kind="chapter">${chapters}</span></div>
					<div class="content">${state.revealed ? front + back + restPart(card) : front}</div>
					<div class="foot">${state.revealed ? "" : `<button type="button" class="reveal primary" data-act="reveal">Show ${termFirst ? "definition" : "term"}</button>`}</div>
				</div>
				${state.revealed ? "<div class=\"verdict\"><button type=\"button\" class=\"yes\" data-act=\"know\">I know this</button><button type=\"button\" data-act=\"later\">Show me again later</button></div>" : ""}
				<div class="nav"><button type="button" data-act="prev" ${state.idx === 0 ? "disabled" : ""}>← Previous</button><span class="hint">Space reveals · arrows move</span><button type="button" data-act="next" ${state.idx >= state.deck.length - 1 ? "disabled" : ""}>Next →</button></div>`;
		}
		els.study.innerHTML = html;

		if (working) {
			const target = (focus && els.study.querySelector(focus)) || (act && els.study.querySelector(`[data-act="${act}"]:not(:disabled)`));
			(target || els.study.querySelector(".card") || els.study.querySelector("[data-act]"))?.focus({ preventScroll: true });
		}

		els.announce.textContent = !card
			? ""
			: state.revealed
				? `Definition shown for ${card.plain}`
				: `Card ${state.idx + 1} of ${state.deck.length}`;
	}

	/** @param {string} act */
	function studyAction(act) {
		const card = state.deck[state.idx];
		if (act === "reveal" && card && !state.revealed) {
			state.revealed = true;
			renderStudy(".yes");
			return;
		}
		if (act === "know" && card) {
			state.known.add(card.id);
			saveKnown();
			state.deck.splice(state.idx, 1);
			state.idx = Math.min(state.idx, Math.max(state.deck.length - 1, 0));
		} else if (act === "later" && card) {
			state.deck.push(...state.deck.splice(state.idx, 1));
		} else if (act === "prev" && state.idx > 0) {
			state.idx -= 1;
		} else if (act === "next" && state.idx < state.deck.length - 1) {
			state.idx += 1;
		} else if (act === "shuffle") {
			state.shuffle = !state.shuffle;
			startStudy();
			return;
		} else if (act === "direction") {
			state.direction = state.direction === "term" ? "def" : "term";
		} else if (act === "reset" || act === "again") {
			for (const term of filtered()) state.known.delete(term.id);
			saveKnown();
			startStudy();
			return;
		} else {
			return;
		}
		state.revealed = false;
		renderStudy(act === "direction" ? undefined : ".reveal");
	}

	els.study.addEventListener("click", (event) => {
		const button = event.target.closest("[data-act]");
		if (button && !button.disabled) studyAction(button.dataset.act);
	});

	document.addEventListener("keydown", (event) => {
		if (state.mode !== "study" || event.altKey || event.ctrlKey || event.metaKey) return;
		const target = /** @type {HTMLElement} */ (event.target);
		if (target.closest("input, select, textarea, a, summary, [role=tab], [role=radio]")) return;
		if (event.key === " " || event.key === "Enter") {
			// A focused button already activates itself.
			if (target.closest("button")) return;
			event.preventDefault();
			studyAction("reveal");
		} else if (event.key === "ArrowRight") {
			studyAction("next");
		} else if (event.key === "ArrowLeft") {
			studyAction("prev");
		}
	}, { signal });

	// ---- Mode and URL ----

	/**
	 * @param {string} mode "review" or "study"
	 */
	function setMode(mode) {
		if (mode === state.mode) return;
		state.mode = mode;
		render();
	}

	/** An old `#study` link still opens Flashcards. */
	window.addEventListener("hashchange", () => {
		if (location.hash === "#study") setMode("study");
	}, { signal });

	/** Keep the link in step with the state: only non-default values, replaced, never pushed. */
	function writeUrl() {
		const next = new URLSearchParams(location.search);
		for (const name of PARAMS) next.delete(name);
		if (state.mode === "study") next.set("mode", "study");
		if (state.by !== "az") next.set("group", state.by === "chapter" ? "reading" : state.by);
		const keys = (kind) => [...state.filters[kind]].map((key) => (kind === "test" ? key.replace(/^test-/, "") : kind === "chapter" ? slug(key) : key));
		if (state.filters.test.size) next.set("test", keys("test").join(","));
		if (state.filters.chapter.size) next.set("reading", keys("chapter").join(","));
		if (state.filters.meeting.size) next.set("meeting", keys("meeting").join(","));
		if (state.q.trim()) next.set("q", state.q);
		const query = next.toString().replace(/%2C/g, ",");
		const hash = location.hash === "#study" ? "" : location.hash;
		const url = location.pathname + (query ? `?${query}` : "") + hash;
		if (url !== location.pathname + location.search + location.hash) {
			try {
				history.replaceState(null, "", url);
			} catch {
				// A sandboxed frame: the link just won't follow the state.
			}
		}
	}

	function render() {
		hits = search();
		view = null;
		renderControls();
		renderReview();
		if (state.mode === "study") startStudy();
		writeUrl();
	}

	els.q.value = state.q;
	if (FILTERED.some((kind) => params.has(kind === "chapter" ? "reading" : kind))) els.details.open = true;
	render();
	root.querySelector("[data-static]")?.remove();
	app.hidden = false;
}

/** The glossary's element: mounts once when it joins the page, and lets go when it leaves. */
class GlossaryApp extends HTMLElement {
	#abort = null;

	connectedCallback() {
		if (this.#abort) return;
		this.#abort = new AbortController();
		mount(this, this.#abort.signal);
	}

	disconnectedCallback() {
		this.#abort?.abort();
		this.#abort = null;
	}
}

if (!customElements.get("glossary-app")) customElements.define("glossary-app", GlossaryApp);
