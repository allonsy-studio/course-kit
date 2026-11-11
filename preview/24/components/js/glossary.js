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
    els.status.innerHTML = `${active ? `Showing ${filtered().length} of ${terms.length} terms` : `${terms.length} terms`}${active ? ' \xB7 <button type="button" data-clear>Clear filters</button>' : ""}`;
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
					<dd>${term.sig ? `<p class="sig">${term.sig}</p>` : ""}<p class="definition">${term.definition}</p>${term.meta ? `<p class="meta">${term.meta}</p>` : ""}${term.example ? `<p class="example"><span class="label">Example</span> ${term.example}</p>` : ""}${tagList(term)}<p class="links">${term.taught.length || term.ref ? '<span class="label">Taught in</span>' : ""}${slideLinks(term)}</p></dd>
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvZ2xvc3NhcnkuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogVGhlIGNvdXJzZSBnbG9zc2FyeTogUmV2aWV3IGFuZCBGbGFzaGNhcmRzIG92ZXIgb25lIHRhZ2dlZCwgZmlsdGVyYWJsZSBsaXN0LlxuICpcbiAqIEVuaGFuY2VzIHRoZSBwbGFpbiBsaXN0IGA8Z2xvc3NhcnktcGFuZWw+YCByZW5kZXJzIG9uIHRoZSBzZXJ2ZXIuIEl0XG4gKiByZWFkcyB0aGUgdGVybXMgZnJvbSB0aGUgcGFnZSdzIEpTT04sIGJ1aWxkcyB0aGUgY29udHJvbHMsIGFuZCByZW1vdmVzIHRoZVxuICogc3RhdGljIGxpc3Qgb25jZSBpdCBoYXMgcmVuZGVyZWQuIFRoZSBwYWdlIG5ldmVyIHJlYWRzIHRoZSBjbG9jay4gVGhlIHF1ZXJ5XG4gKiBzdHJpbmcgKGBtb2RlYCwgYGdyb3VwYCwgYHRlc3RgLCBgcmVhZGluZ2AsIGBtZWV0aW5nYCwgYHFgKSBzZXRzIHRoZSBzdGFydGluZ1xuICogc3RhdGUgYW5kIGlzIGtlcHQgaW4gc3RlcCBhcyB0aGUgcmVhZGVyIGNoYW5nZXMgaXQuXG4gKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBUYWdcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBrZXlcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBsYWJlbFxuICogQHByb3BlcnR5IHtudW1iZXJ9IG9yZGVyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW3doZW5dIHRoZSBkYXRlIGZvciBkaXNwbGF5XG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2RlY2tdIGRlY2sgdGl0bGUgKG1lZXRpbmcpXG4gKiBAcHJvcGVydHkge251bWJlcn0gW25dIHRlcm1zIGNhcnJ5aW5nIHRoZSB0YWcgdW5kZXIgdGhlIG90aGVyIHJvdydzIGZpbHRlclxuICpcbiAqIEB0eXBlZGVmIHtvYmplY3R9IFBsYWNlXG4gKiBAcHJvcGVydHkge251bWJlcn0gd2Vla1xuICogQHByb3BlcnR5IHtudW1iZXJ9IHNsaWRlXG4gKiBAcHJvcGVydHkge3N0cmluZ30gd2Vla2RheVxuICogQHByb3BlcnR5IHtzdHJpbmd9IGhyZWZcbiAqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBUZXJtXG4gKiBAcHJvcGVydHkge3N0cmluZ30gaWRcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0ZXJtIEhUTUxcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBwbGFpblxuICogQHByb3BlcnR5IHtzdHJpbmd9IGtleSBsZXR0ZXJzIGFuZCBkaWdpdHMgb25seSwgbG93ZXJjYXNlZDogdGhlIHNvcnQgYW5kIHNlYXJjaCBrZXlcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBhek9yZGVyIHBvc2l0aW9uIGluIEEgdG8gWiBvcmRlciwgZnJvbSB0aGUgbG9hZGVyXG4gKiBAcHJvcGVydHkge3sga2V5OiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcgfX0gYXpHcm91cCBcIjAgdG8gOVwiLCBhIGxldHRlciBvciBcIlN5bWJvbHNcIlxuICogQHByb3BlcnR5IHtzdHJpbmd9IGdyb3VwXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZGVmaW5pdGlvbiBIVE1MXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZXhhbXBsZSBIVE1MXG4gKiBAcHJvcGVydHkge3N0cmluZ30gbWV0YSBIVE1MXG4gKiBAcHJvcGVydHkge3N0cmluZ30gc2lnIEhUTUxcbiAqIEBwcm9wZXJ0eSB7eyBsYWJlbDogc3RyaW5nLCBocmVmOiBzdHJpbmcgfXxudWxsfSByZWZcbiAqIEBwcm9wZXJ0eSB7UmVjb3JkPHN0cmluZywgVGFnW10+fSB0YWdzXG4gKiBAcHJvcGVydHkge1BsYWNlW119IHRhdWdodFxuICovXG5cbmNvbnN0IEtJTkRTID0gW1widGVzdFwiLCBcImNoYXB0ZXJcIiwgXCJtZWV0aW5nXCIsIFwidG9waWNcIl07XG4vKiogVGhlIHR3byBraW5kcyB3aXRoIGEgY2hpcCByb3cuICovXG5jb25zdCBGSUxURVJTID0gW1widGVzdFwiLCBcImNoYXB0ZXJcIl07XG4vKiogRXZlcnkga2luZCBhIGxpbmsgY2FuIGZpbHRlciBieTsgYG1lZXRpbmdgIGhhcyBhIHJlbW92YWJsZSBwaWxsIGluc3RlYWQgb2YgYSByb3cuICovXG5jb25zdCBGSUxURVJFRCA9IFtcInRlc3RcIiwgXCJjaGFwdGVyXCIsIFwibWVldGluZ1wiXTtcbmNvbnN0IFBBUkFNUyA9IFtcIm1vZGVcIiwgXCJncm91cFwiLCBcInRlc3RcIiwgXCJyZWFkaW5nXCIsIFwibWVldGluZ1wiLCBcInFcIl07XG5cbi8qKiBTaXRlIHJvb3QgKG9yIHRoZSBQYWdlcyBwYXRoIHByZWZpeCksIHRha2VuIGZyb20gd2hlcmUgdGhpcyBzY3JpcHQgaXMgc2VydmVkLiAqL1xuY29uc3QgQkFTRSA9IG5ldyBVUkwoXCIuLi9cIiwgaW1wb3J0Lm1ldGEudXJsKS5wYXRobmFtZTtcblxuLyoqIEBwYXJhbSB7dW5rbm93bn0gdGV4dCAqL1xuY29uc3QgZXNjID0gKHRleHQpID0+IFN0cmluZyh0ZXh0ID8/IFwiXCIpLnJlcGxhY2UoL1smPD5cIl0vZywgKGMpID0+ICh7IFwiJlwiOiBcIiZhbXA7XCIsIFwiPFwiOiBcIiZsdDtcIiwgXCI+XCI6IFwiJmd0O1wiLCAnXCInOiBcIiZxdW90O1wiIH0pW2NdKTtcblxuLyoqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0ICovXG5jb25zdCBzbHVnID0gKHRleHQpID0+IHRleHQudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV0rL2csIFwiLVwiKS5yZXBsYWNlKC9eLXwtJC9nLCBcIlwiKTtcblxuLyoqIGxvY2FsU3RvcmFnZSB0aGF0IG5ldmVyIHRocm93cyAocHJpdmF0ZSB3aW5kb3dzLCBibG9ja2VkIHN0b3JhZ2UpLiAqL1xuY29uc3Qgc3RvcmUgPSB7XG5cdC8qKiBAcGFyYW0ge3N0cmluZ30ga2V5ICovXG5cdGdldChrZXkpIHtcblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30ga2V5XG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuXHQgKi9cblx0c2V0KGtleSwgdmFsdWUpIHtcblx0XHR0cnkge1xuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCB2YWx1ZSk7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBQcm9ncmVzcyBqdXN0IHdvbid0IHBlcnNpc3QuXG5cdFx0fVxuXHR9LFxufTtcblxuLyoqXG4gKiBCdWlsZCB0aGUgZ2xvc3NhcnkncyBjb250cm9scyBpbnNpZGUgaXRzIGVsZW1lbnQsIGFuZCByZW1vdmUgdGhlIHN0YXRpYyBsaXN0LlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm9vdCB0aGUgYDxnbG9zc2FyeS1hcHA+YCBlbGVtZW50XG4gKiBAcGFyYW0ge0Fib3J0U2lnbmFsfSBzaWduYWwgZW5kcyB0aGUgcGFnZS1sZXZlbCBsaXN0ZW5lcnMgd2hlbiB0aGUgZWxlbWVudCBsZWF2ZXMgdGhlIHBhZ2VcbiAqL1xuZnVuY3Rpb24gbW91bnQocm9vdCwgc2lnbmFsKSB7XG5cdGNvbnN0IGFwcCA9IC8qKiBAdHlwZSB7SFRNTEVsZW1lbnQgfCBudWxsfSAqLyAocm9vdC5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtYXBwXVwiKSk7XG5cdGNvbnN0IHNvdXJjZSA9IHJvb3QucXVlcnlTZWxlY3Rvcignc2NyaXB0W3R5cGU9XCJhcHBsaWNhdGlvbi9qc29uXCJdJyk7XG5cdGlmICghYXBwIHx8ICFzb3VyY2UpIHJldHVybjtcblxuXHRjb25zdCBkYXRhID0gSlNPTi5wYXJzZShzb3VyY2UudGV4dENvbnRlbnQpO1xuXHRjb25zdCBsYWJlbCA9IGRhdGEucmVhZGluZ0xhYmVsO1xuXHRjb25zdCBkaW1zID0gW1xuXHRcdFtcImF6XCIsIFwiQSB0byBaXCJdLFxuXHRcdFtcInRlc3RcIiwgXCJUZXN0XCJdLFxuXHRcdFtcImNoYXB0ZXJcIiwgbGFiZWxdLFxuXHRcdFtcIm1lZXRpbmdcIiwgXCJDbGFzcyBtZWV0aW5nXCJdLFxuXHRdO1xuXG5cdGNvbnN0IHRhZ3NPZiA9IE9iamVjdC5mcm9tRW50cmllcyhLSU5EUy5tYXAoKGtpbmQpID0+IFtraW5kLCBuZXcgTWFwKGRhdGEudGFnc1traW5kXS5tYXAoKHRhZykgPT4gW3RhZy5rZXksIHRhZ10pKV0pKTtcblxuXHQvKiogQHR5cGUge1Rlcm1bXX0gKi9cblx0Y29uc3QgdGVybXMgPSBkYXRhLnRlcm1zLm1hcCgodGVybSkgPT4gKHtcblx0XHQuLi50ZXJtLFxuXHRcdHRhZ3M6IE9iamVjdC5mcm9tRW50cmllcyhLSU5EUy5tYXAoKGtpbmQpID0+IFtraW5kLCB0ZXJtLnRhZ3Nba2luZF0ubWFwKChrZXkpID0+IHRhZ3NPZltraW5kXS5nZXQoa2V5KSldKSksXG5cdH0pKTtcblxuXHQvLyAtLS0tIFRoZSBzdGFydGluZyBzdGF0ZSwgZnJvbSB0aGUgcXVlcnkgc3RyaW5nICh1bnRydXN0ZWQ6IG1hdGNoZWQgYWdhaW5zdCBrbm93biBrZXlzIG9ubHkpIC0tLS1cblxuXHRjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaCk7XG5cdGNvbnN0IGxpc3RPZiA9IChuYW1lKSA9PiBwYXJhbXMuZ2V0QWxsKG5hbWUpLmZsYXRNYXAoKHZhbHVlKSA9PiB2YWx1ZS5zcGxpdChcIixcIikpLm1hcCgodmFsdWUpID0+IHZhbHVlLnRyaW0oKS50b0xvd2VyQ2FzZSgpKS5maWx0ZXIoQm9vbGVhbik7XG5cdGNvbnN0IGxhc3ROdW1iZXIgPSAodGV4dCkgPT4gdGV4dC5tYXRjaCgvKFxcZCspXFxzKiQvKT8uWzFdO1xuXG5cdC8qKlxuXHQgKiBUaGUgdGFnIGtleXMgb2YgYGtpbmRgIHRoYXQgdGhlIHZhbHVlcyBuYW1lOiBhIGtleSwgaXRzIHNsdWcgb3IgbGFiZWwgc2x1ZywgYG5gIGZvciBgdGVzdC1uYCxcblx0ICogb3IgYSBiYXJlIG51bWJlciB3aGVyZSBhIGxhYmVsIGVuZHMgaW4gb25lLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30ga2luZFxuXHQgKiBAcGFyYW0ge3N0cmluZ1tdfSB2YWx1ZXNcblx0ICovXG5cdGNvbnN0IHJlc29sdmUgPSAoa2luZCwgdmFsdWVzKSA9PlxuXHRcdG5ldyBTZXQoXG5cdFx0XHRkYXRhLnRhZ3Nba2luZF1cblx0XHRcdFx0LmZpbHRlcigodGFnKSA9PlxuXHRcdFx0XHRcdHZhbHVlcy5zb21lKFxuXHRcdFx0XHRcdFx0KHZhbHVlKSA9PlxuXHRcdFx0XHRcdFx0XHR0YWcua2V5LnRvTG93ZXJDYXNlKCkgPT09IHZhbHVlIHx8XG5cdFx0XHRcdFx0XHRcdHNsdWcodGFnLmtleSkgPT09IHNsdWcodmFsdWUpIHx8XG5cdFx0XHRcdFx0XHRcdHNsdWcodGFnLmxhYmVsKSA9PT0gc2x1Zyh2YWx1ZSkgfHxcblx0XHRcdFx0XHRcdFx0KGtpbmQgPT09IFwidGVzdFwiICYmIHRhZy5rZXkgPT09IGB0ZXN0LSR7dmFsdWV9YCkgfHxcblx0XHRcdFx0XHRcdFx0KC9eXFxkKyQvLnRlc3QodmFsdWUpICYmIGxhc3ROdW1iZXIodGFnLmxhYmVsKSA9PT0gdmFsdWUpLFxuXHRcdFx0XHRcdCksXG5cdFx0XHRcdClcblx0XHRcdFx0Lm1hcCgodGFnKSA9PiB0YWcua2V5KSxcblx0XHQpO1xuXG5cdGNvbnN0IHN0YXJ0QnkgPSAoKCkgPT4ge1xuXHRcdGNvbnN0IHZhbHVlID0gcGFyYW1zLmdldChcImdyb3VwXCIpPy50cmltKCkudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAodmFsdWUgPT09IFwicmVhZGluZ1wiIHx8IHZhbHVlID09PSBsYWJlbC50b0xvd2VyQ2FzZSgpKSByZXR1cm4gXCJjaGFwdGVyXCI7XG5cdFx0cmV0dXJuIGRpbXMuc29tZSgoW2RpbV0pID0+IGRpbSA9PT0gdmFsdWUpID8gdmFsdWUgOiBcImF6XCI7XG5cdH0pKCk7XG5cdGNvbnN0IHN0YXJ0TW9kZSA9IFtcInN0dWR5XCIsIFwiZmxhc2hjYXJkc1wiXS5pbmNsdWRlcyhwYXJhbXMuZ2V0KFwibW9kZVwiKT8udG9Mb3dlckNhc2UoKSkgPyBcInN0dWR5XCIgOiBwYXJhbXMuZ2V0KFwibW9kZVwiKT8udG9Mb3dlckNhc2UoKSA9PT0gXCJyZXZpZXdcIiA/IFwicmV2aWV3XCIgOiBsb2NhdGlvbi5oYXNoID09PSBcIiNzdHVkeVwiID8gXCJzdHVkeVwiIDogXCJyZXZpZXdcIjtcblxuXHRjb25zdCBrbm93bktleSA9IGAke2RhdGEuY29kZS50b0xvd2VyQ2FzZSgpfS1nbG9zc2FyeS1rbm93bmA7XG5cdGNvbnN0IHN0YXRlID0ge1xuXHRcdGJ5OiBzdGFydEJ5LFxuXHRcdG1vZGU6IHN0YXJ0TW9kZSxcblx0XHRxOiBwYXJhbXMuZ2V0KFwicVwiKT8uc2xpY2UoMCwgMjAwKSA/PyBcIlwiLFxuXHRcdGZpbHRlcnM6IHsgdGVzdDogcmVzb2x2ZShcInRlc3RcIiwgbGlzdE9mKFwidGVzdFwiKSksIGNoYXB0ZXI6IHJlc29sdmUoXCJjaGFwdGVyXCIsIGxpc3RPZihcInJlYWRpbmdcIikpLCBtZWV0aW5nOiByZXNvbHZlKFwibWVldGluZ1wiLCBsaXN0T2YoXCJtZWV0aW5nXCIpKSB9LFxuXHRcdGtub3duOiBuZXcgU2V0KCksXG5cdFx0ZGVjazogLyoqIEB0eXBlIHtUZXJtW119ICovIChbXSksXG5cdFx0aWR4OiAwLFxuXHRcdHJldmVhbGVkOiBmYWxzZSxcblx0XHRkaXJlY3Rpb246IFwidGVybVwiLFxuXHRcdHNodWZmbGU6IGZhbHNlLFxuXHR9O1xuXG5cdHRyeSB7XG5cdFx0c3RhdGUua25vd24gPSBuZXcgU2V0KEpTT04ucGFyc2Uoc3RvcmUuZ2V0KGtub3duS2V5KSA/PyBcIltdXCIpKTtcblx0fSBjYXRjaCB7XG5cdFx0c3RhdGUua25vd24gPSBuZXcgU2V0KCk7XG5cdH1cblx0Y29uc3Qgc2F2ZUtub3duID0gKCkgPT4gc3RvcmUuc2V0KGtub3duS2V5LCBKU09OLnN0cmluZ2lmeShbLi4uc3RhdGUua25vd25dKSk7XG5cblx0YXBwLmlubmVySFRNTCA9IGBcblx0XHQ8ZGl2IGNsYXNzPVwiYmFyXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYmFyLWdyb3VwXCI+XG5cdFx0XHRcdDxzcGFuIGNsYXNzPVwibGFiZWxcIiBpZD1cImdsb3NzYXJ5LWJ5XCI+R3JvdXAgYnk8L3NwYW4+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzZWdcIiByb2xlPVwicmFkaW9ncm91cFwiIGFyaWEtbGFiZWxsZWRieT1cImdsb3NzYXJ5LWJ5XCIgZGF0YS1ieT48L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInNlZyBtb2Rlc1wiIHJvbGU9XCJ0YWJsaXN0XCIgYXJpYS1sYWJlbD1cIk1vZGVcIiBkYXRhLW1vZGVzPlxuXHRcdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiByb2xlPVwidGFiXCIgaWQ9XCJnbG9zc2FyeS10YWItcmV2aWV3XCIgYXJpYS1jb250cm9scz1cImdsb3NzYXJ5LXBhbmVsLXJldmlld1wiIGRhdGEtbW9kZT1cInJldmlld1wiPlJldmlldzwvYnV0dG9uPlxuXHRcdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiByb2xlPVwidGFiXCIgaWQ9XCJnbG9zc2FyeS10YWItc3R1ZHlcIiBhcmlhLWNvbnRyb2xzPVwiZ2xvc3NhcnktcGFuZWwtc3R1ZHlcIiBkYXRhLW1vZGU9XCJzdHVkeVwiPkZsYXNoY2FyZHM8L2J1dHRvbj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJzZWFyY2hcIj5cblx0XHRcdDxsYWJlbCBjbGFzcz1cImxhYmVsXCIgZm9yPVwiZ2xvc3NhcnktcVwiPlNlYXJjaCB0ZXJtczwvbGFiZWw+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiZmllbGRcIj5cblx0XHRcdFx0PGlucHV0IHR5cGU9XCJzZWFyY2hcIiBpZD1cImdsb3NzYXJ5LXFcIiBuYW1lPVwicVwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiIHNwZWxsY2hlY2s9XCJmYWxzZVwiIGRhdGEtcT5cblx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjbGVhci1zZWFyY2hcIiBkYXRhLWNsZWFyLXEgaGlkZGVuPkNsZWFyPHNwYW4gY2xhc3M9XCJzci1vbmx5XCI+IHNlYXJjaDwvc3Bhbj48L2J1dHRvbj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdDxkZXRhaWxzIGNsYXNzPVwiZmlsdGVyc1wiIGRhdGEtZmlsdGVycz5cblx0XHRcdDxzdW1tYXJ5IGRhdGEtc3VtbWFyeT48L3N1bW1hcnk+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiZmlsdGVyLXJvd3NcIj5cblx0XHRcdFx0JHtGSUxURVJTLm1hcChcblx0XHRcdFx0XHQoa2luZCkgPT4gYDxkaXYgY2xhc3M9XCJmaWx0ZXItcm93XCI+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJsYWJlbFwiIGlkPVwiZ2xvc3NhcnktZi0ke2tpbmR9XCI+JHtlc2Moa2luZCA9PT0gXCJ0ZXN0XCIgPyBcIlRlc3RcIiA6IGxhYmVsKX08L3NwYW4+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImNoaXBzXCIgcm9sZT1cImdyb3VwXCIgYXJpYS1sYWJlbGxlZGJ5PVwiZ2xvc3NhcnktZi0ke2tpbmR9XCIgZGF0YS1jaGlwcz1cIiR7a2luZH1cIj48L2Rpdj5cblx0XHRcdFx0PC9kaXY+YCxcblx0XHRcdFx0KS5qb2luKFwiXCIpfVxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiZmlsdGVyLXJvd1wiIGRhdGEtcGlsbHMtcm93IGhpZGRlbj5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImxhYmVsXCIgaWQ9XCJnbG9zc2FyeS1mLW1lZXRpbmdcIj5DbGFzcyBtZWV0aW5nPC9zcGFuPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGlwc1wiIHJvbGU9XCJncm91cFwiIGFyaWEtbGFiZWxsZWRieT1cImdsb3NzYXJ5LWYtbWVldGluZ1wiIGRhdGEtcGlsbHM+PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kZXRhaWxzPlxuXHRcdDxwIGNsYXNzPVwic3RhdHVzXCIgYXJpYS1saXZlPVwicG9saXRlXCIgZGF0YS1zdGF0dXM+PC9wPlxuXHRcdDxkaXYgcm9sZT1cInRhYnBhbmVsXCIgaWQ9XCJnbG9zc2FyeS1wYW5lbC1yZXZpZXdcIiBhcmlhLWxhYmVsbGVkYnk9XCJnbG9zc2FyeS10YWItcmV2aWV3XCIgZGF0YS1yZXZpZXc+PC9kaXY+XG5cdFx0PGRpdiByb2xlPVwidGFicGFuZWxcIiBpZD1cImdsb3NzYXJ5LXBhbmVsLXN0dWR5XCIgYXJpYS1sYWJlbGxlZGJ5PVwiZ2xvc3NhcnktdGFiLXN0dWR5XCIgY2xhc3M9XCJzdHVkeVwiIGRhdGEtc3R1ZHkgaGlkZGVuPjwvZGl2PlxuXHRcdDxwIGNsYXNzPVwic3Itb25seVwiIHJvbGU9XCJzdGF0dXNcIiBkYXRhLWFubm91bmNlPjwvcD5gO1xuXG5cdGNvbnN0IHEgPSAoc2VsZWN0b3IpID0+IGFwcC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcblx0Y29uc3QgZWxzID0ge1xuXHRcdGJ5OiBxKFwiW2RhdGEtYnldXCIpLFxuXHRcdG1vZGVzOiBxKFwiW2RhdGEtbW9kZXNdXCIpLFxuXHRcdHN1bW1hcnk6IHEoXCJbZGF0YS1zdW1tYXJ5XVwiKSxcblx0XHRkZXRhaWxzOiBxKFwiW2RhdGEtZmlsdGVyc11cIiksXG5cdFx0cTogcShcIltkYXRhLXFdXCIpLFxuXHRcdGNsZWFyUTogcShcIltkYXRhLWNsZWFyLXFdXCIpLFxuXHRcdHBpbGxzOiBxKFwiW2RhdGEtcGlsbHNdXCIpLFxuXHRcdHBpbGxzUm93OiBxKFwiW2RhdGEtcGlsbHMtcm93XVwiKSxcblx0XHRzdGF0dXM6IHEoXCJbZGF0YS1zdGF0dXNdXCIpLFxuXHRcdHJldmlldzogcShcIltkYXRhLXJldmlld11cIiksXG5cdFx0c3R1ZHk6IHEoXCJbZGF0YS1zdHVkeV1cIiksXG5cdFx0YW5ub3VuY2U6IHEoXCJbZGF0YS1hbm5vdW5jZV1cIiksXG5cdH07XG5cblx0LyoqIEBwYXJhbSB7VGVybX0gdGVybSBAcGFyYW0ge3N0cmluZ30ga2luZCAqL1xuXHRjb25zdCBoYXNBbnkgPSAodGVybSwga2luZCkgPT4gIXN0YXRlLmZpbHRlcnNba2luZF0uc2l6ZSB8fCB0ZXJtLnRhZ3Nba2luZF0uc29tZSgodGFnKSA9PiBzdGF0ZS5maWx0ZXJzW2tpbmRdLmhhcyh0YWcua2V5KSk7XG5cblx0Ly8gLS0tLSBTZWFyY2g6IHRoZSB0ZXJtIGZpcnN0IChmb3JnaXZpbmcpLCB0aGVuIHRoZSBkZWZpbml0aW9uIChwbGFpbiB3b3JkcykgLS0tLVxuXG5cdC8qKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBsZXR0ZXJzIGFuZCBkaWdpdHMgb25seSwgbG93ZXJjYXNlZCwgbm8gYWNjZW50cyAqL1xuXHRjb25zdCBhbG51bSA9ICh0ZXh0KSA9PiB0ZXh0Lm5vcm1hbGl6ZShcIk5GS0RcIikudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV0vZywgXCJcIik7XG5cblx0LyoqIEBwYXJhbSB7c3RyaW5nfSBodG1sICovXG5cdGNvbnN0IHRleHRPZiA9IChodG1sKSA9PiB7XG5cdFx0Y29uc3QgYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRlbXBsYXRlXCIpO1xuXHRcdGJveC5pbm5lckhUTUwgPSBodG1sO1xuXHRcdHJldHVybiBib3guY29udGVudC50ZXh0Q29udGVudC50b0xvd2VyQ2FzZSgpO1xuXHR9O1xuXG5cdGNvbnN0IGRlZmluaXRpb25zID0gbmV3IE1hcCh0ZXJtcy5tYXAoKHRlcm0pID0+IFt0ZXJtLmlkLCB0ZXh0T2YodGVybS5kZWZpbml0aW9uKV0pKTtcblx0Y29uc3QgbmFtZXMgPSBuZXcgTWFwKHRlcm1zLm1hcCgodGVybSkgPT4gW3Rlcm0uaWQsIHRleHRPZih0ZXJtLnRlcm0pXSkpO1xuXG5cdC8qKiBXaGV0aGVyIGBhYCBpcyBgYmAgd2l0aCBvbmUgbGV0dGVyIGFkZGVkLCBkcm9wcGVkLCBjaGFuZ2VkIG9yIHR3byBzd2FwcGVkLiAqL1xuXHRjb25zdCBuZWFyID0gKGEsIGIpID0+IHtcblx0XHRpZiAoYSA9PT0gYikgcmV0dXJuIHRydWU7XG5cdFx0Y29uc3QgZ2FwID0gYS5sZW5ndGggLSBiLmxlbmd0aDtcblx0XHRpZiAoTWF0aC5hYnMoZ2FwKSA+IDEpIHJldHVybiBmYWxzZTtcblx0XHRsZXQgaSA9IDA7XG5cdFx0d2hpbGUgKGkgPCBhLmxlbmd0aCAmJiBpIDwgYi5sZW5ndGggJiYgYVtpXSA9PT0gYltpXSkgaSArPSAxO1xuXHRcdGlmIChnYXAgPT09IDApIHJldHVybiBhLnNsaWNlKGkgKyAxKSA9PT0gYi5zbGljZShpICsgMSkgfHwgKGFbaV0gPT09IGJbaSArIDFdICYmIGFbaSArIDFdID09PSBiW2ldICYmIGEuc2xpY2UoaSArIDIpID09PSBiLnNsaWNlKGkgKyAyKSk7XG5cdFx0cmV0dXJuIGdhcCA+IDAgPyBhLnNsaWNlKGkgKyAxKSA9PT0gYi5zbGljZShpKSA6IGIuc2xpY2UoaSArIDEpID09PSBhLnNsaWNlKGkpO1xuXHR9O1xuXG5cdGNvbnN0IHJhbmdlID0gKGZyb20sIGxlbmd0aCkgPT4gbmV3IFNldChBcnJheS5mcm9tKHsgbGVuZ3RoIH0sIChfLCBpKSA9PiBmcm9tICsgaSkpO1xuXG5cdC8qKlxuXHQgKiBIb3cgd2VsbCBhIHRlcm0gbWF0Y2hlczogMCBleGFjdCwgMSBwcmVmaXgsIDIgaW5zaWRlIHRoZSBuYW1lLCAzIGxldHRlcnMgaW4gb3JkZXJcblx0ICogKFwicXNhXCIgZmluZHMgcXVlcnlTZWxlY3RvckFsbCksIDQgb25lIHR5cG8gKDQrIGNoYXJhY3RlcnMpLCA1IHRoZSBkZWZpbml0aW9uLlxuXHQgKiBgbWFya3NgIGFyZSB0aGUgcG9zaXRpb25zIGluIHRoZSB0ZXJtJ3Mga2V5IHRvIGhpZ2hsaWdodC5cblx0ICogQHBhcmFtIHtUZXJtfSB0ZXJtXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSByYXcgdGhlIHF1ZXJ5IGFzIHR5cGVkXG5cdCAqIEByZXR1cm5zIHt7IHNjb3JlOiBudW1iZXIsIG1hcmtzOiBTZXQ8bnVtYmVyPnxudWxsIH18bnVsbH1cblx0ICovXG5cdGNvbnN0IG1hdGNoID0gKHRlcm0sIHJhdykgPT4ge1xuXHRcdGNvbnN0IHdhbnRlZCA9IGFsbnVtKHJhdyk7XG5cdFx0Y29uc3QgYXQgPSB0ZXJtLmtleS5pbmRleE9mKHdhbnRlZCk7XG5cdFx0aWYgKCF3YW50ZWQpIHJldHVybiBuYW1lcy5nZXQodGVybS5pZCkuaW5jbHVkZXMocmF3LnRvTG93ZXJDYXNlKCkpID8geyBzY29yZTogMiwgbWFya3M6IG51bGwgfSA6IG51bGw7XG5cdFx0aWYgKHRlcm0ua2V5ID09PSB3YW50ZWQpIHJldHVybiB7IHNjb3JlOiAwLCBtYXJrczogcmFuZ2UoMCwgd2FudGVkLmxlbmd0aCkgfTtcblx0XHRpZiAoYXQgPT09IDApIHJldHVybiB7IHNjb3JlOiAxLCBtYXJrczogcmFuZ2UoMCwgd2FudGVkLmxlbmd0aCkgfTtcblx0XHRpZiAoYXQgPiAwKSByZXR1cm4geyBzY29yZTogMiwgbWFya3M6IHJhbmdlKGF0LCB3YW50ZWQubGVuZ3RoKSB9O1xuXHRcdGlmICh3YW50ZWQubGVuZ3RoID49IDMpIHtcblx0XHRcdGNvbnN0IG1hcmtzID0gbmV3IFNldCgpO1xuXHRcdFx0bGV0IGZyb20gPSAwO1xuXHRcdFx0Zm9yIChjb25zdCBjaGFyIG9mIHdhbnRlZCkge1xuXHRcdFx0XHRmcm9tID0gdGVybS5rZXkuaW5kZXhPZihjaGFyLCBmcm9tKTtcblx0XHRcdFx0aWYgKGZyb20gPCAwKSBicmVhaztcblx0XHRcdFx0bWFya3MuYWRkKGZyb20pO1xuXHRcdFx0XHRmcm9tICs9IDE7XG5cdFx0XHR9XG5cdFx0XHRpZiAobWFya3Muc2l6ZSA9PT0gd2FudGVkLmxlbmd0aCkgcmV0dXJuIHsgc2NvcmU6IDMsIG1hcmtzIH07XG5cdFx0fVxuXHRcdGlmICh3YW50ZWQubGVuZ3RoID49IDQgJiYgWzAsIDEsIC0xXS5zb21lKChleHRyYSkgPT4gbmVhcih3YW50ZWQsIHRlcm0ua2V5LnNsaWNlKDAsIHdhbnRlZC5sZW5ndGggKyBleHRyYSkpIHx8IG5lYXIod2FudGVkLCB0ZXJtLmtleSkpKSByZXR1cm4geyBzY29yZTogNCwgbWFya3M6IG51bGwgfTtcblx0XHRjb25zdCBsb3dlciA9IHJhdy50b0xvd2VyQ2FzZSgpO1xuXHRcdGNvbnN0IHRleHQgPSBkZWZpbml0aW9ucy5nZXQodGVybS5pZCk7XG5cdFx0Y29uc3QgZm91bmQgPSBsb3dlci5sZW5ndGggPj0gMyA/IHRleHQuaW5jbHVkZXMobG93ZXIpIDogbmV3IFJlZ0V4cChgXFxcXGIke2xvd2VyLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKX1cXFxcYmApLnRlc3QodGV4dCk7XG5cdFx0cmV0dXJuIGZvdW5kID8geyBzY29yZTogNSwgbWFya3M6IG51bGwgfSA6IG51bGw7XG5cdH07XG5cblx0LyoqIE1hdGNoZXMgZm9yIHRoZSBjdXJyZW50IHF1ZXJ5LCBvciBudWxsIHdpdGggbm8gcXVlcnkuIEByZXR1cm5zIHtNYXA8c3RyaW5nLCB7IHNjb3JlOiBudW1iZXIsIG1hcmtzOiBTZXQ8bnVtYmVyPnxudWxsIH0+fG51bGx9ICovXG5cdGNvbnN0IHNlYXJjaCA9ICgpID0+IHtcblx0XHRjb25zdCByYXcgPSBzdGF0ZS5xLnRyaW0oKTtcblx0XHRpZiAoIXJhdykgcmV0dXJuIG51bGw7XG5cdFx0Y29uc3QgaGl0cyA9IG5ldyBNYXAoKTtcblx0XHRmb3IgKGNvbnN0IHRlcm0gb2YgdGVybXMpIHtcblx0XHRcdGNvbnN0IGhpdCA9IG1hdGNoKHRlcm0sIHJhdyk7XG5cdFx0XHRpZiAoaGl0KSBoaXRzLnNldCh0ZXJtLmlkLCBoaXQpO1xuXHRcdH1cblx0XHRyZXR1cm4gaGl0cztcblx0fTtcblxuXHQvKiogQHR5cGUge01hcDxzdHJpbmcsIHsgc2NvcmU6IG51bWJlciwgbWFya3M6IFNldDxudW1iZXI+fG51bGwgfT58bnVsbH0gKi9cblx0bGV0IGhpdHMgPSBudWxsO1xuXHQvKiogQHR5cGUge1Rlcm1bXXxudWxsfSAqL1xuXHRsZXQgdmlldyA9IG51bGw7XG5cblx0Y29uc3QgcGFzc2VzID0gKHRlcm0sIHNraXApID0+ICghaGl0cyB8fCBoaXRzLmhhcyh0ZXJtLmlkKSkgJiYgRklMVEVSRUQuZXZlcnkoKGtpbmQpID0+IGtpbmQgPT09IHNraXAgfHwgaGFzQW55KHRlcm0sIGtpbmQpKTtcblxuXHQvKiogVGhlIHRlcm1zIGluIHZpZXc6IGZpbHRlcnMgYW5kIHNlYXJjaCB0b2dldGhlci4gKi9cblx0Y29uc3QgZmlsdGVyZWQgPSAoKSA9PiAodmlldyA/Pz0gdGVybXMuZmlsdGVyKCh0ZXJtKSA9PiBwYXNzZXModGVybSkpKTtcblxuXHQvKipcblx0ICogVGVybXMgcGVyIHRhZyBvZiBga2luZGAsIHVuZGVyIGV2ZXJ5IG90aGVyIHNlbGVjdGlvbiBhbmQgdGhlIHNlYXJjaC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGtpbmRcblx0ICogQHJldHVybnMge1RhZ1tdfVxuXHQgKi9cblx0Y29uc3QgY291bnRUYWdzID0gKGtpbmQpID0+IHtcblx0XHRjb25zdCBjb3VudHMgPSBuZXcgTWFwKCk7XG5cdFx0Zm9yIChjb25zdCB0ZXJtIG9mIHRlcm1zKSB7XG5cdFx0XHRpZiAoIXBhc3Nlcyh0ZXJtLCBraW5kKSkgY29udGludWU7XG5cdFx0XHRmb3IgKGNvbnN0IHRhZyBvZiB0ZXJtLnRhZ3Nba2luZF0pIGNvdW50cy5zZXQodGFnLmtleSwgKGNvdW50cy5nZXQodGFnLmtleSkgPz8gMCkgKyAxKTtcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGEudGFnc1traW5kXS5tYXAoKHRhZykgPT4gKHsgLi4udGFnLCBuOiBjb3VudHMuZ2V0KHRhZy5rZXkpID8/IDAgfSkpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBXcmFwIHRoZSBtYXRjaGVkIGNoYXJhY3RlcnMgb2YgYSB0ZXJtJ3MgSFRNTCBpbiA8bWFyaz47IHRoZSBIVE1MIGNvbWVzIGJhY2sgdW5jaGFuZ2VkIGlmIHRoZVxuXHQgKiBjaGFyYWN0ZXJzIGRvIG5vdCBsaW5lIHVwIHdpdGggdGhlIHRlcm0ncyBrZXkuXG5cdCAqIEBwYXJhbSB7VGVybX0gdGVybVxuXHQgKiBAcGFyYW0ge1NldDxudW1iZXI+fG51bGx8dW5kZWZpbmVkfSBtYXJrc1xuXHQgKi9cblx0Y29uc3QgaGlnaGxpZ2h0ID0gKHRlcm0sIG1hcmtzKSA9PiB7XG5cdFx0aWYgKCFtYXJrcykgcmV0dXJuIHRlcm0udGVybTtcblx0XHRjb25zdCBib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGVtcGxhdGVcIik7XG5cdFx0Ym94LmlubmVySFRNTCA9IHRlcm0udGVybTtcblx0XHRjb25zdCB3YWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGJveC5jb250ZW50LCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG5cdFx0Y29uc3Qgbm9kZXMgPSBbXTtcblx0XHR3aGlsZSAod2Fsa2VyLm5leHROb2RlKCkpIG5vZGVzLnB1c2god2Fsa2VyLmN1cnJlbnROb2RlKTtcblx0XHRsZXQgcG9zaXRpb24gPSAwO1xuXHRcdGNvbnN0IHBsYW5zID0gW107XG5cdFx0Zm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG5cdFx0XHRjb25zdCBwYXJ0cyA9IFtdO1xuXHRcdFx0Zm9yIChjb25zdCBjaGFyIG9mIG5vZGUuZGF0YSkge1xuXHRcdFx0XHRjb25zdCBmb2xkZWQgPSBhbG51bShjaGFyKTtcblx0XHRcdFx0aWYgKGZvbGRlZC5sZW5ndGggPiAxKSByZXR1cm4gdGVybS50ZXJtO1xuXHRcdFx0XHRjb25zdCBvbiA9IGZvbGRlZC5sZW5ndGggPT09IDEgJiYgbWFya3MuaGFzKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKGZvbGRlZC5sZW5ndGggPT09IDEpIHBvc2l0aW9uICs9IDE7XG5cdFx0XHRcdGlmIChwYXJ0cy5hdCgtMSk/Lm9uID09PSBvbikgcGFydHMuYXQoLTEpLnRleHQgKz0gY2hhcjtcblx0XHRcdFx0ZWxzZSBwYXJ0cy5wdXNoKHsgdGV4dDogY2hhciwgb24gfSk7XG5cdFx0XHR9XG5cdFx0XHRwbGFucy5wdXNoKFtub2RlLCBwYXJ0c10pO1xuXHRcdH1cblx0XHRpZiAocG9zaXRpb24gIT09IHRlcm0ua2V5Lmxlbmd0aCkgcmV0dXJuIHRlcm0udGVybTtcblx0XHRmb3IgKGNvbnN0IFtub2RlLCBwYXJ0c10gb2YgcGxhbnMpIHtcblx0XHRcdGlmICghcGFydHMuc29tZSgocGFydCkgPT4gcGFydC5vbikpIGNvbnRpbnVlO1xuXHRcdFx0Y29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0XHRmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcblx0XHRcdFx0aWYgKCFwYXJ0Lm9uKSBmcmFnbWVudC5hcHBlbmQocGFydC50ZXh0KTtcblx0XHRcdFx0ZWxzZSBmcmFnbWVudC5hcHBlbmQoT2JqZWN0LmFzc2lnbihkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibWFya1wiKSwgeyB0ZXh0Q29udGVudDogcGFydC50ZXh0IH0pKTtcblx0XHRcdH1cblx0XHRcdG5vZGUucmVwbGFjZVdpdGgoZnJhZ21lbnQpO1xuXHRcdH1cblx0XHRyZXR1cm4gYm94LmlubmVySFRNTDtcblx0fTtcblxuXHQvKipcblx0ICogR3JvdXAgdGVybXMgdW5kZXIgdGhlIGNob3NlbiBvcmRlcjogQSB0byBaICh0aGUgbG9hZGVyJ3MgcmFuayBhbmQgZ3JvdXBzKSBvciBhIHRhZyBraW5kLlxuXHQgKiBBIHRlcm0gd2l0aCBzZXZlcmFsIHRhZ3Mgb2YgYSBraW5kIGFwcGVhcnMgdW5kZXIgZWFjaC4gV2l0aCBhIHF1ZXJ5LCBhIGdyb3VwIGxpc3RzIGl0c1xuXHQgKiBiZXN0IG1hdGNoZXMgZmlyc3QuXG5cdCAqIEBwYXJhbSB7VGVybVtdfSBsaXN0XG5cdCAqL1xuXHRjb25zdCBncm91cHMgPSAobGlzdCkgPT4ge1xuXHRcdGNvbnN0IHNldHMgPSBbXTtcblx0XHRpZiAoc3RhdGUuYnkgPT09IFwiYXpcIikge1xuXHRcdFx0Y29uc3QgYnlMZXR0ZXIgPSBuZXcgTWFwKCk7XG5cdFx0XHRmb3IgKGNvbnN0IHRlcm0gb2YgWy4uLmxpc3RdLnNvcnQoKGEsIGIpID0+IGEuYXpPcmRlciAtIGIuYXpPcmRlcikpIHtcblx0XHRcdFx0aWYgKCFieUxldHRlci5oYXModGVybS5hekdyb3VwLmtleSkpIGJ5TGV0dGVyLnNldCh0ZXJtLmF6R3JvdXAua2V5LCB7IC4uLnRlcm0uYXpHcm91cCwgaXRlbXM6IFtdIH0pO1xuXHRcdFx0XHRieUxldHRlci5nZXQodGVybS5hekdyb3VwLmtleSkuaXRlbXMucHVzaCh0ZXJtKTtcblx0XHRcdH1cblx0XHRcdHNldHMucHVzaCguLi5ieUxldHRlci52YWx1ZXMoKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGJ5VGFnID0gbmV3IE1hcCgpO1xuXHRcdFx0Zm9yIChjb25zdCB0ZXJtIG9mIGxpc3QpIHtcblx0XHRcdFx0Zm9yIChjb25zdCB0YWcgb2YgdGVybS50YWdzW3N0YXRlLmJ5XSkge1xuXHRcdFx0XHRcdGlmICghYnlUYWcuaGFzKHRhZy5rZXkpKSBieVRhZy5zZXQodGFnLmtleSwgeyAuLi50YWcsIGl0ZW1zOiBbXSB9KTtcblx0XHRcdFx0XHRieVRhZy5nZXQodGFnLmtleSkuaXRlbXMucHVzaCh0ZXJtKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0c2V0cy5wdXNoKC4uLlsuLi5ieVRhZy52YWx1ZXMoKV0uc29ydCgoYSwgYikgPT4gYS5vcmRlciAtIGIub3JkZXIpKTtcblx0XHR9XG5cdFx0aWYgKGhpdHMpIGZvciAoY29uc3Qgc2V0IG9mIHNldHMpIHNldC5pdGVtcy5zb3J0KChhLCBiKSA9PiBoaXRzLmdldChhLmlkKS5zY29yZSAtIGhpdHMuZ2V0KGIuaWQpLnNjb3JlKTtcblx0XHRyZXR1cm4gc2V0cztcblx0fTtcblxuXHQvKipcblx0ICogQXJyb3cga2V5cyBtb3ZlIHRocm91Z2ggYSBncm91cCBvZiB0b2dnbGVzLCBzZWxlY3RpbmcgYXMgdGhleSBnby5cblx0ICogQHBhcmFtIHtIVE1MRWxlbWVudH0gY29udGFpbmVyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciB0aGUgdG9nZ2xlc1xuXHQgKiBAcGFyYW0geyhidXR0b246IEhUTUxFbGVtZW50KSA9PiB2b2lkfSBzZWxlY3Rcblx0ICogQHBhcmFtIHtib29sZWFufSBbd3JhcF0gd2hldGhlciB0aGUgZW5kcyBsb29wIHJvdW5kXG5cdCAqL1xuXHRjb25zdCByb3ZpbmcgPSAoY29udGFpbmVyLCBzZWxlY3Rvciwgc2VsZWN0LCB3cmFwID0gdHJ1ZSkgPT4ge1xuXHRcdGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZXZlbnQpID0+IHtcblx0XHRcdGNvbnN0IGJ1dHRvbnMgPSBbLi4uY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpXTtcblx0XHRcdGNvbnN0IGF0ID0gYnV0dG9ucy5pbmRleE9mKC8qKiBAdHlwZSB7SFRNTEVsZW1lbnR9ICovIChkb2N1bWVudC5hY3RpdmVFbGVtZW50KSk7XG5cdFx0XHRpZiAoYXQgPCAwKSByZXR1cm47XG5cdFx0XHRjb25zdCBzdGVwID0geyBBcnJvd1JpZ2h0OiAxLCBBcnJvd0Rvd246IDEsIEFycm93TGVmdDogLTEsIEFycm93VXA6IC0xIH1bZXZlbnQua2V5XTtcblx0XHRcdGNvbnN0IG1vdmVkID0gYXQgKyAoc3RlcCA/PyAwKTtcblx0XHRcdGNvbnN0IG5leHQgPSBldmVudC5rZXkgPT09IFwiSG9tZVwiID8gMCA6IGV2ZW50LmtleSA9PT0gXCJFbmRcIiA/IGJ1dHRvbnMubGVuZ3RoIC0gMSA6IHN0ZXAgPyAod3JhcCA/IChtb3ZlZCArIGJ1dHRvbnMubGVuZ3RoKSAlIGJ1dHRvbnMubGVuZ3RoIDogbW92ZWQpIDogLTE7XG5cdFx0XHRpZiAobmV4dCA8IDAgfHwgbmV4dCA+PSBidXR0b25zLmxlbmd0aCkgcmV0dXJuO1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGJ1dHRvbnNbbmV4dF0uZm9jdXMoKTtcblx0XHRcdHNlbGVjdChidXR0b25zW25leHRdKTtcblx0XHR9KTtcblx0fTtcblxuXHQvLyAtLS0tIENvbnRyb2xzLCBidWlsdCBvbmNlIGFuZCB1cGRhdGVkIGluIHBsYWNlIHNvIGZvY3VzIHN0YXlzIHB1dCAtLS0tXG5cblx0ZWxzLmJ5LmlubmVySFRNTCA9IGRpbXMubWFwKChbZGltLCB0ZXh0XSkgPT4gYDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHJvbGU9XCJyYWRpb1wiIGRhdGEtYnk9XCIke2RpbX1cIj4ke2VzYyh0ZXh0KX08L2J1dHRvbj5gKS5qb2luKFwiXCIpO1xuXHRlbHMuYnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdGNvbnN0IGJ1dHRvbiA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtYnldXCIpO1xuXHRcdGlmIChidXR0b24pIHNlbGVjdEJ5KGJ1dHRvbik7XG5cdH0pO1xuXHRyb3ZpbmcoZWxzLmJ5LCBcIltkYXRhLWJ5XVwiLCAoYnV0dG9uKSA9PiBzZWxlY3RCeShidXR0b24pKTtcblx0ZWxzLm1vZGVzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZXZlbnQpID0+IHtcblx0XHRjb25zdCBidXR0b24gPSBldmVudC50YXJnZXQuY2xvc2VzdChcIltkYXRhLW1vZGVdXCIpO1xuXHRcdGlmIChidXR0b24pIHNldE1vZGUoYnV0dG9uLmRhdGFzZXQubW9kZSk7XG5cdH0pO1xuXHRyb3ZpbmcoZWxzLm1vZGVzLCBcIltkYXRhLW1vZGVdXCIsIChidXR0b24pID0+IHNldE1vZGUoYnV0dG9uLmRhdGFzZXQubW9kZSksIGZhbHNlKTtcblxuXHQvKiogQHBhcmFtIHtIVE1MRWxlbWVudH0gYnV0dG9uICovXG5cdGZ1bmN0aW9uIHNlbGVjdEJ5KGJ1dHRvbikge1xuXHRcdHN0YXRlLmJ5ID0gYnV0dG9uLmRhdGFzZXQuYnk7XG5cdFx0cmVuZGVyKCk7XG5cdH1cblxuXHQvKiogQHR5cGUge01hcDxzdHJpbmcsIEhUTUxCdXR0b25FbGVtZW50Pn0gKi9cblx0Y29uc3QgY2hpcHMgPSBuZXcgTWFwKCk7XG5cdGZvciAoY29uc3Qga2luZCBvZiBGSUxURVJTKSB7XG5cdFx0Y29uc3Qgcm93ID0gcShgW2RhdGEtY2hpcHM9XCIke2tpbmR9XCJdYCk7XG5cdFx0Zm9yIChjb25zdCB0YWcgb2YgZGF0YS50YWdzW2tpbmRdKSB7XG5cdFx0XHRjb25zdCBjaGlwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcblx0XHRcdGNoaXAudHlwZSA9IFwiYnV0dG9uXCI7XG5cdFx0XHRjaGlwLmNsYXNzTmFtZSA9IFwiY2hpcFwiO1xuXHRcdFx0Y2hpcC5kYXRhc2V0LmtpbmQgPSBraW5kO1xuXHRcdFx0Y2hpcC5kYXRhc2V0LmtleSA9IHRhZy5rZXk7XG5cdFx0XHRjaGlwLmlubmVySFRNTCA9IGA8c3BhbiBjbGFzcz1cInRcIj4ke2VzYyh0YWcubGFiZWwpfTwvc3Bhbj48c3BhbiBjbGFzcz1cIm5cIj48L3NwYW4+YDtcblx0XHRcdGNoaXBzLnNldChgJHtraW5kfToke3RhZy5rZXl9YCwgY2hpcCk7XG5cdFx0XHRyb3cuYXBwZW5kKGNoaXApO1xuXHRcdH1cblx0XHRyb3cuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdFx0Y29uc3QgY2hpcCA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEta2V5XVwiKTtcblx0XHRcdGlmICghY2hpcCkgcmV0dXJuO1xuXHRcdFx0Y29uc3Qgc2V0ID0gc3RhdGUuZmlsdGVyc1traW5kXTtcblx0XHRcdGlmICghc2V0LmRlbGV0ZShjaGlwLmRhdGFzZXQua2V5KSkgc2V0LmFkZChjaGlwLmRhdGFzZXQua2V5KTtcblx0XHRcdHJlbmRlcigpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZWxzLnN0YXR1cy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGV2ZW50KSA9PiB7XG5cdFx0aWYgKCFldmVudC50YXJnZXQuY2xvc2VzdChcIltkYXRhLWNsZWFyXVwiKSkgcmV0dXJuO1xuXHRcdGZvciAoY29uc3Qga2luZCBvZiBGSUxURVJFRCkgc3RhdGUuZmlsdGVyc1traW5kXS5jbGVhcigpO1xuXHRcdHJlbmRlcigpO1xuXHRcdGVscy5zdW1tYXJ5LmZvY3VzKCk7XG5cdH0pO1xuXG5cdGVscy5waWxscy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGV2ZW50KSA9PiB7XG5cdFx0Y29uc3QgcGlsbCA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEta2V5XVwiKTtcblx0XHRpZiAoIXBpbGwpIHJldHVybjtcblx0XHRzdGF0ZS5maWx0ZXJzLm1lZXRpbmcuZGVsZXRlKHBpbGwuZGF0YXNldC5rZXkpO1xuXHRcdHJlbmRlcigpO1xuXHRcdChlbHMucGlsbHNSb3cuaGlkZGVuID8gZWxzLnN1bW1hcnkgOiBlbHMucGlsbHMucXVlcnlTZWxlY3RvcihcImJ1dHRvblwiKSk/LmZvY3VzKCk7XG5cdH0pO1xuXG5cdGxldCB0eXBpbmcgPSAwO1xuXHRlbHMucS5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKCkgPT4ge1xuXHRcdGNsZWFyVGltZW91dCh0eXBpbmcpO1xuXHRcdHR5cGluZyA9IHNldFRpbWVvdXQoKCkgPT4gc2V0UXVlcnkoZWxzLnEudmFsdWUpLCAxMDApO1xuXHR9KTtcblx0ZWxzLnEuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2ZW50KSA9PiB7XG5cdFx0aWYgKGV2ZW50LmtleSAhPT0gXCJFc2NhcGVcIiB8fCAhZWxzLnEudmFsdWUpIHJldHVybjtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHNldFF1ZXJ5KFwiXCIpO1xuXHR9KTtcblx0ZWxzLmNsZWFyUS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuXHRcdHNldFF1ZXJ5KFwiXCIpO1xuXHRcdGVscy5xLmZvY3VzKCk7XG5cdH0pO1xuXG5cdC8qKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgKi9cblx0ZnVuY3Rpb24gc2V0UXVlcnkodmFsdWUpIHtcblx0XHRjbGVhclRpbWVvdXQodHlwaW5nKTtcblx0XHRlbHMucS52YWx1ZSA9IHZhbHVlO1xuXHRcdHN0YXRlLnEgPSB2YWx1ZTtcblx0XHRyZW5kZXIoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbmRlckNvbnRyb2xzKCkge1xuXHRcdGZvciAoY29uc3QgYnV0dG9uIG9mIGVscy5ieS5jaGlsZHJlbikge1xuXHRcdFx0Y29uc3Qgb24gPSBidXR0b24uZGF0YXNldC5ieSA9PT0gc3RhdGUuYnk7XG5cdFx0XHRidXR0b24uc2V0QXR0cmlidXRlKFwiYXJpYS1jaGVja2VkXCIsIFN0cmluZyhvbikpO1xuXHRcdFx0YnV0dG9uLnRhYkluZGV4ID0gb24gPyAwIDogLTE7XG5cdFx0fVxuXHRcdGZvciAoY29uc3QgYnV0dG9uIG9mIGVscy5tb2Rlcy5jaGlsZHJlbikge1xuXHRcdFx0Y29uc3Qgb24gPSBidXR0b24uZGF0YXNldC5tb2RlID09PSBzdGF0ZS5tb2RlO1xuXHRcdFx0YnV0dG9uLnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgU3RyaW5nKG9uKSk7XG5cdFx0XHRidXR0b24udGFiSW5kZXggPSBvbiA/IDAgOiAtMTtcblx0XHR9XG5cdFx0Zm9yIChjb25zdCBraW5kIG9mIEZJTFRFUlMpIHtcblx0XHRcdGZvciAoY29uc3QgdGFnIG9mIGNvdW50VGFncyhraW5kKSkge1xuXHRcdFx0XHRjb25zdCBjaGlwID0gY2hpcHMuZ2V0KGAke2tpbmR9OiR7dGFnLmtleX1gKTtcblx0XHRcdFx0Y29uc3Qgb24gPSBzdGF0ZS5maWx0ZXJzW2tpbmRdLmhhcyh0YWcua2V5KTtcblx0XHRcdFx0Y2hpcC5zZXRBdHRyaWJ1dGUoXCJhcmlhLXByZXNzZWRcIiwgU3RyaW5nKG9uKSk7XG5cdFx0XHRcdGNoaXAuZGlzYWJsZWQgPSAhdGFnLm4gJiYgIW9uO1xuXHRcdFx0XHRjaGlwLnF1ZXJ5U2VsZWN0b3IoXCIublwiKS50ZXh0Q29udGVudCA9IFN0cmluZyh0YWcubik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNvbnN0IHBpbGxzID0gWy4uLnN0YXRlLmZpbHRlcnMubWVldGluZ10ubWFwKChrZXkpID0+IHRhZ3NPZi5tZWV0aW5nLmdldChrZXkpKTtcblx0XHRlbHMucGlsbHNSb3cuaGlkZGVuID0gIXBpbGxzLmxlbmd0aDtcblx0XHRlbHMucGlsbHMuaW5uZXJIVE1MID0gcGlsbHNcblx0XHRcdC5tYXAoKHRhZykgPT4gYDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2hpcCBwaWxsXCIgZGF0YS1raW5kPVwibWVldGluZ1wiIGRhdGEta2V5PVwiJHtlc2ModGFnLmtleSl9XCIgYXJpYS1sYWJlbD1cIlJlbW92ZSBjbGFzcyBtZWV0aW5nIGZpbHRlcjogJHtlc2ModGFnLmxhYmVsKX1cIj5DbGFzcyBtZWV0aW5nOiAke2VzYyh0YWcubGFiZWwpfTwvYnV0dG9uPmApXG5cdFx0XHQuam9pbihcIlwiKTtcblx0XHRlbHMuY2xlYXJRLmhpZGRlbiA9ICFzdGF0ZS5xO1xuXHRcdGNvbnN0IGFjdGl2ZSA9IEZJTFRFUkVELnJlZHVjZSgoc3VtLCBraW5kKSA9PiBzdW0gKyBzdGF0ZS5maWx0ZXJzW2tpbmRdLnNpemUsIDApO1xuXHRcdGVscy5zdW1tYXJ5LnRleHRDb250ZW50ID0gYEZpbHRlciBieSB0ZXN0IG9yICR7bGFiZWwudG9Mb3dlckNhc2UoKX0ke2FjdGl2ZSA/IGAgKCR7YWN0aXZlfSBvbilgIDogXCJcIn1gO1xuXHRcdGVscy5zdGF0dXMuaW5uZXJIVE1MID0gYCR7YWN0aXZlID8gYFNob3dpbmcgJHtmaWx0ZXJlZCgpLmxlbmd0aH0gb2YgJHt0ZXJtcy5sZW5ndGh9IHRlcm1zYCA6IGAke3Rlcm1zLmxlbmd0aH0gdGVybXNgfSR7YWN0aXZlID8gXCIgXHUwMEI3IDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBkYXRhLWNsZWFyPkNsZWFyIGZpbHRlcnM8L2J1dHRvbj5cIiA6IFwiXCJ9YDtcblx0XHRlbHMucmV2aWV3LmhpZGRlbiA9IHN0YXRlLm1vZGUgIT09IFwicmV2aWV3XCI7XG5cdFx0ZWxzLnN0dWR5LmhpZGRlbiA9IHN0YXRlLm1vZGUgIT09IFwic3R1ZHlcIjtcblx0fVxuXG5cdC8vIC0tLS0gUmV2aWV3IC0tLS1cblxuXHQvKiogQHBhcmFtIHtUZXJtfSB0ZXJtICovXG5cdGNvbnN0IHNsaWRlTGlua3MgPSAodGVybSkgPT5cblx0XHR0ZXJtLnRhdWdodC5tYXAoKHBsYWNlKSA9PiBgPGEgaHJlZj1cIiR7ZXNjKEJBU0UgKyBwbGFjZS5ocmVmLnNsaWNlKDEpKX1cIj5XZWVrICR7cGxhY2Uud2Vla30gXHUwMEI3ICR7ZXNjKHBsYWNlLndlZWtkYXkpfSwgc2xpZGUgJHtwbGFjZS5zbGlkZX08L2E+YCkuam9pbihcIlwiKSArXG5cdFx0KHRlcm0ucmVmID8gYDxhIGhyZWY9XCIke2VzYyh0ZXJtLnJlZi5ocmVmKX1cIj4ke2VzYyh0ZXJtLnJlZi5sYWJlbCl9PC9hPmAgOiBcIlwiKTtcblxuXHQvKiogQHBhcmFtIHtUZXJtfSB0ZXJtICovXG5cdGNvbnN0IHRhZ0xpc3QgPSAodGVybSkgPT5cblx0XHRgPHVsIGNsYXNzPVwidGFnc1wiIHJvbGU9XCJsaXN0XCI+JHtLSU5EUy5mbGF0TWFwKChraW5kKSA9PiB0ZXJtLnRhZ3Nba2luZF0ubWFwKCh0YWcpID0+IGA8bGkgZGF0YS1raW5kPVwiJHtraW5kfVwiPiR7ZXNjKHRhZy5sYWJlbCl9PC9saT5gKSkuam9pbihcIlwiKX08L3VsPmA7XG5cblx0ZnVuY3Rpb24gcmVuZGVyUmV2aWV3KCkge1xuXHRcdGNvbnN0IGxpc3QgPSBmaWx0ZXJlZCgpO1xuXHRcdGlmICghbGlzdC5sZW5ndGgpIHtcblx0XHRcdGVscy5yZXZpZXcuaW5uZXJIVE1MID0gXCI8ZGl2IGNsYXNzPVxcXCJlbXB0eVxcXCI+PHN0cm9uZz5ObyB0ZXJtcyBtYXRjaC48L3N0cm9uZz48c3Bhbj5DbGVhciB0aGUgc2VhcmNoIG9yIGEgZmlsdGVyIHRvIHNlZSBtb3JlLjwvc3Bhbj48L2Rpdj5cIjtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3Qgc2V0cyA9IGdyb3VwcyhsaXN0KTtcblx0XHRjb25zdCBpZCA9IChzZXQpID0+IGBnLSR7c3RhdGUuYnl9LSR7c2x1ZyhzZXQua2V5KX1gO1xuXHRcdGVscy5yZXZpZXcuaW5uZXJIVE1MID0gc2V0c1xuXHRcdFx0Lm1hcChcblx0XHRcdFx0KHNldCkgPT4gYDxzZWN0aW9uIGNsYXNzPVwiZ3JvdXBcIiBpZD1cIiR7aWQoc2V0KX1cIiR7c3RhdGUuYnkgPT09IFwiYXpcIiA/IFwiXCIgOiBgIGRhdGEta2luZD1cIiR7c3RhdGUuYnl9XCJgfSBhcmlhLWxhYmVsbGVkYnk9XCIke2lkKHNldCl9LWhcIj5cblx0XHRcdFx0PGgyIGNsYXNzPVwiaGVhZGluZ1wiIGlkPVwiJHtpZChzZXQpfS1oXCI+PHNwYW4gY2xhc3M9XCJuYW1lXCI+JHtlc2Moc2V0LmxhYmVsKX08L3NwYW4+PHNwYW4gY2xhc3M9XCJhc2lkZVwiPiR7c2V0LndoZW4gPyBgPHNwYW4gY2xhc3M9XCJ3aGVuXCI+JHtlc2Moc2V0LndoZW4pfTwvc3Bhbj5gIDogXCJcIn0ke3N0YXRlLmJ5ID09PSBcIm1lZXRpbmdcIiA/IGA8c3BhbiBjbGFzcz1cImRlY2tcIj4ke2VzYyhzZXQuZGVjayl9PC9zcGFuPmAgOiBcIlwifTxzcGFuIGNsYXNzPVwiY291bnRcIj4ke3NldC5pdGVtcy5sZW5ndGh9ICR7c2V0Lml0ZW1zLmxlbmd0aCA9PT0gMSA/IFwidGVybVwiIDogXCJ0ZXJtc1wifTwvc3Bhbj48L3NwYW4+PC9oMj5cblx0XHRcdFx0PGRsPiR7c2V0Lml0ZW1zXG5cdFx0XHRcdFx0Lm1hcChcblx0XHRcdFx0XHRcdCh0ZXJtKSA9PiBgPGRpdiBjbGFzcz1cImVudHJ5XCI+XG5cdFx0XHRcdFx0PGR0PjxzcGFuIGNsYXNzPVwidGVybVwiPiR7aGlnaGxpZ2h0KHRlcm0sIGhpdHM/LmdldCh0ZXJtLmlkKT8ubWFya3MpfTwvc3Bhbj4ke3Rlcm0uZ3JvdXAgPyBgPHNwYW4gY2xhc3M9XCJhcGktZ3JvdXBcIj4ke2VzYyh0ZXJtLmdyb3VwKX08L3NwYW4+YCA6IFwiXCJ9JHtzdGF0ZS5rbm93bi5oYXModGVybS5pZCkgPyBcIjxzcGFuIGNsYXNzPVxcXCJrbm93blxcXCI+XHUyNzEzIGtub3duPC9zcGFuPlwiIDogXCJcIn08L2R0PlxuXHRcdFx0XHRcdDxkZD4ke3Rlcm0uc2lnID8gYDxwIGNsYXNzPVwic2lnXCI+JHt0ZXJtLnNpZ308L3A+YCA6IFwiXCJ9PHAgY2xhc3M9XCJkZWZpbml0aW9uXCI+JHt0ZXJtLmRlZmluaXRpb259PC9wPiR7dGVybS5tZXRhID8gYDxwIGNsYXNzPVwibWV0YVwiPiR7dGVybS5tZXRhfTwvcD5gIDogXCJcIn0ke3Rlcm0uZXhhbXBsZSA/IGA8cCBjbGFzcz1cImV4YW1wbGVcIj48c3BhbiBjbGFzcz1cImxhYmVsXCI+RXhhbXBsZTwvc3Bhbj4gJHt0ZXJtLmV4YW1wbGV9PC9wPmAgOiBcIlwifSR7dGFnTGlzdCh0ZXJtKX08cCBjbGFzcz1cImxpbmtzXCI+JHt0ZXJtLnRhdWdodC5sZW5ndGggfHwgdGVybS5yZWYgPyBcIjxzcGFuIGNsYXNzPVxcXCJsYWJlbFxcXCI+VGF1Z2h0IGluPC9zcGFuPlwiIDogXCJcIn0ke3NsaWRlTGlua3ModGVybSl9PC9wPjwvZGQ+XG5cdFx0XHRcdDwvZGl2PmAsXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHRcdC5qb2luKFwiXCIpfTwvZGw+XG5cdFx0XHQ8L3NlY3Rpb24+YCxcblx0XHRcdClcblx0XHRcdC5qb2luKFwiXCIpO1xuXHR9XG5cblx0Ly8gLS0tLSBGbGFzaGNhcmRzIC0tLS1cblxuXHQvKiogQHBhcmFtIHtUZXJtfSB0ZXJtICovXG5cdGNvbnN0IHRlcm1QYXJ0ID0gKHRlcm0pID0+XG5cdFx0YDxkaXYgY2xhc3M9XCJmcm9udFwiPiR7dGVybS50ZXJtfSR7dGVybS5ncm91cCA/IGA8c21hbGw+JHtlc2ModGVybS5ncm91cCl9PC9zbWFsbD5gIDogXCJcIn0ke3Rlcm0uc2lnID8gYDxzcGFuIGNsYXNzPVwic2lnXCI+JHt0ZXJtLnNpZ308L3NwYW4+YCA6IFwiXCJ9PC9kaXY+YDtcblx0LyoqIEBwYXJhbSB7VGVybX0gdGVybSAqL1xuXHRjb25zdCBkZWZpbml0aW9uUGFydCA9ICh0ZXJtKSA9PiBgPGRpdiBjbGFzcz1cImJhY2tcIj48cCBjbGFzcz1cImRlZmluaXRpb25cIj4ke3Rlcm0uZGVmaW5pdGlvbn08L3A+PC9kaXY+YDtcblx0LyoqIEBwYXJhbSB7VGVybX0gdGVybSAqL1xuXHRjb25zdCByZXN0UGFydCA9ICh0ZXJtKSA9PlxuXHRcdGA8ZGl2IGNsYXNzPVwiYmFja1wiPiR7dGVybS5tZXRhID8gYDxwIGNsYXNzPVwibWV0YVwiPiR7dGVybS5tZXRhfTwvcD5gIDogXCJcIn0ke3Rlcm0uZXhhbXBsZSA/IGA8cCBjbGFzcz1cImV4YW1wbGVcIj48c3BhbiBjbGFzcz1cImxhYmVsXCI+RXhhbXBsZTwvc3Bhbj4gJHt0ZXJtLmV4YW1wbGV9PC9wPmAgOiBcIlwifTxwIGNsYXNzPVwibGlua3NcIj4ke3NsaWRlTGlua3ModGVybSl9PC9wPjwvZGl2PmA7XG5cblx0LyoqIFZpc2libGUsIGluIFJldmlldyBvcmRlciwgb25lIGNhcmQgcGVyIHRlcm0sIG1pbnVzIHRoZSBvbmVzIGtub3duLiAqL1xuXHRmdW5jdGlvbiBzdGFydFN0dWR5KCkge1xuXHRcdGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG5cdFx0Y29uc3QgcG9vbCA9IFtdO1xuXHRcdGZvciAoY29uc3Qgc2V0IG9mIGdyb3VwcyhmaWx0ZXJlZCgpKSkge1xuXHRcdFx0Zm9yIChjb25zdCB0ZXJtIG9mIHNldC5pdGVtcykge1xuXHRcdFx0XHRpZiAoc2Vlbi5oYXModGVybS5pZCkgfHwgc3RhdGUua25vd24uaGFzKHRlcm0uaWQpKSBjb250aW51ZTtcblx0XHRcdFx0c2Vlbi5hZGQodGVybS5pZCk7XG5cdFx0XHRcdHBvb2wucHVzaCh0ZXJtKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHN0YXRlLnNodWZmbGUpIHtcblx0XHRcdGZvciAobGV0IGkgPSBwb29sLmxlbmd0aCAtIDE7IGkgPiAwOyBpIC09IDEpIHtcblx0XHRcdFx0Y29uc3QgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xuXHRcdFx0XHRbcG9vbFtpXSwgcG9vbFtqXV0gPSBbcG9vbFtqXSwgcG9vbFtpXV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHN0YXRlLmRlY2sgPSBwb29sO1xuXHRcdHN0YXRlLmlkeCA9IDA7XG5cdFx0c3RhdGUucmV2ZWFsZWQgPSBmYWxzZTtcblx0XHRyZW5kZXJTdHVkeShcIi5yZXZlYWxcIik7XG5cdH1cblxuXHQvKiogQHBhcmFtIHtzdHJpbmd9IFtmb2N1c10gc2VsZWN0b3IgdG8gZm9jdXMgYWZ0ZXJ3YXJkOyBkZWZhdWx0LCB0aGUgY29udHJvbCB0aGF0IGhhZCBmb2N1cyAqL1xuXHRmdW5jdGlvbiByZW5kZXJTdHVkeShmb2N1cykge1xuXHRcdGNvbnN0IGFjdCA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ/LmNsb3Nlc3Q/LihcIltkYXRhLWFjdF1cIik/LmRhdGFzZXQuYWN0O1xuXHRcdC8vIE1vdmUgZm9jdXMgb25seSB3aGVuIHRoZSByZWFkZXIgaXMgYWxyZWFkeSB3b3JraW5nIGluIHRoZSBjYXJkcy5cblx0XHRjb25zdCB3b3JraW5nID0gZWxzLnN0dWR5LmNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHx8IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IGRvY3VtZW50LmJvZHk7XG5cdFx0Y29uc3QgdG90YWwgPSBmaWx0ZXJlZCgpLmxlbmd0aDtcblx0XHRjb25zdCBrbm93bkNvdW50ID0gZmlsdGVyZWQoKS5maWx0ZXIoKHRlcm0pID0+IHN0YXRlLmtub3duLmhhcyh0ZXJtLmlkKSkubGVuZ3RoO1xuXHRcdGNvbnN0IGNhcmQgPSBzdGF0ZS5kZWNrW3N0YXRlLmlkeF07XG5cdFx0Y29uc3QgdG9wID0gYDxkaXYgY2xhc3M9XCJzdHVkeS10b3BcIj48c3Bhbj4ke2NhcmQgPyBgQ2FyZCAke3N0YXRlLmlkeCArIDF9IG9mICR7c3RhdGUuZGVjay5sZW5ndGh9YCA6IGAke3N0YXRlLmRlY2subGVuZ3RofSB0byBzdHVkeWB9IFx1MDBCNyAke2tub3duQ291bnR9IG9mICR7dG90YWx9IGtub3duPC9zcGFuPlxuXHRcdFx0PGRpdiBjbGFzcz1cIm9wdHNcIj5cblx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjaGlwXCIgZGF0YS1hY3Q9XCJzaHVmZmxlXCIgYXJpYS1wcmVzc2VkPVwiJHtzdGF0ZS5zaHVmZmxlfVwiPlNodWZmbGU8L2J1dHRvbj5cblx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjaGlwXCIgZGF0YS1hY3Q9XCJkaXJlY3Rpb25cIiBhcmlhLXByZXNzZWQ9XCIke3N0YXRlLmRpcmVjdGlvbiA9PT0gXCJkZWZcIn1cIj5EZWZpbml0aW9uIGZpcnN0PC9idXR0b24+XG5cdFx0XHRcdCR7a25vd25Db3VudCAmJiBjYXJkID8gXCI8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImNoaXBcXFwiIGRhdGEtYWN0PVxcXCJyZXNldFxcXCI+UmVzZXQga25vd248L2J1dHRvbj5cIiA6IFwiXCJ9XG5cdFx0XHQ8L2Rpdj48L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJtZXRlclwiIHJvbGU9XCJwcm9ncmVzc2JhclwiIGFyaWEtbGFiZWw9XCJLbm93biB0ZXJtc1wiIGFyaWEtdmFsdWVtaW49XCIwXCIgYXJpYS12YWx1ZW1heD1cIiR7dG90YWx9XCIgYXJpYS12YWx1ZW5vdz1cIiR7a25vd25Db3VudH1cIj48aSBzdHlsZT1cImlubGluZS1zaXplOiR7dG90YWwgPyBNYXRoLnJvdW5kKChrbm93bkNvdW50IC8gdG90YWwpICogMTAwKSA6IDB9JVwiPjwvaT48L2Rpdj5gO1xuXG5cdFx0bGV0IGh0bWw7XG5cdFx0aWYgKCF0b3RhbCkge1xuXHRcdFx0aHRtbCA9IGAke3RvcH08ZGl2IGNsYXNzPVwiZW1wdHlcIj48c3Ryb25nPk5vIHRlcm1zIG1hdGNoLjwvc3Ryb25nPjxzcGFuPkNsZWFyIHRoZSBzZWFyY2ggb3IgYSBmaWx0ZXIgdG8gc3R1ZHkgbW9yZS48L3NwYW4+PC9kaXY+YDtcblx0XHR9IGVsc2UgaWYgKCFjYXJkKSB7XG5cdFx0XHRodG1sID0gYCR7dG9wfTxkaXYgY2xhc3M9XCJkb25lXCI+PGgyIGNsYXNzPVwiaGVhZGluZ1wiPllvdSBrbm93IGV2ZXJ5IGNhcmQgaW4gdGhpcyBzZXQuPC9oMj48cD4ke2tub3duQ291bnR9IG9mICR7dG90YWx9IG1hcmtlZCBrbm93bi48L3A+PGRpdiBjbGFzcz1cInZlcmRpY3RcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdD1cImFnYWluXCIgY2xhc3M9XCJwcmltYXJ5XCI+U3RhcnQgb3ZlciB3aXRoIHRoZSBvbmVzIEkga25vdzwvYnV0dG9uPjwvZGl2PjwvZGl2PmA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IHRlcm1GaXJzdCA9IHN0YXRlLmRpcmVjdGlvbiA9PT0gXCJ0ZXJtXCI7XG5cdFx0XHRjb25zdCBmcm9udCA9IHRlcm1GaXJzdCA/IHRlcm1QYXJ0KGNhcmQpIDogZGVmaW5pdGlvblBhcnQoY2FyZCk7XG5cdFx0XHRjb25zdCBiYWNrID0gdGVybUZpcnN0ID8gZGVmaW5pdGlvblBhcnQoY2FyZCkgOiB0ZXJtUGFydChjYXJkKTtcblx0XHRcdGNvbnN0IHRlc3RzID0gY2FyZC50YWdzLnRlc3QubWFwKCh0YWcpID0+IGVzYyh0YWcubGFiZWwpKS5qb2luKFwiLCBcIik7XG5cdFx0XHRjb25zdCBjaGFwdGVycyA9IGNhcmQudGFncy5jaGFwdGVyLnNsaWNlKDAsIDIpLm1hcCgodGFnKSA9PiBlc2ModGFnLmxhYmVsKSkuam9pbihcIiwgXCIpO1xuXHRcdFx0aHRtbCA9IGAke3RvcH1cblx0XHRcdFx0PGRpdiBjbGFzcz1cImNhcmRcIiB0YWJpbmRleD1cIi0xXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cInRvcFwiPjxzcGFuIGRhdGEta2luZD1cInRlc3RcIj4ke3Rlc3RzfTwvc3Bhbj48c3BhbiBkYXRhLWtpbmQ9XCJjaGFwdGVyXCI+JHtjaGFwdGVyc308L3NwYW4+PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImNvbnRlbnRcIj4ke3N0YXRlLnJldmVhbGVkID8gZnJvbnQgKyBiYWNrICsgcmVzdFBhcnQoY2FyZCkgOiBmcm9udH08L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiZm9vdFwiPiR7c3RhdGUucmV2ZWFsZWQgPyBcIlwiIDogYDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwicmV2ZWFsIHByaW1hcnlcIiBkYXRhLWFjdD1cInJldmVhbFwiPlNob3cgJHt0ZXJtRmlyc3QgPyBcImRlZmluaXRpb25cIiA6IFwidGVybVwifTwvYnV0dG9uPmB9PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQke3N0YXRlLnJldmVhbGVkID8gXCI8ZGl2IGNsYXNzPVxcXCJ2ZXJkaWN0XFxcIj48YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcInllc1xcXCIgZGF0YS1hY3Q9XFxcImtub3dcXFwiPkkga25vdyB0aGlzPC9idXR0b24+PGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGRhdGEtYWN0PVxcXCJsYXRlclxcXCI+U2hvdyBtZSBhZ2FpbiBsYXRlcjwvYnV0dG9uPjwvZGl2PlwiIDogXCJcIn1cblx0XHRcdFx0PGRpdiBjbGFzcz1cIm5hdlwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0PVwicHJldlwiICR7c3RhdGUuaWR4ID09PSAwID8gXCJkaXNhYmxlZFwiIDogXCJcIn0+XHUyMTkwIFByZXZpb3VzPC9idXR0b24+PHNwYW4gY2xhc3M9XCJoaW50XCI+U3BhY2UgcmV2ZWFscyBcdTAwQjcgYXJyb3dzIG1vdmU8L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Q9XCJuZXh0XCIgJHtzdGF0ZS5pZHggPj0gc3RhdGUuZGVjay5sZW5ndGggLSAxID8gXCJkaXNhYmxlZFwiIDogXCJcIn0+TmV4dCBcdTIxOTI8L2J1dHRvbj48L2Rpdj5gO1xuXHRcdH1cblx0XHRlbHMuc3R1ZHkuaW5uZXJIVE1MID0gaHRtbDtcblxuXHRcdGlmICh3b3JraW5nKSB7XG5cdFx0XHRjb25zdCB0YXJnZXQgPSAoZm9jdXMgJiYgZWxzLnN0dWR5LnF1ZXJ5U2VsZWN0b3IoZm9jdXMpKSB8fCAoYWN0ICYmIGVscy5zdHVkeS5xdWVyeVNlbGVjdG9yKGBbZGF0YS1hY3Q9XCIke2FjdH1cIl06bm90KDpkaXNhYmxlZClgKSk7XG5cdFx0XHQodGFyZ2V0IHx8IGVscy5zdHVkeS5xdWVyeVNlbGVjdG9yKFwiLmNhcmRcIikgfHwgZWxzLnN0dWR5LnF1ZXJ5U2VsZWN0b3IoXCJbZGF0YS1hY3RdXCIpKT8uZm9jdXMoeyBwcmV2ZW50U2Nyb2xsOiB0cnVlIH0pO1xuXHRcdH1cblxuXHRcdGVscy5hbm5vdW5jZS50ZXh0Q29udGVudCA9ICFjYXJkXG5cdFx0XHQ/IFwiXCJcblx0XHRcdDogc3RhdGUucmV2ZWFsZWRcblx0XHRcdFx0PyBgRGVmaW5pdGlvbiBzaG93biBmb3IgJHtjYXJkLnBsYWlufWBcblx0XHRcdFx0OiBgQ2FyZCAke3N0YXRlLmlkeCArIDF9IG9mICR7c3RhdGUuZGVjay5sZW5ndGh9YDtcblx0fVxuXG5cdC8qKiBAcGFyYW0ge3N0cmluZ30gYWN0ICovXG5cdGZ1bmN0aW9uIHN0dWR5QWN0aW9uKGFjdCkge1xuXHRcdGNvbnN0IGNhcmQgPSBzdGF0ZS5kZWNrW3N0YXRlLmlkeF07XG5cdFx0aWYgKGFjdCA9PT0gXCJyZXZlYWxcIiAmJiBjYXJkICYmICFzdGF0ZS5yZXZlYWxlZCkge1xuXHRcdFx0c3RhdGUucmV2ZWFsZWQgPSB0cnVlO1xuXHRcdFx0cmVuZGVyU3R1ZHkoXCIueWVzXCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoYWN0ID09PSBcImtub3dcIiAmJiBjYXJkKSB7XG5cdFx0XHRzdGF0ZS5rbm93bi5hZGQoY2FyZC5pZCk7XG5cdFx0XHRzYXZlS25vd24oKTtcblx0XHRcdHN0YXRlLmRlY2suc3BsaWNlKHN0YXRlLmlkeCwgMSk7XG5cdFx0XHRzdGF0ZS5pZHggPSBNYXRoLm1pbihzdGF0ZS5pZHgsIE1hdGgubWF4KHN0YXRlLmRlY2subGVuZ3RoIC0gMSwgMCkpO1xuXHRcdH0gZWxzZSBpZiAoYWN0ID09PSBcImxhdGVyXCIgJiYgY2FyZCkge1xuXHRcdFx0c3RhdGUuZGVjay5wdXNoKC4uLnN0YXRlLmRlY2suc3BsaWNlKHN0YXRlLmlkeCwgMSkpO1xuXHRcdH0gZWxzZSBpZiAoYWN0ID09PSBcInByZXZcIiAmJiBzdGF0ZS5pZHggPiAwKSB7XG5cdFx0XHRzdGF0ZS5pZHggLT0gMTtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJuZXh0XCIgJiYgc3RhdGUuaWR4IDwgc3RhdGUuZGVjay5sZW5ndGggLSAxKSB7XG5cdFx0XHRzdGF0ZS5pZHggKz0gMTtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJzaHVmZmxlXCIpIHtcblx0XHRcdHN0YXRlLnNodWZmbGUgPSAhc3RhdGUuc2h1ZmZsZTtcblx0XHRcdHN0YXJ0U3R1ZHkoKTtcblx0XHRcdHJldHVybjtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJkaXJlY3Rpb25cIikge1xuXHRcdFx0c3RhdGUuZGlyZWN0aW9uID0gc3RhdGUuZGlyZWN0aW9uID09PSBcInRlcm1cIiA/IFwiZGVmXCIgOiBcInRlcm1cIjtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJyZXNldFwiIHx8IGFjdCA9PT0gXCJhZ2FpblwiKSB7XG5cdFx0XHRmb3IgKGNvbnN0IHRlcm0gb2YgZmlsdGVyZWQoKSkgc3RhdGUua25vd24uZGVsZXRlKHRlcm0uaWQpO1xuXHRcdFx0c2F2ZUtub3duKCk7XG5cdFx0XHRzdGFydFN0dWR5KCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0c3RhdGUucmV2ZWFsZWQgPSBmYWxzZTtcblx0XHRyZW5kZXJTdHVkeShhY3QgPT09IFwiZGlyZWN0aW9uXCIgPyB1bmRlZmluZWQgOiBcIi5yZXZlYWxcIik7XG5cdH1cblxuXHRlbHMuc3R1ZHkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdGNvbnN0IGJ1dHRvbiA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtYWN0XVwiKTtcblx0XHRpZiAoYnV0dG9uICYmICFidXR0b24uZGlzYWJsZWQpIHN0dWR5QWN0aW9uKGJ1dHRvbi5kYXRhc2V0LmFjdCk7XG5cdH0pO1xuXG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldmVudCkgPT4ge1xuXHRcdGlmIChzdGF0ZS5tb2RlICE9PSBcInN0dWR5XCIgfHwgZXZlbnQuYWx0S2V5IHx8IGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleSkgcmV0dXJuO1xuXHRcdGNvbnN0IHRhcmdldCA9IC8qKiBAdHlwZSB7SFRNTEVsZW1lbnR9ICovIChldmVudC50YXJnZXQpO1xuXHRcdGlmICh0YXJnZXQuY2xvc2VzdChcImlucHV0LCBzZWxlY3QsIHRleHRhcmVhLCBhLCBzdW1tYXJ5LCBbcm9sZT10YWJdLCBbcm9sZT1yYWRpb11cIikpIHJldHVybjtcblx0XHRpZiAoZXZlbnQua2V5ID09PSBcIiBcIiB8fCBldmVudC5rZXkgPT09IFwiRW50ZXJcIikge1xuXHRcdFx0Ly8gQSBmb2N1c2VkIGJ1dHRvbiBhbHJlYWR5IGFjdGl2YXRlcyBpdHNlbGYuXG5cdFx0XHRpZiAodGFyZ2V0LmNsb3Nlc3QoXCJidXR0b25cIikpIHJldHVybjtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRzdHVkeUFjdGlvbihcInJldmVhbFwiKTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gXCJBcnJvd1JpZ2h0XCIpIHtcblx0XHRcdHN0dWR5QWN0aW9uKFwibmV4dFwiKTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gXCJBcnJvd0xlZnRcIikge1xuXHRcdFx0c3R1ZHlBY3Rpb24oXCJwcmV2XCIpO1xuXHRcdH1cblx0fSwgeyBzaWduYWwgfSk7XG5cblx0Ly8gLS0tLSBNb2RlIGFuZCBVUkwgLS0tLVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSBcInJldmlld1wiIG9yIFwic3R1ZHlcIlxuXHQgKi9cblx0ZnVuY3Rpb24gc2V0TW9kZShtb2RlKSB7XG5cdFx0aWYgKG1vZGUgPT09IHN0YXRlLm1vZGUpIHJldHVybjtcblx0XHRzdGF0ZS5tb2RlID0gbW9kZTtcblx0XHRyZW5kZXIoKTtcblx0fVxuXG5cdC8qKiBBbiBvbGQgYCNzdHVkeWAgbGluayBzdGlsbCBvcGVucyBGbGFzaGNhcmRzLiAqL1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImhhc2hjaGFuZ2VcIiwgKCkgPT4ge1xuXHRcdGlmIChsb2NhdGlvbi5oYXNoID09PSBcIiNzdHVkeVwiKSBzZXRNb2RlKFwic3R1ZHlcIik7XG5cdH0sIHsgc2lnbmFsIH0pO1xuXG5cdC8qKiBLZWVwIHRoZSBsaW5rIGluIHN0ZXAgd2l0aCB0aGUgc3RhdGU6IG9ubHkgbm9uLWRlZmF1bHQgdmFsdWVzLCByZXBsYWNlZCwgbmV2ZXIgcHVzaGVkLiAqL1xuXHRmdW5jdGlvbiB3cml0ZVVybCgpIHtcblx0XHRjb25zdCBuZXh0ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpO1xuXHRcdGZvciAoY29uc3QgbmFtZSBvZiBQQVJBTVMpIG5leHQuZGVsZXRlKG5hbWUpO1xuXHRcdGlmIChzdGF0ZS5tb2RlID09PSBcInN0dWR5XCIpIG5leHQuc2V0KFwibW9kZVwiLCBcInN0dWR5XCIpO1xuXHRcdGlmIChzdGF0ZS5ieSAhPT0gXCJhelwiKSBuZXh0LnNldChcImdyb3VwXCIsIHN0YXRlLmJ5ID09PSBcImNoYXB0ZXJcIiA/IFwicmVhZGluZ1wiIDogc3RhdGUuYnkpO1xuXHRcdGNvbnN0IGtleXMgPSAoa2luZCkgPT4gWy4uLnN0YXRlLmZpbHRlcnNba2luZF1dLm1hcCgoa2V5KSA9PiAoa2luZCA9PT0gXCJ0ZXN0XCIgPyBrZXkucmVwbGFjZSgvXnRlc3QtLywgXCJcIikgOiBraW5kID09PSBcImNoYXB0ZXJcIiA/IHNsdWcoa2V5KSA6IGtleSkpO1xuXHRcdGlmIChzdGF0ZS5maWx0ZXJzLnRlc3Quc2l6ZSkgbmV4dC5zZXQoXCJ0ZXN0XCIsIGtleXMoXCJ0ZXN0XCIpLmpvaW4oXCIsXCIpKTtcblx0XHRpZiAoc3RhdGUuZmlsdGVycy5jaGFwdGVyLnNpemUpIG5leHQuc2V0KFwicmVhZGluZ1wiLCBrZXlzKFwiY2hhcHRlclwiKS5qb2luKFwiLFwiKSk7XG5cdFx0aWYgKHN0YXRlLmZpbHRlcnMubWVldGluZy5zaXplKSBuZXh0LnNldChcIm1lZXRpbmdcIiwga2V5cyhcIm1lZXRpbmdcIikuam9pbihcIixcIikpO1xuXHRcdGlmIChzdGF0ZS5xLnRyaW0oKSkgbmV4dC5zZXQoXCJxXCIsIHN0YXRlLnEpO1xuXHRcdGNvbnN0IHF1ZXJ5ID0gbmV4dC50b1N0cmluZygpLnJlcGxhY2UoLyUyQy9nLCBcIixcIik7XG5cdFx0Y29uc3QgaGFzaCA9IGxvY2F0aW9uLmhhc2ggPT09IFwiI3N0dWR5XCIgPyBcIlwiIDogbG9jYXRpb24uaGFzaDtcblx0XHRjb25zdCB1cmwgPSBsb2NhdGlvbi5wYXRobmFtZSArIChxdWVyeSA/IGA/JHtxdWVyeX1gIDogXCJcIikgKyBoYXNoO1xuXHRcdGlmICh1cmwgIT09IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoICsgbG9jYXRpb24uaGFzaCkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgXCJcIiwgdXJsKTtcblx0XHRcdH0gY2F0Y2gge1xuXHRcdFx0XHQvLyBBIHNhbmRib3hlZCBmcmFtZTogdGhlIGxpbmsganVzdCB3b24ndCBmb2xsb3cgdGhlIHN0YXRlLlxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRoaXRzID0gc2VhcmNoKCk7XG5cdFx0dmlldyA9IG51bGw7XG5cdFx0cmVuZGVyQ29udHJvbHMoKTtcblx0XHRyZW5kZXJSZXZpZXcoKTtcblx0XHRpZiAoc3RhdGUubW9kZSA9PT0gXCJzdHVkeVwiKSBzdGFydFN0dWR5KCk7XG5cdFx0d3JpdGVVcmwoKTtcblx0fVxuXG5cdGVscy5xLnZhbHVlID0gc3RhdGUucTtcblx0aWYgKEZJTFRFUkVELnNvbWUoKGtpbmQpID0+IHBhcmFtcy5oYXMoa2luZCA9PT0gXCJjaGFwdGVyXCIgPyBcInJlYWRpbmdcIiA6IGtpbmQpKSkgZWxzLmRldGFpbHMub3BlbiA9IHRydWU7XG5cdHJlbmRlcigpO1xuXHRyb290LnF1ZXJ5U2VsZWN0b3IoXCJbZGF0YS1zdGF0aWNdXCIpPy5yZW1vdmUoKTtcblx0YXBwLmhpZGRlbiA9IGZhbHNlO1xufVxuXG4vKiogVGhlIGdsb3NzYXJ5J3MgZWxlbWVudDogbW91bnRzIG9uY2Ugd2hlbiBpdCBqb2lucyB0aGUgcGFnZSwgYW5kIGxldHMgZ28gd2hlbiBpdCBsZWF2ZXMuICovXG5jbGFzcyBHbG9zc2FyeUFwcCBleHRlbmRzIEhUTUxFbGVtZW50IHtcblx0I2Fib3J0ID0gbnVsbDtcblxuXHRjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHRpZiAodGhpcy4jYWJvcnQpIHJldHVybjtcblx0XHR0aGlzLiNhYm9ydCA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcblx0XHRtb3VudCh0aGlzLCB0aGlzLiNhYm9ydC5zaWduYWwpO1xuXHR9XG5cblx0ZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG5cdFx0dGhpcy4jYWJvcnQ/LmFib3J0KCk7XG5cdFx0dGhpcy4jYWJvcnQgPSBudWxsO1xuXHR9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KFwiZ2xvc3NhcnktYXBwXCIpKSBjdXN0b21FbGVtZW50cy5kZWZpbmUoXCJnbG9zc2FyeS1hcHBcIiwgR2xvc3NhcnlBcHApO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQTBDQSxJQUFNLFFBQVEsQ0FBQyxRQUFRLFdBQVcsV0FBVyxPQUFPO0FBRXBELElBQU0sVUFBVSxDQUFDLFFBQVEsU0FBUztBQUVs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QUksUUFBUSxLQUFLLE1BQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQztBQUNwRSxRQUFJLE1BQU0sUUFBUSxRQUFRLEtBQU0sTUFBSyxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUUsS0FBSyxHQUFHLENBQUM7QUFDN0UsUUFBSSxNQUFNLFFBQVEsUUFBUSxLQUFNLE1BQUssSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFLEtBQUssR0FBRyxDQUFDO0FBQzdFLFFBQUksTUFBTSxFQUFFLEtBQUssRUFBRyxNQUFLLElBQUksS0FBSyxNQUFNLENBQUM7QUFDekMsVUFBTSxRQUFRLEtBQUssU0FBUyxFQUFFLFFBQVEsUUFBUSxHQUFHO0FBQ2pELFVBQU0sT0FBTyxTQUFTLFNBQVMsV0FBVyxLQUFLLFNBQVM7QUFDeEQsVUFBTSxNQUFNLFNBQVMsWUFBWSxRQUFRLElBQUksS0FBSyxLQUFLLE1BQU07QUFDN0QsUUFBSSxRQUFRLFNBQVMsV0FBVyxTQUFTLFNBQVMsU0FBUyxNQUFNO0FBQ2hFLFVBQUk7QUFDSCxnQkFBUSxhQUFhLE1BQU0sSUFBSSxHQUFHO0FBQUEsTUFDbkMsUUFBUTtBQUFBLE1BRVI7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUVBLFdBQVMsU0FBUztBQUNqQixXQUFPLE9BQU87QUFDZCxXQUFPO0FBQ1AsbUJBQWU7QUFDZixpQkFBYTtBQUNiLFFBQUksTUFBTSxTQUFTLFFBQVMsWUFBVztBQUN2QyxhQUFTO0FBQUEsRUFDVjtBQUVBLE1BQUksRUFBRSxRQUFRLE1BQU07QUFDcEIsTUFBSSxTQUFTLEtBQUssQ0FBQyxTQUFTLE9BQU8sSUFBSSxTQUFTLFlBQVksWUFBWSxJQUFJLENBQUMsRUFBRyxLQUFJLFFBQVEsT0FBTztBQUNuRyxTQUFPO0FBQ1AsT0FBSyxjQUFjLGVBQWUsR0FBRyxPQUFPO0FBQzVDLE1BQUksU0FBUztBQUNkO0FBR0EsSUFBTSxjQUFOLGNBQTBCLFlBQVk7QUFBQSxFQUNyQyxTQUFTO0FBQUEsRUFFVCxvQkFBb0I7QUFDbkIsUUFBSSxLQUFLLE9BQVE7QUFDakIsU0FBSyxTQUFTLElBQUksZ0JBQWdCO0FBQ2xDLFVBQU0sTUFBTSxLQUFLLE9BQU8sTUFBTTtBQUFBLEVBQy9CO0FBQUEsRUFFQSx1QkFBdUI7QUFDdEIsU0FBSyxRQUFRLE1BQU07QUFDbkIsU0FBSyxTQUFTO0FBQUEsRUFDZjtBQUNEO0FBRUEsSUFBSSxDQUFDLGVBQWUsSUFBSSxjQUFjLEVBQUcsZ0JBQWUsT0FBTyxnQkFBZ0IsV0FBVzsiLAogICJuYW1lcyI6IFsiaGl0cyJdCn0K
