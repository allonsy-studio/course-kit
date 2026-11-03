// assets/scripts/glossary.js
var KINDS = ["test", "chapter", "meeting", "topic"];
var FILTERS = ["test", "chapter"];
var FILTERED = ["test", "chapter", "meeting"];
var PARAMS = ["mode", "group", "test", "reading", "meeting", "q"];
var BASE = new URL("../", import.meta.url).pathname;
var esc = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
var store = {
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
    }
  }
};
function mount(root, signal) {
  const app = (
    /** @type {HTMLElement | null} */
    root.querySelector("[data-app]")
  );
  const source = root.querySelector('script[type="application/json"]');
  if (!app || !source) return;
  const data = JSON.parse(source.textContent);
  const label = data.readingLabel;
  const dims = [
    ["az", "A to Z"],
    ["test", "Test"],
    ["chapter", label],
    ["meeting", "Class meeting"]
  ];
  const tagsOf = Object.fromEntries(KINDS.map((kind) => [kind, new Map(data.tags[kind].map((tag) => [tag.key, tag]))]));
  const terms = data.terms.map((term) => ({
    ...term,
    tags: Object.fromEntries(KINDS.map((kind) => [kind, term.tags[kind].map((key) => tagsOf[kind].get(key))]))
  }));
  const params = new URLSearchParams(location.search);
  const listOf = (name) => params.getAll(name).flatMap((value) => value.split(",")).map((value) => value.trim().toLowerCase()).filter(Boolean);
  const lastNumber = (text) => text.match(/(\d+)\s*$/)?.[1];
  const resolve = (kind, values) => new Set(
    data.tags[kind].filter(
      (tag) => values.some(
        (value) => tag.key.toLowerCase() === value || slug(tag.key) === slug(value) || slug(tag.label) === slug(value) || kind === "test" && tag.key === `test-${value}` || /^\d+$/.test(value) && lastNumber(tag.label) === value
      )
    ).map((tag) => tag.key)
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
    known: /* @__PURE__ */ new Set(),
    deck: (
      /** @type {Term[]} */
      []
    ),
    idx: 0,
    revealed: false,
    direction: "term",
    shuffle: false
  };
  try {
    state.known = new Set(JSON.parse(store.get(knownKey) ?? "[]"));
  } catch {
    state.known = /* @__PURE__ */ new Set();
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
				</div>`
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
    announce: q("[data-announce]")
  };
  const hasAny = (term, kind) => !state.filters[kind].size || term.tags[kind].some((tag) => state.filters[kind].has(tag.key));
  const alnum = (text) => text.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
  const textOf = (html) => {
    const box = document.createElement("template");
    box.innerHTML = html;
    return box.content.textContent.toLowerCase();
  };
  const definitions = new Map(terms.map((term) => [term.id, textOf(term.definition)]));
  const names = new Map(terms.map((term) => [term.id, textOf(term.term)]));
  const near = (a, b) => {
    if (a === b) return true;
    const gap = a.length - b.length;
    if (Math.abs(gap) > 1) return false;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
    if (gap === 0) return a.slice(i + 1) === b.slice(i + 1) || a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
    return gap > 0 ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
  };
  const range = (from, length) => new Set(Array.from({ length }, (_, i) => from + i));
  const match = (term, raw) => {
    const wanted = alnum(raw);
    const at = term.key.indexOf(wanted);
    if (!wanted) return names.get(term.id).includes(raw.toLowerCase()) ? { score: 2, marks: null } : null;
    if (term.key === wanted) return { score: 0, marks: range(0, wanted.length) };
    if (at === 0) return { score: 1, marks: range(0, wanted.length) };
    if (at > 0) return { score: 2, marks: range(at, wanted.length) };
    if (wanted.length >= 3) {
      const marks = /* @__PURE__ */ new Set();
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
  const search = () => {
    const raw = state.q.trim();
    if (!raw) return null;
    const hits2 = /* @__PURE__ */ new Map();
    for (const term of terms) {
      const hit = match(term, raw);
      if (hit) hits2.set(term.id, hit);
    }
    return hits2;
  };
  let hits = null;
  let view = null;
  const passes = (term, skip) => (!hits || hits.has(term.id)) && FILTERED.every((kind) => kind === skip || hasAny(term, kind));
  const filtered = () => view ??= terms.filter((term) => passes(term));
  const countTags = (kind) => {
    const counts = /* @__PURE__ */ new Map();
    for (const term of terms) {
      if (!passes(term, kind)) continue;
      for (const tag of term.tags[kind]) counts.set(tag.key, (counts.get(tag.key) ?? 0) + 1);
    }
    return data.tags[kind].map((tag) => ({ ...tag, n: counts.get(tag.key) ?? 0 }));
  };
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
  const groups = (list) => {
    const sets = [];
    if (state.by === "az") {
      const byLetter = /* @__PURE__ */ new Map();
      for (const term of [...list].sort((a, b) => a.azOrder - b.azOrder)) {
        if (!byLetter.has(term.azGroup.key)) byLetter.set(term.azGroup.key, { ...term.azGroup, items: [] });
        byLetter.get(term.azGroup.key).items.push(term);
      }
      sets.push(...byLetter.values());
    } else {
      const byTag = /* @__PURE__ */ new Map();
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
  const roving = (container, selector, select, wrap = true) => {
    container.addEventListener("keydown", (event) => {
      const buttons = [...container.querySelectorAll(selector)];
      const at = buttons.indexOf(
        /** @type {HTMLElement} */
        document.activeElement
      );
      if (at < 0) return;
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      const moved = at + (step ?? 0);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : step ? wrap ? (moved + buttons.length) % buttons.length : moved : -1;
      if (next < 0 || next >= buttons.length) return;
      event.preventDefault();
      buttons[next].focus();
      select(buttons[next]);
    });
  };
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
  function selectBy(button) {
    state.by = button.dataset.by;
    render();
  }
  const chips = /* @__PURE__ */ new Map();
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
    els.pills.innerHTML = pills.map((tag) => `<button type="button" class="chip pill" data-kind="meeting" data-key="${esc(tag.key)}" aria-label="Remove class meeting filter: ${esc(tag.label)}">Class meeting: ${esc(tag.label)}</button>`).join("");
    els.clearQ.hidden = !state.q;
    const active = FILTERED.reduce((sum, kind) => sum + state.filters[kind].size, 0);
    els.summary.textContent = `Filter by test or ${label.toLowerCase()}${active ? ` (${active} on)` : ""}`;
    els.status.innerHTML = `${filtered().length} of ${terms.length} terms${active ? ' \xB7 <button type="button" data-clear>Clear filters</button>' : ""}`;
    els.review.hidden = state.mode !== "review";
    els.study.hidden = state.mode !== "study";
  }
  const slideLinks = (term) => term.taught.map((place) => `<a href="${esc(BASE + place.href.slice(1))}">Week ${place.week} \xB7 ${esc(place.weekday)}, slide ${place.slide}</a>`).join("") + (term.ref ? `<a href="${esc(term.ref.href)}">${esc(term.ref.label)}</a>` : "");
  const tagList = (term) => `<ul class="tags" role="list">${KINDS.flatMap((kind) => term.tags[kind].map((tag) => `<li data-kind="${kind}">${esc(tag.label)}</li>`)).join("")}</ul>`;
  function renderReview() {
    const list = filtered();
    if (!list.length) {
      els.review.innerHTML = '<div class="empty"><strong>No terms match.</strong><span>Clear the search or a filter to see more.</span></div>';
      return;
    }
    const sets = groups(list);
    const id = (set) => `g-${state.by}-${slug(set.key)}`;
    els.review.innerHTML = sets.map(
      (set) => `<section class="group" id="${id(set)}"${state.by === "az" ? "" : ` data-kind="${state.by}"`} aria-labelledby="${id(set)}-h">
				<h2 class="heading" id="${id(set)}-h"><span class="name">${esc(set.label)}</span><span class="aside">${set.when ? `<span class="when">${esc(set.when)}</span>` : ""}${state.by === "meeting" ? `<span class="deck">${esc(set.deck)}</span>` : ""}<span class="count">${set.items.length} ${set.items.length === 1 ? "term" : "terms"}</span></span></h2>
				<dl>${set.items.map(
        (term) => `<div class="entry">
					<dt><span class="term">${highlight(term, hits?.get(term.id)?.marks)}</span>${term.group ? `<span class="api-group">${esc(term.group)}</span>` : ""}${state.known.has(term.id) ? '<span class="known">\u2713 known</span>' : ""}</dt>
					<dd>${term.sig ? `<p class="sig">${term.sig}</p>` : ""}<p class="definition">${term.definition}</p>${term.meta ? `<p class="meta">${term.meta}</p>` : ""}${term.example ? `<p class="example"><span class="label">Example</span> ${term.example}</p>` : ""}${tagList(term)}<p class="links">${slideLinks(term)}</p></dd>
				</div>`
      ).join("")}</dl>
			</section>`
    ).join("");
  }
  const termPart = (term) => `<div class="front">${term.term}${term.group ? `<small>${esc(term.group)}</small>` : ""}${term.sig ? `<span class="sig">${term.sig}</span>` : ""}</div>`;
  const definitionPart = (term) => `<div class="back"><p class="definition">${term.definition}</p></div>`;
  const restPart = (term) => `<div class="back">${term.meta ? `<p class="meta">${term.meta}</p>` : ""}${term.example ? `<p class="example"><span class="label">Example</span> ${term.example}</p>` : ""}<p class="links">${slideLinks(term)}</p></div>`;
  function startStudy() {
    const seen = /* @__PURE__ */ new Set();
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
  function renderStudy(focus) {
    const act = document.activeElement?.closest?.("[data-act]")?.dataset.act;
    const working = els.study.contains(document.activeElement) || document.activeElement === document.body;
    const total = filtered().length;
    const knownCount = filtered().filter((term) => state.known.has(term.id)).length;
    const card = state.deck[state.idx];
    const top = `<div class="study-top"><span>${card ? `Card ${state.idx + 1} of ${state.deck.length}` : `${state.deck.length} to study`} \xB7 ${knownCount} of ${total} known</span>
			<div class="opts">
				<button type="button" class="chip" data-act="shuffle" aria-pressed="${state.shuffle}">Shuffle</button>
				<button type="button" class="chip" data-act="direction" aria-pressed="${state.direction === "def"}">Definition first</button>
				${knownCount && card ? '<button type="button" class="chip" data-act="reset">Reset known</button>' : ""}
			</div></div>
			<div class="meter" role="progressbar" aria-label="Known terms" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${knownCount}"><i style="inline-size:${total ? Math.round(knownCount / total * 100) : 0}%"></i></div>`;
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
				${state.revealed ? '<div class="verdict"><button type="button" class="yes" data-act="know">I know this</button><button type="button" data-act="later">Show me again later</button></div>' : ""}
				<div class="nav"><button type="button" data-act="prev" ${state.idx === 0 ? "disabled" : ""}>\u2190 Previous</button><span class="hint">Space reveals \xB7 arrows move</span><button type="button" data-act="next" ${state.idx >= state.deck.length - 1 ? "disabled" : ""}>Next \u2192</button></div>`;
    }
    els.study.innerHTML = html;
    if (working) {
      const target = focus && els.study.querySelector(focus) || act && els.study.querySelector(`[data-act="${act}"]:not(:disabled)`);
      (target || els.study.querySelector(".card") || els.study.querySelector("[data-act]"))?.focus({ preventScroll: true });
    }
    els.announce.textContent = !card ? "" : state.revealed ? `Definition shown for ${card.plain}` : `Card ${state.idx + 1} of ${state.deck.length}`;
  }
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
    renderStudy(act === "direction" ? void 0 : ".reveal");
  }
  els.study.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    if (button && !button.disabled) studyAction(button.dataset.act);
  });
  document.addEventListener("keydown", (event) => {
    if (state.mode !== "study" || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = (
      /** @type {HTMLElement} */
      event.target
    );
    if (target.closest("input, select, textarea, a, summary, [role=tab], [role=radio]")) return;
    if (event.key === " " || event.key === "Enter") {
      if (target.closest("button")) return;
      event.preventDefault();
      studyAction("reveal");
    } else if (event.key === "ArrowRight") {
      studyAction("next");
    } else if (event.key === "ArrowLeft") {
      studyAction("prev");
    }
  }, { signal });
  function setMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;
    render();
  }
  window.addEventListener("hashchange", () => {
    if (location.hash === "#study") setMode("study");
  }, { signal });
  function writeUrl() {
    const next = new URLSearchParams(location.search);
    for (const name of PARAMS) next.delete(name);
    if (state.mode === "study") next.set("mode", "study");
    if (state.by !== "az") next.set("group", state.by === "chapter" ? "reading" : state.by);
    const keys = (kind) => [...state.filters[kind]].map((key) => kind === "test" ? key.replace(/^test-/, "") : kind === "chapter" ? slug(key) : key);
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
var GlossaryApp = class extends HTMLElement {
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
};
if (!customElements.get("glossary-app")) customElements.define("glossary-app", GlossaryApp);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvZ2xvc3NhcnkuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogVGhlIGNvdXJzZSBnbG9zc2FyeTogUmV2aWV3IGFuZCBGbGFzaGNhcmRzIG92ZXIgb25lIHRhZ2dlZCwgZmlsdGVyYWJsZSBsaXN0LlxuICpcbiAqIEVuaGFuY2VzIHRoZSBwbGFpbiBsaXN0IGA8Z2xvc3NhcnktcGFuZWw+YCByZW5kZXJzIG9uIHRoZSBzZXJ2ZXIuIEl0XG4gKiByZWFkcyB0aGUgdGVybXMgZnJvbSB0aGUgcGFnZSdzIEpTT04sIGJ1aWxkcyB0aGUgY29udHJvbHMsIGFuZCByZW1vdmVzIHRoZVxuICogc3RhdGljIGxpc3Qgb25jZSBpdCBoYXMgcmVuZGVyZWQuIFRoZSBwYWdlIG5ldmVyIHJlYWRzIHRoZSBjbG9jay4gVGhlIHF1ZXJ5XG4gKiBzdHJpbmcgKGBtb2RlYCwgYGdyb3VwYCwgYHRlc3RgLCBgcmVhZGluZ2AsIGBtZWV0aW5nYCwgYHFgKSBzZXRzIHRoZSBzdGFydGluZ1xuICogc3RhdGUgYW5kIGlzIGtlcHQgaW4gc3RlcCBhcyB0aGUgcmVhZGVyIGNoYW5nZXMgaXQuXG4gKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBUYWdcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBrZXlcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBsYWJlbFxuICogQHByb3BlcnR5IHtudW1iZXJ9IG9yZGVyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW3doZW5dIHRoZSBkYXRlIGZvciBkaXNwbGF5XG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2RlY2tdIGRlY2sgdGl0bGUgKG1lZXRpbmcpXG4gKiBAcHJvcGVydHkge251bWJlcn0gW25dIHRlcm1zIGNhcnJ5aW5nIHRoZSB0YWcgdW5kZXIgdGhlIG90aGVyIHJvdydzIGZpbHRlclxuICpcbiAqIEB0eXBlZGVmIHtvYmplY3R9IFBsYWNlXG4gKiBAcHJvcGVydHkge251bWJlcn0gd2Vla1xuICogQHByb3BlcnR5IHtudW1iZXJ9IHNsaWRlXG4gKiBAcHJvcGVydHkge3N0cmluZ30gd2Vla2RheVxuICogQHByb3BlcnR5IHtzdHJpbmd9IGhyZWZcbiAqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBUZXJtXG4gKiBAcHJvcGVydHkge3N0cmluZ30gaWRcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0ZXJtIEhUTUxcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBwbGFpblxuICogQHByb3BlcnR5IHtzdHJpbmd9IGtleSBsZXR0ZXJzIGFuZCBkaWdpdHMgb25seSwgbG93ZXJjYXNlZDogdGhlIHNvcnQgYW5kIHNlYXJjaCBrZXlcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBhek9yZGVyIHBvc2l0aW9uIGluIEEgdG8gWiBvcmRlciwgZnJvbSB0aGUgbG9hZGVyXG4gKiBAcHJvcGVydHkge3sga2V5OiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcgfX0gYXpHcm91cCBcIjAgdG8gOVwiLCBhIGxldHRlciBvciBcIlN5bWJvbHNcIlxuICogQHByb3BlcnR5IHtzdHJpbmd9IGdyb3VwXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZGVmaW5pdGlvbiBIVE1MXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZXhhbXBsZSBIVE1MXG4gKiBAcHJvcGVydHkge3N0cmluZ30gbWV0YSBIVE1MXG4gKiBAcHJvcGVydHkge3N0cmluZ30gc2lnIEhUTUxcbiAqIEBwcm9wZXJ0eSB7eyBsYWJlbDogc3RyaW5nLCBocmVmOiBzdHJpbmcgfXxudWxsfSByZWZcbiAqIEBwcm9wZXJ0eSB7UmVjb3JkPHN0cmluZywgVGFnW10+fSB0YWdzXG4gKiBAcHJvcGVydHkge1BsYWNlW119IHRhdWdodFxuICovXG5cbmNvbnN0IEtJTkRTID0gW1widGVzdFwiLCBcImNoYXB0ZXJcIiwgXCJtZWV0aW5nXCIsIFwidG9waWNcIl07XG4vKiogVGhlIHR3byBraW5kcyB3aXRoIGEgY2hpcCByb3cuICovXG5jb25zdCBGSUxURVJTID0gW1widGVzdFwiLCBcImNoYXB0ZXJcIl07XG4vKiogRXZlcnkga2luZCBhIGxpbmsgY2FuIGZpbHRlciBieTsgYG1lZXRpbmdgIGhhcyBhIHJlbW92YWJsZSBwaWxsIGluc3RlYWQgb2YgYSByb3cuICovXG5jb25zdCBGSUxURVJFRCA9IFtcInRlc3RcIiwgXCJjaGFwdGVyXCIsIFwibWVldGluZ1wiXTtcbmNvbnN0IFBBUkFNUyA9IFtcIm1vZGVcIiwgXCJncm91cFwiLCBcInRlc3RcIiwgXCJyZWFkaW5nXCIsIFwibWVldGluZ1wiLCBcInFcIl07XG5cbi8qKiBTaXRlIHJvb3QgKG9yIHRoZSBQYWdlcyBwYXRoIHByZWZpeCksIHRha2VuIGZyb20gd2hlcmUgdGhpcyBzY3JpcHQgaXMgc2VydmVkLiAqL1xuY29uc3QgQkFTRSA9IG5ldyBVUkwoXCIuLi9cIiwgaW1wb3J0Lm1ldGEudXJsKS5wYXRobmFtZTtcblxuLyoqIEBwYXJhbSB7dW5rbm93bn0gdGV4dCAqL1xuY29uc3QgZXNjID0gKHRleHQpID0+IFN0cmluZyh0ZXh0ID8/IFwiXCIpLnJlcGxhY2UoL1smPD5cIl0vZywgKGMpID0+ICh7IFwiJlwiOiBcIiZhbXA7XCIsIFwiPFwiOiBcIiZsdDtcIiwgXCI+XCI6IFwiJmd0O1wiLCAnXCInOiBcIiZxdW90O1wiIH0pW2NdKTtcblxuLyoqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0ICovXG5jb25zdCBzbHVnID0gKHRleHQpID0+IHRleHQudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV0rL2csIFwiLVwiKS5yZXBsYWNlKC9eLXwtJC9nLCBcIlwiKTtcblxuLyoqIGxvY2FsU3RvcmFnZSB0aGF0IG5ldmVyIHRocm93cyAocHJpdmF0ZSB3aW5kb3dzLCBibG9ja2VkIHN0b3JhZ2UpLiAqL1xuY29uc3Qgc3RvcmUgPSB7XG5cdC8qKiBAcGFyYW0ge3N0cmluZ30ga2V5ICovXG5cdGdldChrZXkpIHtcblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30ga2V5XG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuXHQgKi9cblx0c2V0KGtleSwgdmFsdWUpIHtcblx0XHR0cnkge1xuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCB2YWx1ZSk7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBQcm9ncmVzcyBqdXN0IHdvbid0IHBlcnNpc3QuXG5cdFx0fVxuXHR9LFxufTtcblxuLyoqXG4gKiBCdWlsZCB0aGUgZ2xvc3NhcnkncyBjb250cm9scyBpbnNpZGUgaXRzIGVsZW1lbnQsIGFuZCByZW1vdmUgdGhlIHN0YXRpYyBsaXN0LlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm9vdCB0aGUgYDxnbG9zc2FyeS1hcHA+YCBlbGVtZW50XG4gKiBAcGFyYW0ge0Fib3J0U2lnbmFsfSBzaWduYWwgZW5kcyB0aGUgcGFnZS1sZXZlbCBsaXN0ZW5lcnMgd2hlbiB0aGUgZWxlbWVudCBsZWF2ZXMgdGhlIHBhZ2VcbiAqL1xuZnVuY3Rpb24gbW91bnQocm9vdCwgc2lnbmFsKSB7XG5cdGNvbnN0IGFwcCA9IC8qKiBAdHlwZSB7SFRNTEVsZW1lbnQgfCBudWxsfSAqLyAocm9vdC5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtYXBwXVwiKSk7XG5cdGNvbnN0IHNvdXJjZSA9IHJvb3QucXVlcnlTZWxlY3Rvcignc2NyaXB0W3R5cGU9XCJhcHBsaWNhdGlvbi9qc29uXCJdJyk7XG5cdGlmICghYXBwIHx8ICFzb3VyY2UpIHJldHVybjtcblxuXHRjb25zdCBkYXRhID0gSlNPTi5wYXJzZShzb3VyY2UudGV4dENvbnRlbnQpO1xuXHRjb25zdCBsYWJlbCA9IGRhdGEucmVhZGluZ0xhYmVsO1xuXHRjb25zdCBkaW1zID0gW1xuXHRcdFtcImF6XCIsIFwiQSB0byBaXCJdLFxuXHRcdFtcInRlc3RcIiwgXCJUZXN0XCJdLFxuXHRcdFtcImNoYXB0ZXJcIiwgbGFiZWxdLFxuXHRcdFtcIm1lZXRpbmdcIiwgXCJDbGFzcyBtZWV0aW5nXCJdLFxuXHRdO1xuXG5cdGNvbnN0IHRhZ3NPZiA9IE9iamVjdC5mcm9tRW50cmllcyhLSU5EUy5tYXAoKGtpbmQpID0+IFtraW5kLCBuZXcgTWFwKGRhdGEudGFnc1traW5kXS5tYXAoKHRhZykgPT4gW3RhZy5rZXksIHRhZ10pKV0pKTtcblxuXHQvKiogQHR5cGUge1Rlcm1bXX0gKi9cblx0Y29uc3QgdGVybXMgPSBkYXRhLnRlcm1zLm1hcCgodGVybSkgPT4gKHtcblx0XHQuLi50ZXJtLFxuXHRcdHRhZ3M6IE9iamVjdC5mcm9tRW50cmllcyhLSU5EUy5tYXAoKGtpbmQpID0+IFtraW5kLCB0ZXJtLnRhZ3Nba2luZF0ubWFwKChrZXkpID0+IHRhZ3NPZltraW5kXS5nZXQoa2V5KSldKSksXG5cdH0pKTtcblxuXHQvLyAtLS0tIFRoZSBzdGFydGluZyBzdGF0ZSwgZnJvbSB0aGUgcXVlcnkgc3RyaW5nICh1bnRydXN0ZWQ6IG1hdGNoZWQgYWdhaW5zdCBrbm93biBrZXlzIG9ubHkpIC0tLS1cblxuXHRjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaCk7XG5cdGNvbnN0IGxpc3RPZiA9IChuYW1lKSA9PiBwYXJhbXMuZ2V0QWxsKG5hbWUpLmZsYXRNYXAoKHZhbHVlKSA9PiB2YWx1ZS5zcGxpdChcIixcIikpLm1hcCgodmFsdWUpID0+IHZhbHVlLnRyaW0oKS50b0xvd2VyQ2FzZSgpKS5maWx0ZXIoQm9vbGVhbik7XG5cdGNvbnN0IGxhc3ROdW1iZXIgPSAodGV4dCkgPT4gdGV4dC5tYXRjaCgvKFxcZCspXFxzKiQvKT8uWzFdO1xuXG5cdC8qKlxuXHQgKiBUaGUgdGFnIGtleXMgb2YgYGtpbmRgIHRoYXQgdGhlIHZhbHVlcyBuYW1lOiBhIGtleSwgaXRzIHNsdWcgb3IgbGFiZWwgc2x1ZywgYG5gIGZvciBgdGVzdC1uYCxcblx0ICogb3IgYSBiYXJlIG51bWJlciB3aGVyZSBhIGxhYmVsIGVuZHMgaW4gb25lLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30ga2luZFxuXHQgKiBAcGFyYW0ge3N0cmluZ1tdfSB2YWx1ZXNcblx0ICovXG5cdGNvbnN0IHJlc29sdmUgPSAoa2luZCwgdmFsdWVzKSA9PlxuXHRcdG5ldyBTZXQoXG5cdFx0XHRkYXRhLnRhZ3Nba2luZF1cblx0XHRcdFx0LmZpbHRlcigodGFnKSA9PlxuXHRcdFx0XHRcdHZhbHVlcy5zb21lKFxuXHRcdFx0XHRcdFx0KHZhbHVlKSA9PlxuXHRcdFx0XHRcdFx0XHR0YWcua2V5LnRvTG93ZXJDYXNlKCkgPT09IHZhbHVlIHx8XG5cdFx0XHRcdFx0XHRcdHNsdWcodGFnLmtleSkgPT09IHNsdWcodmFsdWUpIHx8XG5cdFx0XHRcdFx0XHRcdHNsdWcodGFnLmxhYmVsKSA9PT0gc2x1Zyh2YWx1ZSkgfHxcblx0XHRcdFx0XHRcdFx0KGtpbmQgPT09IFwidGVzdFwiICYmIHRhZy5rZXkgPT09IGB0ZXN0LSR7dmFsdWV9YCkgfHxcblx0XHRcdFx0XHRcdFx0KC9eXFxkKyQvLnRlc3QodmFsdWUpICYmIGxhc3ROdW1iZXIodGFnLmxhYmVsKSA9PT0gdmFsdWUpLFxuXHRcdFx0XHRcdCksXG5cdFx0XHRcdClcblx0XHRcdFx0Lm1hcCgodGFnKSA9PiB0YWcua2V5KSxcblx0XHQpO1xuXG5cdGNvbnN0IHN0YXJ0QnkgPSAoKCkgPT4ge1xuXHRcdGNvbnN0IHZhbHVlID0gcGFyYW1zLmdldChcImdyb3VwXCIpPy50cmltKCkudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAodmFsdWUgPT09IFwicmVhZGluZ1wiIHx8IHZhbHVlID09PSBsYWJlbC50b0xvd2VyQ2FzZSgpKSByZXR1cm4gXCJjaGFwdGVyXCI7XG5cdFx0cmV0dXJuIGRpbXMuc29tZSgoW2RpbV0pID0+IGRpbSA9PT0gdmFsdWUpID8gdmFsdWUgOiBcImF6XCI7XG5cdH0pKCk7XG5cdGNvbnN0IHN0YXJ0TW9kZSA9IFtcInN0dWR5XCIsIFwiZmxhc2hjYXJkc1wiXS5pbmNsdWRlcyhwYXJhbXMuZ2V0KFwibW9kZVwiKT8udG9Mb3dlckNhc2UoKSkgPyBcInN0dWR5XCIgOiBwYXJhbXMuZ2V0KFwibW9kZVwiKT8udG9Mb3dlckNhc2UoKSA9PT0gXCJyZXZpZXdcIiA/IFwicmV2aWV3XCIgOiBsb2NhdGlvbi5oYXNoID09PSBcIiNzdHVkeVwiID8gXCJzdHVkeVwiIDogXCJyZXZpZXdcIjtcblxuXHRjb25zdCBrbm93bktleSA9IGAke2RhdGEuY29kZS50b0xvd2VyQ2FzZSgpfS1nbG9zc2FyeS1rbm93bmA7XG5cdGNvbnN0IHN0YXRlID0ge1xuXHRcdGJ5OiBzdGFydEJ5LFxuXHRcdG1vZGU6IHN0YXJ0TW9kZSxcblx0XHRxOiBwYXJhbXMuZ2V0KFwicVwiKT8uc2xpY2UoMCwgMjAwKSA/PyBcIlwiLFxuXHRcdGZpbHRlcnM6IHsgdGVzdDogcmVzb2x2ZShcInRlc3RcIiwgbGlzdE9mKFwidGVzdFwiKSksIGNoYXB0ZXI6IHJlc29sdmUoXCJjaGFwdGVyXCIsIGxpc3RPZihcInJlYWRpbmdcIikpLCBtZWV0aW5nOiByZXNvbHZlKFwibWVldGluZ1wiLCBsaXN0T2YoXCJtZWV0aW5nXCIpKSB9LFxuXHRcdGtub3duOiBuZXcgU2V0KCksXG5cdFx0ZGVjazogLyoqIEB0eXBlIHtUZXJtW119ICovIChbXSksXG5cdFx0aWR4OiAwLFxuXHRcdHJldmVhbGVkOiBmYWxzZSxcblx0XHRkaXJlY3Rpb246IFwidGVybVwiLFxuXHRcdHNodWZmbGU6IGZhbHNlLFxuXHR9O1xuXG5cdHRyeSB7XG5cdFx0c3RhdGUua25vd24gPSBuZXcgU2V0KEpTT04ucGFyc2Uoc3RvcmUuZ2V0KGtub3duS2V5KSA/PyBcIltdXCIpKTtcblx0fSBjYXRjaCB7XG5cdFx0c3RhdGUua25vd24gPSBuZXcgU2V0KCk7XG5cdH1cblx0Y29uc3Qgc2F2ZUtub3duID0gKCkgPT4gc3RvcmUuc2V0KGtub3duS2V5LCBKU09OLnN0cmluZ2lmeShbLi4uc3RhdGUua25vd25dKSk7XG5cblx0YXBwLmlubmVySFRNTCA9IGBcblx0XHQ8ZGl2IGNsYXNzPVwiYmFyXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYmFyLWdyb3VwXCI+XG5cdFx0XHRcdDxzcGFuIGNsYXNzPVwibGFiZWxcIiBpZD1cImdsb3NzYXJ5LWJ5XCI+R3JvdXAgYnk8L3NwYW4+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzZWdcIiByb2xlPVwicmFkaW9ncm91cFwiIGFyaWEtbGFiZWxsZWRieT1cImdsb3NzYXJ5LWJ5XCIgZGF0YS1ieT48L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInNlZyBtb2Rlc1wiIHJvbGU9XCJ0YWJsaXN0XCIgYXJpYS1sYWJlbD1cIk1vZGVcIiBkYXRhLW1vZGVzPlxuXHRcdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiByb2xlPVwidGFiXCIgaWQ9XCJnbG9zc2FyeS10YWItcmV2aWV3XCIgYXJpYS1jb250cm9scz1cImdsb3NzYXJ5LXBhbmVsLXJldmlld1wiIGRhdGEtbW9kZT1cInJldmlld1wiPlJldmlldzwvYnV0dG9uPlxuXHRcdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiByb2xlPVwidGFiXCIgaWQ9XCJnbG9zc2FyeS10YWItc3R1ZHlcIiBhcmlhLWNvbnRyb2xzPVwiZ2xvc3NhcnktcGFuZWwtc3R1ZHlcIiBkYXRhLW1vZGU9XCJzdHVkeVwiPkZsYXNoY2FyZHM8L2J1dHRvbj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJzZWFyY2hcIj5cblx0XHRcdDxsYWJlbCBjbGFzcz1cImxhYmVsXCIgZm9yPVwiZ2xvc3NhcnktcVwiPlNlYXJjaCB0ZXJtczwvbGFiZWw+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiZmllbGRcIj5cblx0XHRcdFx0PGlucHV0IHR5cGU9XCJzZWFyY2hcIiBpZD1cImdsb3NzYXJ5LXFcIiBuYW1lPVwicVwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiIHNwZWxsY2hlY2s9XCJmYWxzZVwiIGRhdGEtcT5cblx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjbGVhci1zZWFyY2hcIiBkYXRhLWNsZWFyLXEgaGlkZGVuPkNsZWFyPHNwYW4gY2xhc3M9XCJzci1vbmx5XCI+IHNlYXJjaDwvc3Bhbj48L2J1dHRvbj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdDxkZXRhaWxzIGNsYXNzPVwiZmlsdGVyc1wiIGRhdGEtZmlsdGVycz5cblx0XHRcdDxzdW1tYXJ5IGRhdGEtc3VtbWFyeT48L3N1bW1hcnk+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiZmlsdGVyLXJvd3NcIj5cblx0XHRcdFx0JHtGSUxURVJTLm1hcChcblx0XHRcdFx0XHQoa2luZCkgPT4gYDxkaXYgY2xhc3M9XCJmaWx0ZXItcm93XCI+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJsYWJlbFwiIGlkPVwiZ2xvc3NhcnktZi0ke2tpbmR9XCI+JHtlc2Moa2luZCA9PT0gXCJ0ZXN0XCIgPyBcIlRlc3RcIiA6IGxhYmVsKX08L3NwYW4+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImNoaXBzXCIgcm9sZT1cImdyb3VwXCIgYXJpYS1sYWJlbGxlZGJ5PVwiZ2xvc3NhcnktZi0ke2tpbmR9XCIgZGF0YS1jaGlwcz1cIiR7a2luZH1cIj48L2Rpdj5cblx0XHRcdFx0PC9kaXY+YCxcblx0XHRcdFx0KS5qb2luKFwiXCIpfVxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiZmlsdGVyLXJvd1wiIGRhdGEtcGlsbHMtcm93IGhpZGRlbj5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImxhYmVsXCIgaWQ9XCJnbG9zc2FyeS1mLW1lZXRpbmdcIj5DbGFzcyBtZWV0aW5nPC9zcGFuPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGlwc1wiIHJvbGU9XCJncm91cFwiIGFyaWEtbGFiZWxsZWRieT1cImdsb3NzYXJ5LWYtbWVldGluZ1wiIGRhdGEtcGlsbHM+PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kZXRhaWxzPlxuXHRcdDxwIGNsYXNzPVwic3RhdHVzXCIgYXJpYS1saXZlPVwicG9saXRlXCIgZGF0YS1zdGF0dXM+PC9wPlxuXHRcdDxkaXYgcm9sZT1cInRhYnBhbmVsXCIgaWQ9XCJnbG9zc2FyeS1wYW5lbC1yZXZpZXdcIiBhcmlhLWxhYmVsbGVkYnk9XCJnbG9zc2FyeS10YWItcmV2aWV3XCIgZGF0YS1yZXZpZXc+PC9kaXY+XG5cdFx0PGRpdiByb2xlPVwidGFicGFuZWxcIiBpZD1cImdsb3NzYXJ5LXBhbmVsLXN0dWR5XCIgYXJpYS1sYWJlbGxlZGJ5PVwiZ2xvc3NhcnktdGFiLXN0dWR5XCIgY2xhc3M9XCJzdHVkeVwiIGRhdGEtc3R1ZHkgaGlkZGVuPjwvZGl2PlxuXHRcdDxwIGNsYXNzPVwic3Itb25seVwiIHJvbGU9XCJzdGF0dXNcIiBkYXRhLWFubm91bmNlPjwvcD5gO1xuXG5cdGNvbnN0IHEgPSAoc2VsZWN0b3IpID0+IGFwcC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcblx0Y29uc3QgZWxzID0ge1xuXHRcdGJ5OiBxKFwiW2RhdGEtYnldXCIpLFxuXHRcdG1vZGVzOiBxKFwiW2RhdGEtbW9kZXNdXCIpLFxuXHRcdHN1bW1hcnk6IHEoXCJbZGF0YS1zdW1tYXJ5XVwiKSxcblx0XHRkZXRhaWxzOiBxKFwiW2RhdGEtZmlsdGVyc11cIiksXG5cdFx0cTogcShcIltkYXRhLXFdXCIpLFxuXHRcdGNsZWFyUTogcShcIltkYXRhLWNsZWFyLXFdXCIpLFxuXHRcdHBpbGxzOiBxKFwiW2RhdGEtcGlsbHNdXCIpLFxuXHRcdHBpbGxzUm93OiBxKFwiW2RhdGEtcGlsbHMtcm93XVwiKSxcblx0XHRzdGF0dXM6IHEoXCJbZGF0YS1zdGF0dXNdXCIpLFxuXHRcdHJldmlldzogcShcIltkYXRhLXJldmlld11cIiksXG5cdFx0c3R1ZHk6IHEoXCJbZGF0YS1zdHVkeV1cIiksXG5cdFx0YW5ub3VuY2U6IHEoXCJbZGF0YS1hbm5vdW5jZV1cIiksXG5cdH07XG5cblx0LyoqIEBwYXJhbSB7VGVybX0gdGVybSBAcGFyYW0ge3N0cmluZ30ga2luZCAqL1xuXHRjb25zdCBoYXNBbnkgPSAodGVybSwga2luZCkgPT4gIXN0YXRlLmZpbHRlcnNba2luZF0uc2l6ZSB8fCB0ZXJtLnRhZ3Nba2luZF0uc29tZSgodGFnKSA9PiBzdGF0ZS5maWx0ZXJzW2tpbmRdLmhhcyh0YWcua2V5KSk7XG5cblx0Ly8gLS0tLSBTZWFyY2g6IHRoZSB0ZXJtIGZpcnN0IChmb3JnaXZpbmcpLCB0aGVuIHRoZSBkZWZpbml0aW9uIChwbGFpbiB3b3JkcykgLS0tLVxuXG5cdC8qKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBsZXR0ZXJzIGFuZCBkaWdpdHMgb25seSwgbG93ZXJjYXNlZCwgbm8gYWNjZW50cyAqL1xuXHRjb25zdCBhbG51bSA9ICh0ZXh0KSA9PiB0ZXh0Lm5vcm1hbGl6ZShcIk5GS0RcIikudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV0vZywgXCJcIik7XG5cblx0LyoqIEBwYXJhbSB7c3RyaW5nfSBodG1sICovXG5cdGNvbnN0IHRleHRPZiA9IChodG1sKSA9PiB7XG5cdFx0Y29uc3QgYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRlbXBsYXRlXCIpO1xuXHRcdGJveC5pbm5lckhUTUwgPSBodG1sO1xuXHRcdHJldHVybiBib3guY29udGVudC50ZXh0Q29udGVudC50b0xvd2VyQ2FzZSgpO1xuXHR9O1xuXG5cdGNvbnN0IGRlZmluaXRpb25zID0gbmV3IE1hcCh0ZXJtcy5tYXAoKHRlcm0pID0+IFt0ZXJtLmlkLCB0ZXh0T2YodGVybS5kZWZpbml0aW9uKV0pKTtcblx0Y29uc3QgbmFtZXMgPSBuZXcgTWFwKHRlcm1zLm1hcCgodGVybSkgPT4gW3Rlcm0uaWQsIHRleHRPZih0ZXJtLnRlcm0pXSkpO1xuXG5cdC8qKiBXaGV0aGVyIGBhYCBpcyBgYmAgd2l0aCBvbmUgbGV0dGVyIGFkZGVkLCBkcm9wcGVkLCBjaGFuZ2VkIG9yIHR3byBzd2FwcGVkLiAqL1xuXHRjb25zdCBuZWFyID0gKGEsIGIpID0+IHtcblx0XHRpZiAoYSA9PT0gYikgcmV0dXJuIHRydWU7XG5cdFx0Y29uc3QgZ2FwID0gYS5sZW5ndGggLSBiLmxlbmd0aDtcblx0XHRpZiAoTWF0aC5hYnMoZ2FwKSA+IDEpIHJldHVybiBmYWxzZTtcblx0XHRsZXQgaSA9IDA7XG5cdFx0d2hpbGUgKGkgPCBhLmxlbmd0aCAmJiBpIDwgYi5sZW5ndGggJiYgYVtpXSA9PT0gYltpXSkgaSArPSAxO1xuXHRcdGlmIChnYXAgPT09IDApIHJldHVybiBhLnNsaWNlKGkgKyAxKSA9PT0gYi5zbGljZShpICsgMSkgfHwgKGFbaV0gPT09IGJbaSArIDFdICYmIGFbaSArIDFdID09PSBiW2ldICYmIGEuc2xpY2UoaSArIDIpID09PSBiLnNsaWNlKGkgKyAyKSk7XG5cdFx0cmV0dXJuIGdhcCA+IDAgPyBhLnNsaWNlKGkgKyAxKSA9PT0gYi5zbGljZShpKSA6IGIuc2xpY2UoaSArIDEpID09PSBhLnNsaWNlKGkpO1xuXHR9O1xuXG5cdGNvbnN0IHJhbmdlID0gKGZyb20sIGxlbmd0aCkgPT4gbmV3IFNldChBcnJheS5mcm9tKHsgbGVuZ3RoIH0sIChfLCBpKSA9PiBmcm9tICsgaSkpO1xuXG5cdC8qKlxuXHQgKiBIb3cgd2VsbCBhIHRlcm0gbWF0Y2hlczogMCBleGFjdCwgMSBwcmVmaXgsIDIgaW5zaWRlIHRoZSBuYW1lLCAzIGxldHRlcnMgaW4gb3JkZXJcblx0ICogKFwicXNhXCIgZmluZHMgcXVlcnlTZWxlY3RvckFsbCksIDQgb25lIHR5cG8gKDQrIGNoYXJhY3RlcnMpLCA1IHRoZSBkZWZpbml0aW9uLlxuXHQgKiBgbWFya3NgIGFyZSB0aGUgcG9zaXRpb25zIGluIHRoZSB0ZXJtJ3Mga2V5IHRvIGhpZ2hsaWdodC5cblx0ICogQHBhcmFtIHtUZXJtfSB0ZXJtXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSByYXcgdGhlIHF1ZXJ5IGFzIHR5cGVkXG5cdCAqIEByZXR1cm5zIHt7IHNjb3JlOiBudW1iZXIsIG1hcmtzOiBTZXQ8bnVtYmVyPnxudWxsIH18bnVsbH1cblx0ICovXG5cdGNvbnN0IG1hdGNoID0gKHRlcm0sIHJhdykgPT4ge1xuXHRcdGNvbnN0IHdhbnRlZCA9IGFsbnVtKHJhdyk7XG5cdFx0Y29uc3QgYXQgPSB0ZXJtLmtleS5pbmRleE9mKHdhbnRlZCk7XG5cdFx0aWYgKCF3YW50ZWQpIHJldHVybiBuYW1lcy5nZXQodGVybS5pZCkuaW5jbHVkZXMocmF3LnRvTG93ZXJDYXNlKCkpID8geyBzY29yZTogMiwgbWFya3M6IG51bGwgfSA6IG51bGw7XG5cdFx0aWYgKHRlcm0ua2V5ID09PSB3YW50ZWQpIHJldHVybiB7IHNjb3JlOiAwLCBtYXJrczogcmFuZ2UoMCwgd2FudGVkLmxlbmd0aCkgfTtcblx0XHRpZiAoYXQgPT09IDApIHJldHVybiB7IHNjb3JlOiAxLCBtYXJrczogcmFuZ2UoMCwgd2FudGVkLmxlbmd0aCkgfTtcblx0XHRpZiAoYXQgPiAwKSByZXR1cm4geyBzY29yZTogMiwgbWFya3M6IHJhbmdlKGF0LCB3YW50ZWQubGVuZ3RoKSB9O1xuXHRcdGlmICh3YW50ZWQubGVuZ3RoID49IDMpIHtcblx0XHRcdGNvbnN0IG1hcmtzID0gbmV3IFNldCgpO1xuXHRcdFx0bGV0IGZyb20gPSAwO1xuXHRcdFx0Zm9yIChjb25zdCBjaGFyIG9mIHdhbnRlZCkge1xuXHRcdFx0XHRmcm9tID0gdGVybS5rZXkuaW5kZXhPZihjaGFyLCBmcm9tKTtcblx0XHRcdFx0aWYgKGZyb20gPCAwKSBicmVhaztcblx0XHRcdFx0bWFya3MuYWRkKGZyb20pO1xuXHRcdFx0XHRmcm9tICs9IDE7XG5cdFx0XHR9XG5cdFx0XHRpZiAobWFya3Muc2l6ZSA9PT0gd2FudGVkLmxlbmd0aCkgcmV0dXJuIHsgc2NvcmU6IDMsIG1hcmtzIH07XG5cdFx0fVxuXHRcdGlmICh3YW50ZWQubGVuZ3RoID49IDQgJiYgWzAsIDEsIC0xXS5zb21lKChleHRyYSkgPT4gbmVhcih3YW50ZWQsIHRlcm0ua2V5LnNsaWNlKDAsIHdhbnRlZC5sZW5ndGggKyBleHRyYSkpIHx8IG5lYXIod2FudGVkLCB0ZXJtLmtleSkpKSByZXR1cm4geyBzY29yZTogNCwgbWFya3M6IG51bGwgfTtcblx0XHRjb25zdCBsb3dlciA9IHJhdy50b0xvd2VyQ2FzZSgpO1xuXHRcdGNvbnN0IHRleHQgPSBkZWZpbml0aW9ucy5nZXQodGVybS5pZCk7XG5cdFx0Y29uc3QgZm91bmQgPSBsb3dlci5sZW5ndGggPj0gMyA/IHRleHQuaW5jbHVkZXMobG93ZXIpIDogbmV3IFJlZ0V4cChgXFxcXGIke2xvd2VyLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKX1cXFxcYmApLnRlc3QodGV4dCk7XG5cdFx0cmV0dXJuIGZvdW5kID8geyBzY29yZTogNSwgbWFya3M6IG51bGwgfSA6IG51bGw7XG5cdH07XG5cblx0LyoqIE1hdGNoZXMgZm9yIHRoZSBjdXJyZW50IHF1ZXJ5LCBvciBudWxsIHdpdGggbm8gcXVlcnkuIEByZXR1cm5zIHtNYXA8c3RyaW5nLCB7IHNjb3JlOiBudW1iZXIsIG1hcmtzOiBTZXQ8bnVtYmVyPnxudWxsIH0+fG51bGx9ICovXG5cdGNvbnN0IHNlYXJjaCA9ICgpID0+IHtcblx0XHRjb25zdCByYXcgPSBzdGF0ZS5xLnRyaW0oKTtcblx0XHRpZiAoIXJhdykgcmV0dXJuIG51bGw7XG5cdFx0Y29uc3QgaGl0cyA9IG5ldyBNYXAoKTtcblx0XHRmb3IgKGNvbnN0IHRlcm0gb2YgdGVybXMpIHtcblx0XHRcdGNvbnN0IGhpdCA9IG1hdGNoKHRlcm0sIHJhdyk7XG5cdFx0XHRpZiAoaGl0KSBoaXRzLnNldCh0ZXJtLmlkLCBoaXQpO1xuXHRcdH1cblx0XHRyZXR1cm4gaGl0cztcblx0fTtcblxuXHQvKiogQHR5cGUge01hcDxzdHJpbmcsIHsgc2NvcmU6IG51bWJlciwgbWFya3M6IFNldDxudW1iZXI+fG51bGwgfT58bnVsbH0gKi9cblx0bGV0IGhpdHMgPSBudWxsO1xuXHQvKiogQHR5cGUge1Rlcm1bXXxudWxsfSAqL1xuXHRsZXQgdmlldyA9IG51bGw7XG5cblx0Y29uc3QgcGFzc2VzID0gKHRlcm0sIHNraXApID0+ICghaGl0cyB8fCBoaXRzLmhhcyh0ZXJtLmlkKSkgJiYgRklMVEVSRUQuZXZlcnkoKGtpbmQpID0+IGtpbmQgPT09IHNraXAgfHwgaGFzQW55KHRlcm0sIGtpbmQpKTtcblxuXHQvKiogVGhlIHRlcm1zIGluIHZpZXc6IGZpbHRlcnMgYW5kIHNlYXJjaCB0b2dldGhlci4gKi9cblx0Y29uc3QgZmlsdGVyZWQgPSAoKSA9PiAodmlldyA/Pz0gdGVybXMuZmlsdGVyKCh0ZXJtKSA9PiBwYXNzZXModGVybSkpKTtcblxuXHQvKipcblx0ICogVGVybXMgcGVyIHRhZyBvZiBga2luZGAsIHVuZGVyIGV2ZXJ5IG90aGVyIHNlbGVjdGlvbiBhbmQgdGhlIHNlYXJjaC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGtpbmRcblx0ICogQHJldHVybnMge1RhZ1tdfVxuXHQgKi9cblx0Y29uc3QgY291bnRUYWdzID0gKGtpbmQpID0+IHtcblx0XHRjb25zdCBjb3VudHMgPSBuZXcgTWFwKCk7XG5cdFx0Zm9yIChjb25zdCB0ZXJtIG9mIHRlcm1zKSB7XG5cdFx0XHRpZiAoIXBhc3Nlcyh0ZXJtLCBraW5kKSkgY29udGludWU7XG5cdFx0XHRmb3IgKGNvbnN0IHRhZyBvZiB0ZXJtLnRhZ3Nba2luZF0pIGNvdW50cy5zZXQodGFnLmtleSwgKGNvdW50cy5nZXQodGFnLmtleSkgPz8gMCkgKyAxKTtcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGEudGFnc1traW5kXS5tYXAoKHRhZykgPT4gKHsgLi4udGFnLCBuOiBjb3VudHMuZ2V0KHRhZy5rZXkpID8/IDAgfSkpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBXcmFwIHRoZSBtYXRjaGVkIGNoYXJhY3RlcnMgb2YgYSB0ZXJtJ3MgSFRNTCBpbiA8bWFyaz47IHRoZSBIVE1MIGNvbWVzIGJhY2sgdW5jaGFuZ2VkIGlmIHRoZVxuXHQgKiBjaGFyYWN0ZXJzIGRvIG5vdCBsaW5lIHVwIHdpdGggdGhlIHRlcm0ncyBrZXkuXG5cdCAqIEBwYXJhbSB7VGVybX0gdGVybVxuXHQgKiBAcGFyYW0ge1NldDxudW1iZXI+fG51bGx8dW5kZWZpbmVkfSBtYXJrc1xuXHQgKi9cblx0Y29uc3QgaGlnaGxpZ2h0ID0gKHRlcm0sIG1hcmtzKSA9PiB7XG5cdFx0aWYgKCFtYXJrcykgcmV0dXJuIHRlcm0udGVybTtcblx0XHRjb25zdCBib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGVtcGxhdGVcIik7XG5cdFx0Ym94LmlubmVySFRNTCA9IHRlcm0udGVybTtcblx0XHRjb25zdCB3YWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGJveC5jb250ZW50LCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG5cdFx0Y29uc3Qgbm9kZXMgPSBbXTtcblx0XHR3aGlsZSAod2Fsa2VyLm5leHROb2RlKCkpIG5vZGVzLnB1c2god2Fsa2VyLmN1cnJlbnROb2RlKTtcblx0XHRsZXQgcG9zaXRpb24gPSAwO1xuXHRcdGNvbnN0IHBsYW5zID0gW107XG5cdFx0Zm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG5cdFx0XHRjb25zdCBwYXJ0cyA9IFtdO1xuXHRcdFx0Zm9yIChjb25zdCBjaGFyIG9mIG5vZGUuZGF0YSkge1xuXHRcdFx0XHRjb25zdCBmb2xkZWQgPSBhbG51bShjaGFyKTtcblx0XHRcdFx0aWYgKGZvbGRlZC5sZW5ndGggPiAxKSByZXR1cm4gdGVybS50ZXJtO1xuXHRcdFx0XHRjb25zdCBvbiA9IGZvbGRlZC5sZW5ndGggPT09IDEgJiYgbWFya3MuaGFzKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKGZvbGRlZC5sZW5ndGggPT09IDEpIHBvc2l0aW9uICs9IDE7XG5cdFx0XHRcdGlmIChwYXJ0cy5hdCgtMSk/Lm9uID09PSBvbikgcGFydHMuYXQoLTEpLnRleHQgKz0gY2hhcjtcblx0XHRcdFx0ZWxzZSBwYXJ0cy5wdXNoKHsgdGV4dDogY2hhciwgb24gfSk7XG5cdFx0XHR9XG5cdFx0XHRwbGFucy5wdXNoKFtub2RlLCBwYXJ0c10pO1xuXHRcdH1cblx0XHRpZiAocG9zaXRpb24gIT09IHRlcm0ua2V5Lmxlbmd0aCkgcmV0dXJuIHRlcm0udGVybTtcblx0XHRmb3IgKGNvbnN0IFtub2RlLCBwYXJ0c10gb2YgcGxhbnMpIHtcblx0XHRcdGlmICghcGFydHMuc29tZSgocGFydCkgPT4gcGFydC5vbikpIGNvbnRpbnVlO1xuXHRcdFx0Y29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0XHRmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcblx0XHRcdFx0aWYgKCFwYXJ0Lm9uKSBmcmFnbWVudC5hcHBlbmQocGFydC50ZXh0KTtcblx0XHRcdFx0ZWxzZSBmcmFnbWVudC5hcHBlbmQoT2JqZWN0LmFzc2lnbihkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibWFya1wiKSwgeyB0ZXh0Q29udGVudDogcGFydC50ZXh0IH0pKTtcblx0XHRcdH1cblx0XHRcdG5vZGUucmVwbGFjZVdpdGgoZnJhZ21lbnQpO1xuXHRcdH1cblx0XHRyZXR1cm4gYm94LmlubmVySFRNTDtcblx0fTtcblxuXHQvKipcblx0ICogR3JvdXAgdGVybXMgdW5kZXIgdGhlIGNob3NlbiBvcmRlcjogQSB0byBaICh0aGUgbG9hZGVyJ3MgcmFuayBhbmQgZ3JvdXBzKSBvciBhIHRhZyBraW5kLlxuXHQgKiBBIHRlcm0gd2l0aCBzZXZlcmFsIHRhZ3Mgb2YgYSBraW5kIGFwcGVhcnMgdW5kZXIgZWFjaC4gV2l0aCBhIHF1ZXJ5LCBhIGdyb3VwIGxpc3RzIGl0c1xuXHQgKiBiZXN0IG1hdGNoZXMgZmlyc3QuXG5cdCAqIEBwYXJhbSB7VGVybVtdfSBsaXN0XG5cdCAqL1xuXHRjb25zdCBncm91cHMgPSAobGlzdCkgPT4ge1xuXHRcdGNvbnN0IHNldHMgPSBbXTtcblx0XHRpZiAoc3RhdGUuYnkgPT09IFwiYXpcIikge1xuXHRcdFx0Y29uc3QgYnlMZXR0ZXIgPSBuZXcgTWFwKCk7XG5cdFx0XHRmb3IgKGNvbnN0IHRlcm0gb2YgWy4uLmxpc3RdLnNvcnQoKGEsIGIpID0+IGEuYXpPcmRlciAtIGIuYXpPcmRlcikpIHtcblx0XHRcdFx0aWYgKCFieUxldHRlci5oYXModGVybS5hekdyb3VwLmtleSkpIGJ5TGV0dGVyLnNldCh0ZXJtLmF6R3JvdXAua2V5LCB7IC4uLnRlcm0uYXpHcm91cCwgaXRlbXM6IFtdIH0pO1xuXHRcdFx0XHRieUxldHRlci5nZXQodGVybS5hekdyb3VwLmtleSkuaXRlbXMucHVzaCh0ZXJtKTtcblx0XHRcdH1cblx0XHRcdHNldHMucHVzaCguLi5ieUxldHRlci52YWx1ZXMoKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGJ5VGFnID0gbmV3IE1hcCgpO1xuXHRcdFx0Zm9yIChjb25zdCB0ZXJtIG9mIGxpc3QpIHtcblx0XHRcdFx0Zm9yIChjb25zdCB0YWcgb2YgdGVybS50YWdzW3N0YXRlLmJ5XSkge1xuXHRcdFx0XHRcdGlmICghYnlUYWcuaGFzKHRhZy5rZXkpKSBieVRhZy5zZXQodGFnLmtleSwgeyAuLi50YWcsIGl0ZW1zOiBbXSB9KTtcblx0XHRcdFx0XHRieVRhZy5nZXQodGFnLmtleSkuaXRlbXMucHVzaCh0ZXJtKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0c2V0cy5wdXNoKC4uLlsuLi5ieVRhZy52YWx1ZXMoKV0uc29ydCgoYSwgYikgPT4gYS5vcmRlciAtIGIub3JkZXIpKTtcblx0XHR9XG5cdFx0aWYgKGhpdHMpIGZvciAoY29uc3Qgc2V0IG9mIHNldHMpIHNldC5pdGVtcy5zb3J0KChhLCBiKSA9PiBoaXRzLmdldChhLmlkKS5zY29yZSAtIGhpdHMuZ2V0KGIuaWQpLnNjb3JlKTtcblx0XHRyZXR1cm4gc2V0cztcblx0fTtcblxuXHQvKipcblx0ICogQXJyb3cga2V5cyBtb3ZlIHRocm91Z2ggYSBncm91cCBvZiB0b2dnbGVzLCBzZWxlY3RpbmcgYXMgdGhleSBnby5cblx0ICogQHBhcmFtIHtIVE1MRWxlbWVudH0gY29udGFpbmVyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciB0aGUgdG9nZ2xlc1xuXHQgKiBAcGFyYW0geyhidXR0b246IEhUTUxFbGVtZW50KSA9PiB2b2lkfSBzZWxlY3Rcblx0ICogQHBhcmFtIHtib29sZWFufSBbd3JhcF0gd2hldGhlciB0aGUgZW5kcyBsb29wIHJvdW5kXG5cdCAqL1xuXHRjb25zdCByb3ZpbmcgPSAoY29udGFpbmVyLCBzZWxlY3Rvciwgc2VsZWN0LCB3cmFwID0gdHJ1ZSkgPT4ge1xuXHRcdGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZXZlbnQpID0+IHtcblx0XHRcdGNvbnN0IGJ1dHRvbnMgPSBbLi4uY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpXTtcblx0XHRcdGNvbnN0IGF0ID0gYnV0dG9ucy5pbmRleE9mKC8qKiBAdHlwZSB7SFRNTEVsZW1lbnR9ICovIChkb2N1bWVudC5hY3RpdmVFbGVtZW50KSk7XG5cdFx0XHRpZiAoYXQgPCAwKSByZXR1cm47XG5cdFx0XHRjb25zdCBzdGVwID0geyBBcnJvd1JpZ2h0OiAxLCBBcnJvd0Rvd246IDEsIEFycm93TGVmdDogLTEsIEFycm93VXA6IC0xIH1bZXZlbnQua2V5XTtcblx0XHRcdGNvbnN0IG1vdmVkID0gYXQgKyAoc3RlcCA/PyAwKTtcblx0XHRcdGNvbnN0IG5leHQgPSBldmVudC5rZXkgPT09IFwiSG9tZVwiID8gMCA6IGV2ZW50LmtleSA9PT0gXCJFbmRcIiA/IGJ1dHRvbnMubGVuZ3RoIC0gMSA6IHN0ZXAgPyAod3JhcCA/IChtb3ZlZCArIGJ1dHRvbnMubGVuZ3RoKSAlIGJ1dHRvbnMubGVuZ3RoIDogbW92ZWQpIDogLTE7XG5cdFx0XHRpZiAobmV4dCA8IDAgfHwgbmV4dCA+PSBidXR0b25zLmxlbmd0aCkgcmV0dXJuO1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGJ1dHRvbnNbbmV4dF0uZm9jdXMoKTtcblx0XHRcdHNlbGVjdChidXR0b25zW25leHRdKTtcblx0XHR9KTtcblx0fTtcblxuXHQvLyAtLS0tIENvbnRyb2xzLCBidWlsdCBvbmNlIGFuZCB1cGRhdGVkIGluIHBsYWNlIHNvIGZvY3VzIHN0YXlzIHB1dCAtLS0tXG5cblx0ZWxzLmJ5LmlubmVySFRNTCA9IGRpbXMubWFwKChbZGltLCB0ZXh0XSkgPT4gYDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHJvbGU9XCJyYWRpb1wiIGRhdGEtYnk9XCIke2RpbX1cIj4ke2VzYyh0ZXh0KX08L2J1dHRvbj5gKS5qb2luKFwiXCIpO1xuXHRlbHMuYnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdGNvbnN0IGJ1dHRvbiA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtYnldXCIpO1xuXHRcdGlmIChidXR0b24pIHNlbGVjdEJ5KGJ1dHRvbik7XG5cdH0pO1xuXHRyb3ZpbmcoZWxzLmJ5LCBcIltkYXRhLWJ5XVwiLCAoYnV0dG9uKSA9PiBzZWxlY3RCeShidXR0b24pKTtcblx0ZWxzLm1vZGVzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZXZlbnQpID0+IHtcblx0XHRjb25zdCBidXR0b24gPSBldmVudC50YXJnZXQuY2xvc2VzdChcIltkYXRhLW1vZGVdXCIpO1xuXHRcdGlmIChidXR0b24pIHNldE1vZGUoYnV0dG9uLmRhdGFzZXQubW9kZSk7XG5cdH0pO1xuXHRyb3ZpbmcoZWxzLm1vZGVzLCBcIltkYXRhLW1vZGVdXCIsIChidXR0b24pID0+IHNldE1vZGUoYnV0dG9uLmRhdGFzZXQubW9kZSksIGZhbHNlKTtcblxuXHQvKiogQHBhcmFtIHtIVE1MRWxlbWVudH0gYnV0dG9uICovXG5cdGZ1bmN0aW9uIHNlbGVjdEJ5KGJ1dHRvbikge1xuXHRcdHN0YXRlLmJ5ID0gYnV0dG9uLmRhdGFzZXQuYnk7XG5cdFx0cmVuZGVyKCk7XG5cdH1cblxuXHQvKiogQHR5cGUge01hcDxzdHJpbmcsIEhUTUxCdXR0b25FbGVtZW50Pn0gKi9cblx0Y29uc3QgY2hpcHMgPSBuZXcgTWFwKCk7XG5cdGZvciAoY29uc3Qga2luZCBvZiBGSUxURVJTKSB7XG5cdFx0Y29uc3Qgcm93ID0gcShgW2RhdGEtY2hpcHM9XCIke2tpbmR9XCJdYCk7XG5cdFx0Zm9yIChjb25zdCB0YWcgb2YgZGF0YS50YWdzW2tpbmRdKSB7XG5cdFx0XHRjb25zdCBjaGlwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcblx0XHRcdGNoaXAudHlwZSA9IFwiYnV0dG9uXCI7XG5cdFx0XHRjaGlwLmNsYXNzTmFtZSA9IFwiY2hpcFwiO1xuXHRcdFx0Y2hpcC5kYXRhc2V0LmtpbmQgPSBraW5kO1xuXHRcdFx0Y2hpcC5kYXRhc2V0LmtleSA9IHRhZy5rZXk7XG5cdFx0XHRjaGlwLmlubmVySFRNTCA9IGA8c3BhbiBjbGFzcz1cInRcIj4ke2VzYyh0YWcubGFiZWwpfTwvc3Bhbj48c3BhbiBjbGFzcz1cIm5cIj48L3NwYW4+YDtcblx0XHRcdGNoaXBzLnNldChgJHtraW5kfToke3RhZy5rZXl9YCwgY2hpcCk7XG5cdFx0XHRyb3cuYXBwZW5kKGNoaXApO1xuXHRcdH1cblx0XHRyb3cuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdFx0Y29uc3QgY2hpcCA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEta2V5XVwiKTtcblx0XHRcdGlmICghY2hpcCkgcmV0dXJuO1xuXHRcdFx0Y29uc3Qgc2V0ID0gc3RhdGUuZmlsdGVyc1traW5kXTtcblx0XHRcdGlmICghc2V0LmRlbGV0ZShjaGlwLmRhdGFzZXQua2V5KSkgc2V0LmFkZChjaGlwLmRhdGFzZXQua2V5KTtcblx0XHRcdHJlbmRlcigpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZWxzLnN0YXR1cy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGV2ZW50KSA9PiB7XG5cdFx0aWYgKCFldmVudC50YXJnZXQuY2xvc2VzdChcIltkYXRhLWNsZWFyXVwiKSkgcmV0dXJuO1xuXHRcdGZvciAoY29uc3Qga2luZCBvZiBGSUxURVJFRCkgc3RhdGUuZmlsdGVyc1traW5kXS5jbGVhcigpO1xuXHRcdHJlbmRlcigpO1xuXHRcdGVscy5zdW1tYXJ5LmZvY3VzKCk7XG5cdH0pO1xuXG5cdGVscy5waWxscy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGV2ZW50KSA9PiB7XG5cdFx0Y29uc3QgcGlsbCA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEta2V5XVwiKTtcblx0XHRpZiAoIXBpbGwpIHJldHVybjtcblx0XHRzdGF0ZS5maWx0ZXJzLm1lZXRpbmcuZGVsZXRlKHBpbGwuZGF0YXNldC5rZXkpO1xuXHRcdHJlbmRlcigpO1xuXHRcdChlbHMucGlsbHNSb3cuaGlkZGVuID8gZWxzLnN1bW1hcnkgOiBlbHMucGlsbHMucXVlcnlTZWxlY3RvcihcImJ1dHRvblwiKSk/LmZvY3VzKCk7XG5cdH0pO1xuXG5cdGxldCB0eXBpbmcgPSAwO1xuXHRlbHMucS5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKCkgPT4ge1xuXHRcdGNsZWFyVGltZW91dCh0eXBpbmcpO1xuXHRcdHR5cGluZyA9IHNldFRpbWVvdXQoKCkgPT4gc2V0UXVlcnkoZWxzLnEudmFsdWUpLCAxMDApO1xuXHR9KTtcblx0ZWxzLnEuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2ZW50KSA9PiB7XG5cdFx0aWYgKGV2ZW50LmtleSAhPT0gXCJFc2NhcGVcIiB8fCAhZWxzLnEudmFsdWUpIHJldHVybjtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHNldFF1ZXJ5KFwiXCIpO1xuXHR9KTtcblx0ZWxzLmNsZWFyUS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuXHRcdHNldFF1ZXJ5KFwiXCIpO1xuXHRcdGVscy5xLmZvY3VzKCk7XG5cdH0pO1xuXG5cdC8qKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgKi9cblx0ZnVuY3Rpb24gc2V0UXVlcnkodmFsdWUpIHtcblx0XHRjbGVhclRpbWVvdXQodHlwaW5nKTtcblx0XHRlbHMucS52YWx1ZSA9IHZhbHVlO1xuXHRcdHN0YXRlLnEgPSB2YWx1ZTtcblx0XHRyZW5kZXIoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbmRlckNvbnRyb2xzKCkge1xuXHRcdGZvciAoY29uc3QgYnV0dG9uIG9mIGVscy5ieS5jaGlsZHJlbikge1xuXHRcdFx0Y29uc3Qgb24gPSBidXR0b24uZGF0YXNldC5ieSA9PT0gc3RhdGUuYnk7XG5cdFx0XHRidXR0b24uc2V0QXR0cmlidXRlKFwiYXJpYS1jaGVja2VkXCIsIFN0cmluZyhvbikpO1xuXHRcdFx0YnV0dG9uLnRhYkluZGV4ID0gb24gPyAwIDogLTE7XG5cdFx0fVxuXHRcdGZvciAoY29uc3QgYnV0dG9uIG9mIGVscy5tb2Rlcy5jaGlsZHJlbikge1xuXHRcdFx0Y29uc3Qgb24gPSBidXR0b24uZGF0YXNldC5tb2RlID09PSBzdGF0ZS5tb2RlO1xuXHRcdFx0YnV0dG9uLnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgU3RyaW5nKG9uKSk7XG5cdFx0XHRidXR0b24udGFiSW5kZXggPSBvbiA/IDAgOiAtMTtcblx0XHR9XG5cdFx0Zm9yIChjb25zdCBraW5kIG9mIEZJTFRFUlMpIHtcblx0XHRcdGZvciAoY29uc3QgdGFnIG9mIGNvdW50VGFncyhraW5kKSkge1xuXHRcdFx0XHRjb25zdCBjaGlwID0gY2hpcHMuZ2V0KGAke2tpbmR9OiR7dGFnLmtleX1gKTtcblx0XHRcdFx0Y29uc3Qgb24gPSBzdGF0ZS5maWx0ZXJzW2tpbmRdLmhhcyh0YWcua2V5KTtcblx0XHRcdFx0Y2hpcC5zZXRBdHRyaWJ1dGUoXCJhcmlhLXByZXNzZWRcIiwgU3RyaW5nKG9uKSk7XG5cdFx0XHRcdGNoaXAuZGlzYWJsZWQgPSAhdGFnLm4gJiYgIW9uO1xuXHRcdFx0XHRjaGlwLnF1ZXJ5U2VsZWN0b3IoXCIublwiKS50ZXh0Q29udGVudCA9IFN0cmluZyh0YWcubik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNvbnN0IHBpbGxzID0gWy4uLnN0YXRlLmZpbHRlcnMubWVldGluZ10ubWFwKChrZXkpID0+IHRhZ3NPZi5tZWV0aW5nLmdldChrZXkpKTtcblx0XHRlbHMucGlsbHNSb3cuaGlkZGVuID0gIXBpbGxzLmxlbmd0aDtcblx0XHRlbHMucGlsbHMuaW5uZXJIVE1MID0gcGlsbHNcblx0XHRcdC5tYXAoKHRhZykgPT4gYDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2hpcCBwaWxsXCIgZGF0YS1raW5kPVwibWVldGluZ1wiIGRhdGEta2V5PVwiJHtlc2ModGFnLmtleSl9XCIgYXJpYS1sYWJlbD1cIlJlbW92ZSBjbGFzcyBtZWV0aW5nIGZpbHRlcjogJHtlc2ModGFnLmxhYmVsKX1cIj5DbGFzcyBtZWV0aW5nOiAke2VzYyh0YWcubGFiZWwpfTwvYnV0dG9uPmApXG5cdFx0XHQuam9pbihcIlwiKTtcblx0XHRlbHMuY2xlYXJRLmhpZGRlbiA9ICFzdGF0ZS5xO1xuXHRcdGNvbnN0IGFjdGl2ZSA9IEZJTFRFUkVELnJlZHVjZSgoc3VtLCBraW5kKSA9PiBzdW0gKyBzdGF0ZS5maWx0ZXJzW2tpbmRdLnNpemUsIDApO1xuXHRcdGVscy5zdW1tYXJ5LnRleHRDb250ZW50ID0gYEZpbHRlciBieSB0ZXN0IG9yICR7bGFiZWwudG9Mb3dlckNhc2UoKX0ke2FjdGl2ZSA/IGAgKCR7YWN0aXZlfSBvbilgIDogXCJcIn1gO1xuXHRcdGVscy5zdGF0dXMuaW5uZXJIVE1MID0gYCR7ZmlsdGVyZWQoKS5sZW5ndGh9IG9mICR7dGVybXMubGVuZ3RofSB0ZXJtcyR7YWN0aXZlID8gXCIgXHUwMEI3IDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBkYXRhLWNsZWFyPkNsZWFyIGZpbHRlcnM8L2J1dHRvbj5cIiA6IFwiXCJ9YDtcblx0XHRlbHMucmV2aWV3LmhpZGRlbiA9IHN0YXRlLm1vZGUgIT09IFwicmV2aWV3XCI7XG5cdFx0ZWxzLnN0dWR5LmhpZGRlbiA9IHN0YXRlLm1vZGUgIT09IFwic3R1ZHlcIjtcblx0fVxuXG5cdC8vIC0tLS0gUmV2aWV3IC0tLS1cblxuXHQvKiogQHBhcmFtIHtUZXJtfSB0ZXJtICovXG5cdGNvbnN0IHNsaWRlTGlua3MgPSAodGVybSkgPT5cblx0XHR0ZXJtLnRhdWdodC5tYXAoKHBsYWNlKSA9PiBgPGEgaHJlZj1cIiR7ZXNjKEJBU0UgKyBwbGFjZS5ocmVmLnNsaWNlKDEpKX1cIj5XZWVrICR7cGxhY2Uud2Vla30gXHUwMEI3ICR7ZXNjKHBsYWNlLndlZWtkYXkpfSwgc2xpZGUgJHtwbGFjZS5zbGlkZX08L2E+YCkuam9pbihcIlwiKSArXG5cdFx0KHRlcm0ucmVmID8gYDxhIGhyZWY9XCIke2VzYyh0ZXJtLnJlZi5ocmVmKX1cIj4ke2VzYyh0ZXJtLnJlZi5sYWJlbCl9PC9hPmAgOiBcIlwiKTtcblxuXHQvKiogQHBhcmFtIHtUZXJtfSB0ZXJtICovXG5cdGNvbnN0IHRhZ0xpc3QgPSAodGVybSkgPT5cblx0XHRgPHVsIGNsYXNzPVwidGFnc1wiIHJvbGU9XCJsaXN0XCI+JHtLSU5EUy5mbGF0TWFwKChraW5kKSA9PiB0ZXJtLnRhZ3Nba2luZF0ubWFwKCh0YWcpID0+IGA8bGkgZGF0YS1raW5kPVwiJHtraW5kfVwiPiR7ZXNjKHRhZy5sYWJlbCl9PC9saT5gKSkuam9pbihcIlwiKX08L3VsPmA7XG5cblx0ZnVuY3Rpb24gcmVuZGVyUmV2aWV3KCkge1xuXHRcdGNvbnN0IGxpc3QgPSBmaWx0ZXJlZCgpO1xuXHRcdGlmICghbGlzdC5sZW5ndGgpIHtcblx0XHRcdGVscy5yZXZpZXcuaW5uZXJIVE1MID0gXCI8ZGl2IGNsYXNzPVxcXCJlbXB0eVxcXCI+PHN0cm9uZz5ObyB0ZXJtcyBtYXRjaC48L3N0cm9uZz48c3Bhbj5DbGVhciB0aGUgc2VhcmNoIG9yIGEgZmlsdGVyIHRvIHNlZSBtb3JlLjwvc3Bhbj48L2Rpdj5cIjtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3Qgc2V0cyA9IGdyb3VwcyhsaXN0KTtcblx0XHRjb25zdCBpZCA9IChzZXQpID0+IGBnLSR7c3RhdGUuYnl9LSR7c2x1ZyhzZXQua2V5KX1gO1xuXHRcdGVscy5yZXZpZXcuaW5uZXJIVE1MID0gc2V0c1xuXHRcdFx0Lm1hcChcblx0XHRcdFx0KHNldCkgPT4gYDxzZWN0aW9uIGNsYXNzPVwiZ3JvdXBcIiBpZD1cIiR7aWQoc2V0KX1cIiR7c3RhdGUuYnkgPT09IFwiYXpcIiA/IFwiXCIgOiBgIGRhdGEta2luZD1cIiR7c3RhdGUuYnl9XCJgfSBhcmlhLWxhYmVsbGVkYnk9XCIke2lkKHNldCl9LWhcIj5cblx0XHRcdFx0PGgyIGNsYXNzPVwiaGVhZGluZ1wiIGlkPVwiJHtpZChzZXQpfS1oXCI+PHNwYW4gY2xhc3M9XCJuYW1lXCI+JHtlc2Moc2V0LmxhYmVsKX08L3NwYW4+PHNwYW4gY2xhc3M9XCJhc2lkZVwiPiR7c2V0LndoZW4gPyBgPHNwYW4gY2xhc3M9XCJ3aGVuXCI+JHtlc2Moc2V0LndoZW4pfTwvc3Bhbj5gIDogXCJcIn0ke3N0YXRlLmJ5ID09PSBcIm1lZXRpbmdcIiA/IGA8c3BhbiBjbGFzcz1cImRlY2tcIj4ke2VzYyhzZXQuZGVjayl9PC9zcGFuPmAgOiBcIlwifTxzcGFuIGNsYXNzPVwiY291bnRcIj4ke3NldC5pdGVtcy5sZW5ndGh9ICR7c2V0Lml0ZW1zLmxlbmd0aCA9PT0gMSA/IFwidGVybVwiIDogXCJ0ZXJtc1wifTwvc3Bhbj48L3NwYW4+PC9oMj5cblx0XHRcdFx0PGRsPiR7c2V0Lml0ZW1zXG5cdFx0XHRcdFx0Lm1hcChcblx0XHRcdFx0XHRcdCh0ZXJtKSA9PiBgPGRpdiBjbGFzcz1cImVudHJ5XCI+XG5cdFx0XHRcdFx0PGR0PjxzcGFuIGNsYXNzPVwidGVybVwiPiR7aGlnaGxpZ2h0KHRlcm0sIGhpdHM/LmdldCh0ZXJtLmlkKT8ubWFya3MpfTwvc3Bhbj4ke3Rlcm0uZ3JvdXAgPyBgPHNwYW4gY2xhc3M9XCJhcGktZ3JvdXBcIj4ke2VzYyh0ZXJtLmdyb3VwKX08L3NwYW4+YCA6IFwiXCJ9JHtzdGF0ZS5rbm93bi5oYXModGVybS5pZCkgPyBcIjxzcGFuIGNsYXNzPVxcXCJrbm93blxcXCI+XHUyNzEzIGtub3duPC9zcGFuPlwiIDogXCJcIn08L2R0PlxuXHRcdFx0XHRcdDxkZD4ke3Rlcm0uc2lnID8gYDxwIGNsYXNzPVwic2lnXCI+JHt0ZXJtLnNpZ308L3A+YCA6IFwiXCJ9PHAgY2xhc3M9XCJkZWZpbml0aW9uXCI+JHt0ZXJtLmRlZmluaXRpb259PC9wPiR7dGVybS5tZXRhID8gYDxwIGNsYXNzPVwibWV0YVwiPiR7dGVybS5tZXRhfTwvcD5gIDogXCJcIn0ke3Rlcm0uZXhhbXBsZSA/IGA8cCBjbGFzcz1cImV4YW1wbGVcIj48c3BhbiBjbGFzcz1cImxhYmVsXCI+RXhhbXBsZTwvc3Bhbj4gJHt0ZXJtLmV4YW1wbGV9PC9wPmAgOiBcIlwifSR7dGFnTGlzdCh0ZXJtKX08cCBjbGFzcz1cImxpbmtzXCI+JHtzbGlkZUxpbmtzKHRlcm0pfTwvcD48L2RkPlxuXHRcdFx0XHQ8L2Rpdj5gLFxuXHRcdFx0XHRcdClcblx0XHRcdFx0XHQuam9pbihcIlwiKX08L2RsPlxuXHRcdFx0PC9zZWN0aW9uPmAsXG5cdFx0XHQpXG5cdFx0XHQuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIC0tLS0gRmxhc2hjYXJkcyAtLS0tXG5cblx0LyoqIEBwYXJhbSB7VGVybX0gdGVybSAqL1xuXHRjb25zdCB0ZXJtUGFydCA9ICh0ZXJtKSA9PlxuXHRcdGA8ZGl2IGNsYXNzPVwiZnJvbnRcIj4ke3Rlcm0udGVybX0ke3Rlcm0uZ3JvdXAgPyBgPHNtYWxsPiR7ZXNjKHRlcm0uZ3JvdXApfTwvc21hbGw+YCA6IFwiXCJ9JHt0ZXJtLnNpZyA/IGA8c3BhbiBjbGFzcz1cInNpZ1wiPiR7dGVybS5zaWd9PC9zcGFuPmAgOiBcIlwifTwvZGl2PmA7XG5cdC8qKiBAcGFyYW0ge1Rlcm19IHRlcm0gKi9cblx0Y29uc3QgZGVmaW5pdGlvblBhcnQgPSAodGVybSkgPT4gYDxkaXYgY2xhc3M9XCJiYWNrXCI+PHAgY2xhc3M9XCJkZWZpbml0aW9uXCI+JHt0ZXJtLmRlZmluaXRpb259PC9wPjwvZGl2PmA7XG5cdC8qKiBAcGFyYW0ge1Rlcm19IHRlcm0gKi9cblx0Y29uc3QgcmVzdFBhcnQgPSAodGVybSkgPT5cblx0XHRgPGRpdiBjbGFzcz1cImJhY2tcIj4ke3Rlcm0ubWV0YSA/IGA8cCBjbGFzcz1cIm1ldGFcIj4ke3Rlcm0ubWV0YX08L3A+YCA6IFwiXCJ9JHt0ZXJtLmV4YW1wbGUgPyBgPHAgY2xhc3M9XCJleGFtcGxlXCI+PHNwYW4gY2xhc3M9XCJsYWJlbFwiPkV4YW1wbGU8L3NwYW4+ICR7dGVybS5leGFtcGxlfTwvcD5gIDogXCJcIn08cCBjbGFzcz1cImxpbmtzXCI+JHtzbGlkZUxpbmtzKHRlcm0pfTwvcD48L2Rpdj5gO1xuXG5cdC8qKiBWaXNpYmxlLCBpbiBSZXZpZXcgb3JkZXIsIG9uZSBjYXJkIHBlciB0ZXJtLCBtaW51cyB0aGUgb25lcyBrbm93bi4gKi9cblx0ZnVuY3Rpb24gc3RhcnRTdHVkeSgpIHtcblx0XHRjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuXHRcdGNvbnN0IHBvb2wgPSBbXTtcblx0XHRmb3IgKGNvbnN0IHNldCBvZiBncm91cHMoZmlsdGVyZWQoKSkpIHtcblx0XHRcdGZvciAoY29uc3QgdGVybSBvZiBzZXQuaXRlbXMpIHtcblx0XHRcdFx0aWYgKHNlZW4uaGFzKHRlcm0uaWQpIHx8IHN0YXRlLmtub3duLmhhcyh0ZXJtLmlkKSkgY29udGludWU7XG5cdFx0XHRcdHNlZW4uYWRkKHRlcm0uaWQpO1xuXHRcdFx0XHRwb29sLnB1c2godGVybSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChzdGF0ZS5zaHVmZmxlKSB7XG5cdFx0XHRmb3IgKGxldCBpID0gcG9vbC5sZW5ndGggLSAxOyBpID4gMDsgaSAtPSAxKSB7XG5cdFx0XHRcdGNvbnN0IGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKTtcblx0XHRcdFx0W3Bvb2xbaV0sIHBvb2xbal1dID0gW3Bvb2xbal0sIHBvb2xbaV1dO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRzdGF0ZS5kZWNrID0gcG9vbDtcblx0XHRzdGF0ZS5pZHggPSAwO1xuXHRcdHN0YXRlLnJldmVhbGVkID0gZmFsc2U7XG5cdFx0cmVuZGVyU3R1ZHkoXCIucmV2ZWFsXCIpO1xuXHR9XG5cblx0LyoqIEBwYXJhbSB7c3RyaW5nfSBbZm9jdXNdIHNlbGVjdG9yIHRvIGZvY3VzIGFmdGVyd2FyZDsgZGVmYXVsdCwgdGhlIGNvbnRyb2wgdGhhdCBoYWQgZm9jdXMgKi9cblx0ZnVuY3Rpb24gcmVuZGVyU3R1ZHkoZm9jdXMpIHtcblx0XHRjb25zdCBhY3QgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50Py5jbG9zZXN0Py4oXCJbZGF0YS1hY3RdXCIpPy5kYXRhc2V0LmFjdDtcblx0XHQvLyBNb3ZlIGZvY3VzIG9ubHkgd2hlbiB0aGUgcmVhZGVyIGlzIGFscmVhZHkgd29ya2luZyBpbiB0aGUgY2FyZHMuXG5cdFx0Y29uc3Qgd29ya2luZyA9IGVscy5zdHVkeS5jb250YWlucyhkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB8fCBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSBkb2N1bWVudC5ib2R5O1xuXHRcdGNvbnN0IHRvdGFsID0gZmlsdGVyZWQoKS5sZW5ndGg7XG5cdFx0Y29uc3Qga25vd25Db3VudCA9IGZpbHRlcmVkKCkuZmlsdGVyKCh0ZXJtKSA9PiBzdGF0ZS5rbm93bi5oYXModGVybS5pZCkpLmxlbmd0aDtcblx0XHRjb25zdCBjYXJkID0gc3RhdGUuZGVja1tzdGF0ZS5pZHhdO1xuXHRcdGNvbnN0IHRvcCA9IGA8ZGl2IGNsYXNzPVwic3R1ZHktdG9wXCI+PHNwYW4+JHtjYXJkID8gYENhcmQgJHtzdGF0ZS5pZHggKyAxfSBvZiAke3N0YXRlLmRlY2subGVuZ3RofWAgOiBgJHtzdGF0ZS5kZWNrLmxlbmd0aH0gdG8gc3R1ZHlgfSBcdTAwQjcgJHtrbm93bkNvdW50fSBvZiAke3RvdGFsfSBrbm93bjwvc3Bhbj5cblx0XHRcdDxkaXYgY2xhc3M9XCJvcHRzXCI+XG5cdFx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2hpcFwiIGRhdGEtYWN0PVwic2h1ZmZsZVwiIGFyaWEtcHJlc3NlZD1cIiR7c3RhdGUuc2h1ZmZsZX1cIj5TaHVmZmxlPC9idXR0b24+XG5cdFx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2hpcFwiIGRhdGEtYWN0PVwiZGlyZWN0aW9uXCIgYXJpYS1wcmVzc2VkPVwiJHtzdGF0ZS5kaXJlY3Rpb24gPT09IFwiZGVmXCJ9XCI+RGVmaW5pdGlvbiBmaXJzdDwvYnV0dG9uPlxuXHRcdFx0XHQke2tub3duQ291bnQgJiYgY2FyZCA/IFwiPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJjaGlwXFxcIiBkYXRhLWFjdD1cXFwicmVzZXRcXFwiPlJlc2V0IGtub3duPC9idXR0b24+XCIgOiBcIlwifVxuXHRcdFx0PC9kaXY+PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwibWV0ZXJcIiByb2xlPVwicHJvZ3Jlc3NiYXJcIiBhcmlhLWxhYmVsPVwiS25vd24gdGVybXNcIiBhcmlhLXZhbHVlbWluPVwiMFwiIGFyaWEtdmFsdWVtYXg9XCIke3RvdGFsfVwiIGFyaWEtdmFsdWVub3c9XCIke2tub3duQ291bnR9XCI+PGkgc3R5bGU9XCJpbmxpbmUtc2l6ZToke3RvdGFsID8gTWF0aC5yb3VuZCgoa25vd25Db3VudCAvIHRvdGFsKSAqIDEwMCkgOiAwfSVcIj48L2k+PC9kaXY+YDtcblxuXHRcdGxldCBodG1sO1xuXHRcdGlmICghdG90YWwpIHtcblx0XHRcdGh0bWwgPSBgJHt0b3B9PGRpdiBjbGFzcz1cImVtcHR5XCI+PHN0cm9uZz5ObyB0ZXJtcyBtYXRjaC48L3N0cm9uZz48c3Bhbj5DbGVhciB0aGUgc2VhcmNoIG9yIGEgZmlsdGVyIHRvIHN0dWR5IG1vcmUuPC9zcGFuPjwvZGl2PmA7XG5cdFx0fSBlbHNlIGlmICghY2FyZCkge1xuXHRcdFx0aHRtbCA9IGAke3RvcH08ZGl2IGNsYXNzPVwiZG9uZVwiPjxoMiBjbGFzcz1cImhlYWRpbmdcIj5Zb3Uga25vdyBldmVyeSBjYXJkIGluIHRoaXMgc2V0LjwvaDI+PHA+JHtrbm93bkNvdW50fSBvZiAke3RvdGFsfSBtYXJrZWQga25vd24uPC9wPjxkaXYgY2xhc3M9XCJ2ZXJkaWN0XCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Q9XCJhZ2FpblwiIGNsYXNzPVwicHJpbWFyeVwiPlN0YXJ0IG92ZXIgd2l0aCB0aGUgb25lcyBJIGtub3c8L2J1dHRvbj48L2Rpdj48L2Rpdj5gO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zdCB0ZXJtRmlyc3QgPSBzdGF0ZS5kaXJlY3Rpb24gPT09IFwidGVybVwiO1xuXHRcdFx0Y29uc3QgZnJvbnQgPSB0ZXJtRmlyc3QgPyB0ZXJtUGFydChjYXJkKSA6IGRlZmluaXRpb25QYXJ0KGNhcmQpO1xuXHRcdFx0Y29uc3QgYmFjayA9IHRlcm1GaXJzdCA/IGRlZmluaXRpb25QYXJ0KGNhcmQpIDogdGVybVBhcnQoY2FyZCk7XG5cdFx0XHRjb25zdCB0ZXN0cyA9IGNhcmQudGFncy50ZXN0Lm1hcCgodGFnKSA9PiBlc2ModGFnLmxhYmVsKSkuam9pbihcIiwgXCIpO1xuXHRcdFx0Y29uc3QgY2hhcHRlcnMgPSBjYXJkLnRhZ3MuY2hhcHRlci5zbGljZSgwLCAyKS5tYXAoKHRhZykgPT4gZXNjKHRhZy5sYWJlbCkpLmpvaW4oXCIsIFwiKTtcblx0XHRcdGh0bWwgPSBgJHt0b3B9XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjYXJkXCIgdGFiaW5kZXg9XCItMVwiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ0b3BcIj48c3BhbiBkYXRhLWtpbmQ9XCJ0ZXN0XCI+JHt0ZXN0c308L3NwYW4+PHNwYW4gZGF0YS1raW5kPVwiY2hhcHRlclwiPiR7Y2hhcHRlcnN9PC9zcGFuPjwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJjb250ZW50XCI+JHtzdGF0ZS5yZXZlYWxlZCA/IGZyb250ICsgYmFjayArIHJlc3RQYXJ0KGNhcmQpIDogZnJvbnR9PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImZvb3RcIj4ke3N0YXRlLnJldmVhbGVkID8gXCJcIiA6IGA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInJldmVhbCBwcmltYXJ5XCIgZGF0YS1hY3Q9XCJyZXZlYWxcIj5TaG93ICR7dGVybUZpcnN0ID8gXCJkZWZpbml0aW9uXCIgOiBcInRlcm1cIn08L2J1dHRvbj5gfTwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0JHtzdGF0ZS5yZXZlYWxlZCA/IFwiPGRpdiBjbGFzcz1cXFwidmVyZGljdFxcXCI+PGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJ5ZXNcXFwiIGRhdGEtYWN0PVxcXCJrbm93XFxcIj5JIGtub3cgdGhpczwvYnV0dG9uPjxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBkYXRhLWFjdD1cXFwibGF0ZXJcXFwiPlNob3cgbWUgYWdhaW4gbGF0ZXI8L2J1dHRvbj48L2Rpdj5cIiA6IFwiXCJ9XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJuYXZcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdD1cInByZXZcIiAke3N0YXRlLmlkeCA9PT0gMCA/IFwiZGlzYWJsZWRcIiA6IFwiXCJ9Plx1MjE5MCBQcmV2aW91czwvYnV0dG9uPjxzcGFuIGNsYXNzPVwiaGludFwiPlNwYWNlIHJldmVhbHMgXHUwMEI3IGFycm93cyBtb3ZlPC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0PVwibmV4dFwiICR7c3RhdGUuaWR4ID49IHN0YXRlLmRlY2subGVuZ3RoIC0gMSA/IFwiZGlzYWJsZWRcIiA6IFwiXCJ9Pk5leHQgXHUyMTkyPC9idXR0b24+PC9kaXY+YDtcblx0XHR9XG5cdFx0ZWxzLnN0dWR5LmlubmVySFRNTCA9IGh0bWw7XG5cblx0XHRpZiAod29ya2luZykge1xuXHRcdFx0Y29uc3QgdGFyZ2V0ID0gKGZvY3VzICYmIGVscy5zdHVkeS5xdWVyeVNlbGVjdG9yKGZvY3VzKSkgfHwgKGFjdCAmJiBlbHMuc3R1ZHkucXVlcnlTZWxlY3RvcihgW2RhdGEtYWN0PVwiJHthY3R9XCJdOm5vdCg6ZGlzYWJsZWQpYCkpO1xuXHRcdFx0KHRhcmdldCB8fCBlbHMuc3R1ZHkucXVlcnlTZWxlY3RvcihcIi5jYXJkXCIpIHx8IGVscy5zdHVkeS5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtYWN0XVwiKSk/LmZvY3VzKHsgcHJldmVudFNjcm9sbDogdHJ1ZSB9KTtcblx0XHR9XG5cblx0XHRlbHMuYW5ub3VuY2UudGV4dENvbnRlbnQgPSAhY2FyZFxuXHRcdFx0PyBcIlwiXG5cdFx0XHQ6IHN0YXRlLnJldmVhbGVkXG5cdFx0XHRcdD8gYERlZmluaXRpb24gc2hvd24gZm9yICR7Y2FyZC5wbGFpbn1gXG5cdFx0XHRcdDogYENhcmQgJHtzdGF0ZS5pZHggKyAxfSBvZiAke3N0YXRlLmRlY2subGVuZ3RofWA7XG5cdH1cblxuXHQvKiogQHBhcmFtIHtzdHJpbmd9IGFjdCAqL1xuXHRmdW5jdGlvbiBzdHVkeUFjdGlvbihhY3QpIHtcblx0XHRjb25zdCBjYXJkID0gc3RhdGUuZGVja1tzdGF0ZS5pZHhdO1xuXHRcdGlmIChhY3QgPT09IFwicmV2ZWFsXCIgJiYgY2FyZCAmJiAhc3RhdGUucmV2ZWFsZWQpIHtcblx0XHRcdHN0YXRlLnJldmVhbGVkID0gdHJ1ZTtcblx0XHRcdHJlbmRlclN0dWR5KFwiLnllc1wiKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKGFjdCA9PT0gXCJrbm93XCIgJiYgY2FyZCkge1xuXHRcdFx0c3RhdGUua25vd24uYWRkKGNhcmQuaWQpO1xuXHRcdFx0c2F2ZUtub3duKCk7XG5cdFx0XHRzdGF0ZS5kZWNrLnNwbGljZShzdGF0ZS5pZHgsIDEpO1xuXHRcdFx0c3RhdGUuaWR4ID0gTWF0aC5taW4oc3RhdGUuaWR4LCBNYXRoLm1heChzdGF0ZS5kZWNrLmxlbmd0aCAtIDEsIDApKTtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJsYXRlclwiICYmIGNhcmQpIHtcblx0XHRcdHN0YXRlLmRlY2sucHVzaCguLi5zdGF0ZS5kZWNrLnNwbGljZShzdGF0ZS5pZHgsIDEpKTtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJwcmV2XCIgJiYgc3RhdGUuaWR4ID4gMCkge1xuXHRcdFx0c3RhdGUuaWR4IC09IDE7XG5cdFx0fSBlbHNlIGlmIChhY3QgPT09IFwibmV4dFwiICYmIHN0YXRlLmlkeCA8IHN0YXRlLmRlY2subGVuZ3RoIC0gMSkge1xuXHRcdFx0c3RhdGUuaWR4ICs9IDE7XG5cdFx0fSBlbHNlIGlmIChhY3QgPT09IFwic2h1ZmZsZVwiKSB7XG5cdFx0XHRzdGF0ZS5zaHVmZmxlID0gIXN0YXRlLnNodWZmbGU7XG5cdFx0XHRzdGFydFN0dWR5KCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fSBlbHNlIGlmIChhY3QgPT09IFwiZGlyZWN0aW9uXCIpIHtcblx0XHRcdHN0YXRlLmRpcmVjdGlvbiA9IHN0YXRlLmRpcmVjdGlvbiA9PT0gXCJ0ZXJtXCIgPyBcImRlZlwiIDogXCJ0ZXJtXCI7XG5cdFx0fSBlbHNlIGlmIChhY3QgPT09IFwicmVzZXRcIiB8fCBhY3QgPT09IFwiYWdhaW5cIikge1xuXHRcdFx0Zm9yIChjb25zdCB0ZXJtIG9mIGZpbHRlcmVkKCkpIHN0YXRlLmtub3duLmRlbGV0ZSh0ZXJtLmlkKTtcblx0XHRcdHNhdmVLbm93bigpO1xuXHRcdFx0c3RhcnRTdHVkeSgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHN0YXRlLnJldmVhbGVkID0gZmFsc2U7XG5cdFx0cmVuZGVyU3R1ZHkoYWN0ID09PSBcImRpcmVjdGlvblwiID8gdW5kZWZpbmVkIDogXCIucmV2ZWFsXCIpO1xuXHR9XG5cblx0ZWxzLnN0dWR5LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZXZlbnQpID0+IHtcblx0XHRjb25zdCBidXR0b24gPSBldmVudC50YXJnZXQuY2xvc2VzdChcIltkYXRhLWFjdF1cIik7XG5cdFx0aWYgKGJ1dHRvbiAmJiAhYnV0dG9uLmRpc2FibGVkKSBzdHVkeUFjdGlvbihidXR0b24uZGF0YXNldC5hY3QpO1xuXHR9KTtcblxuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZXZlbnQpID0+IHtcblx0XHRpZiAoc3RhdGUubW9kZSAhPT0gXCJzdHVkeVwiIHx8IGV2ZW50LmFsdEtleSB8fCBldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXkpIHJldHVybjtcblx0XHRjb25zdCB0YXJnZXQgPSAvKiogQHR5cGUge0hUTUxFbGVtZW50fSAqLyAoZXZlbnQudGFyZ2V0KTtcblx0XHRpZiAodGFyZ2V0LmNsb3Nlc3QoXCJpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYSwgYSwgc3VtbWFyeSwgW3JvbGU9dGFiXSwgW3JvbGU9cmFkaW9dXCIpKSByZXR1cm47XG5cdFx0aWYgKGV2ZW50LmtleSA9PT0gXCIgXCIgfHwgZXZlbnQua2V5ID09PSBcIkVudGVyXCIpIHtcblx0XHRcdC8vIEEgZm9jdXNlZCBidXR0b24gYWxyZWFkeSBhY3RpdmF0ZXMgaXRzZWxmLlxuXHRcdFx0aWYgKHRhcmdldC5jbG9zZXN0KFwiYnV0dG9uXCIpKSByZXR1cm47XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0c3R1ZHlBY3Rpb24oXCJyZXZlYWxcIik7XG5cdFx0fSBlbHNlIGlmIChldmVudC5rZXkgPT09IFwiQXJyb3dSaWdodFwiKSB7XG5cdFx0XHRzdHVkeUFjdGlvbihcIm5leHRcIik7XG5cdFx0fSBlbHNlIGlmIChldmVudC5rZXkgPT09IFwiQXJyb3dMZWZ0XCIpIHtcblx0XHRcdHN0dWR5QWN0aW9uKFwicHJldlwiKTtcblx0XHR9XG5cdH0sIHsgc2lnbmFsIH0pO1xuXG5cdC8vIC0tLS0gTW9kZSBhbmQgVVJMIC0tLS1cblxuXHQvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1vZGUgXCJyZXZpZXdcIiBvciBcInN0dWR5XCJcblx0ICovXG5cdGZ1bmN0aW9uIHNldE1vZGUobW9kZSkge1xuXHRcdGlmIChtb2RlID09PSBzdGF0ZS5tb2RlKSByZXR1cm47XG5cdFx0c3RhdGUubW9kZSA9IG1vZGU7XG5cdFx0cmVuZGVyKCk7XG5cdH1cblxuXHQvKiogQW4gb2xkIGAjc3R1ZHlgIGxpbmsgc3RpbGwgb3BlbnMgRmxhc2hjYXJkcy4gKi9cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJoYXNoY2hhbmdlXCIsICgpID0+IHtcblx0XHRpZiAobG9jYXRpb24uaGFzaCA9PT0gXCIjc3R1ZHlcIikgc2V0TW9kZShcInN0dWR5XCIpO1xuXHR9LCB7IHNpZ25hbCB9KTtcblxuXHQvKiogS2VlcCB0aGUgbGluayBpbiBzdGVwIHdpdGggdGhlIHN0YXRlOiBvbmx5IG5vbi1kZWZhdWx0IHZhbHVlcywgcmVwbGFjZWQsIG5ldmVyIHB1c2hlZC4gKi9cblx0ZnVuY3Rpb24gd3JpdGVVcmwoKSB7XG5cdFx0Y29uc3QgbmV4dCA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKTtcblx0XHRmb3IgKGNvbnN0IG5hbWUgb2YgUEFSQU1TKSBuZXh0LmRlbGV0ZShuYW1lKTtcblx0XHRpZiAoc3RhdGUubW9kZSA9PT0gXCJzdHVkeVwiKSBuZXh0LnNldChcIm1vZGVcIiwgXCJzdHVkeVwiKTtcblx0XHRpZiAoc3RhdGUuYnkgIT09IFwiYXpcIikgbmV4dC5zZXQoXCJncm91cFwiLCBzdGF0ZS5ieSA9PT0gXCJjaGFwdGVyXCIgPyBcInJlYWRpbmdcIiA6IHN0YXRlLmJ5KTtcblx0XHRjb25zdCBrZXlzID0gKGtpbmQpID0+IFsuLi5zdGF0ZS5maWx0ZXJzW2tpbmRdXS5tYXAoKGtleSkgPT4gKGtpbmQgPT09IFwidGVzdFwiID8ga2V5LnJlcGxhY2UoL150ZXN0LS8sIFwiXCIpIDoga2luZCA9PT0gXCJjaGFwdGVyXCIgPyBzbHVnKGtleSkgOiBrZXkpKTtcblx0XHRpZiAoc3RhdGUuZmlsdGVycy50ZXN0LnNpemUpIG5leHQuc2V0KFwidGVzdFwiLCBrZXlzKFwidGVzdFwiKS5qb2luKFwiLFwiKSk7XG5cdFx0aWYgKHN0YXRlLmZpbHRlcnMuY2hhcHRlci5zaXplKSBuZXh0LnNldChcInJlYWRpbmdcIiwga2V5cyhcImNoYXB0ZXJcIikuam9pbihcIixcIikpO1xuXHRcdGlmIChzdGF0ZS5maWx0ZXJzLm1lZXRpbmcuc2l6ZSkgbmV4dC5zZXQoXCJtZWV0aW5nXCIsIGtleXMoXCJtZWV0aW5nXCIpLmpvaW4oXCIsXCIpKTtcblx0XHRpZiAoc3RhdGUucS50cmltKCkpIG5leHQuc2V0KFwicVwiLCBzdGF0ZS5xKTtcblx0XHRjb25zdCBxdWVyeSA9IG5leHQudG9TdHJpbmcoKS5yZXBsYWNlKC8lMkMvZywgXCIsXCIpO1xuXHRcdGNvbnN0IGhhc2ggPSBsb2NhdGlvbi5oYXNoID09PSBcIiNzdHVkeVwiID8gXCJcIiA6IGxvY2F0aW9uLmhhc2g7XG5cdFx0Y29uc3QgdXJsID0gbG9jYXRpb24ucGF0aG5hbWUgKyAocXVlcnkgPyBgPyR7cXVlcnl9YCA6IFwiXCIpICsgaGFzaDtcblx0XHRpZiAodXJsICE9PSBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaCArIGxvY2F0aW9uLmhhc2gpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsIFwiXCIsIHVybCk7XG5cdFx0XHR9IGNhdGNoIHtcblx0XHRcdFx0Ly8gQSBzYW5kYm94ZWQgZnJhbWU6IHRoZSBsaW5rIGp1c3Qgd29uJ3QgZm9sbG93IHRoZSBzdGF0ZS5cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0aGl0cyA9IHNlYXJjaCgpO1xuXHRcdHZpZXcgPSBudWxsO1xuXHRcdHJlbmRlckNvbnRyb2xzKCk7XG5cdFx0cmVuZGVyUmV2aWV3KCk7XG5cdFx0aWYgKHN0YXRlLm1vZGUgPT09IFwic3R1ZHlcIikgc3RhcnRTdHVkeSgpO1xuXHRcdHdyaXRlVXJsKCk7XG5cdH1cblxuXHRlbHMucS52YWx1ZSA9IHN0YXRlLnE7XG5cdGlmIChGSUxURVJFRC5zb21lKChraW5kKSA9PiBwYXJhbXMuaGFzKGtpbmQgPT09IFwiY2hhcHRlclwiID8gXCJyZWFkaW5nXCIgOiBraW5kKSkpIGVscy5kZXRhaWxzLm9wZW4gPSB0cnVlO1xuXHRyZW5kZXIoKTtcblx0cm9vdC5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtc3RhdGljXVwiKT8ucmVtb3ZlKCk7XG5cdGFwcC5oaWRkZW4gPSBmYWxzZTtcbn1cblxuLyoqIFRoZSBnbG9zc2FyeSdzIGVsZW1lbnQ6IG1vdW50cyBvbmNlIHdoZW4gaXQgam9pbnMgdGhlIHBhZ2UsIGFuZCBsZXRzIGdvIHdoZW4gaXQgbGVhdmVzLiAqL1xuY2xhc3MgR2xvc3NhcnlBcHAgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cdCNhYm9ydCA9IG51bGw7XG5cblx0Y29ubmVjdGVkQ2FsbGJhY2soKSB7XG5cdFx0aWYgKHRoaXMuI2Fib3J0KSByZXR1cm47XG5cdFx0dGhpcy4jYWJvcnQgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG5cdFx0bW91bnQodGhpcywgdGhpcy4jYWJvcnQuc2lnbmFsKTtcblx0fVxuXG5cdGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuXHRcdHRoaXMuI2Fib3J0Py5hYm9ydCgpO1xuXHRcdHRoaXMuI2Fib3J0ID0gbnVsbDtcblx0fVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldChcImdsb3NzYXJ5LWFwcFwiKSkgY3VzdG9tRWxlbWVudHMuZGVmaW5lKFwiZ2xvc3NhcnktYXBwXCIsIEdsb3NzYXJ5QXBwKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUEwQ0EsSUFBTSxRQUFRLENBQUMsUUFBUSxXQUFXLFdBQVcsT0FBTztBQUVwRCxJQUFNLFVBQVUsQ0FBQyxRQUFRLFNBQVM7QUFFbEMsSUFBTSxXQUFXLENBQUMsUUFBUSxXQUFXLFNBQVM7QUFDOUMsSUFBTSxTQUFTLENBQUMsUUFBUSxTQUFTLFFBQVEsV0FBVyxXQUFXLEdBQUc7QUFHbEUsSUFBTSxPQUFPLElBQUksSUFBSSxPQUFPLFlBQVksR0FBRyxFQUFFO0FBRzdDLElB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
