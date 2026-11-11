// assets/scripts/glossary.js
var COPY = JSON.parse(document.getElementById("copy-data")?.textContent || "{}");
var t = (ns, key, vars = {}) => {
  const table = COPY[ns] ?? {};
  let text = table[key];
  if ("count" in vars && `${key}_other` in table) {
    text = table[`${key}_${new Intl.PluralRules(document.documentElement.lang || "en-US").select(vars.count)}`] ?? table[`${key}_other`];
  }
  return String(text ?? "").replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
};
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
  const prefix = root.id || "glossary";
  const dims = [
    ["az", t("glossary", "byAz")],
    ["test", t("glossary", "byTest")],
    ["chapter", label],
    ["meeting", t("glossary", "byMeeting")]
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
			<fieldset class="switch" data-switch="radio" data-by>
				<legend class="switch-label">${esc(t("glossary", "groupBy"))}</legend>
				<div class="switch-track">${dims.map(([dim, text]) => `<label class="switch-option"><input type="radio" name="${prefix}-by" value="${dim}"> ${esc(text)}</label>`).join("")}</div>
			</fieldset>
			<div class="switch" data-switch="tabs" data-modes>
				<span class="switch-label" id="${prefix}-mode-label">${esc(t("glossary", "mode"))}</span>
				<div class="switch-track" role="tablist" aria-labelledby="${prefix}-mode-label">
					<button type="button" class="switch-option" role="tab" id="${prefix}-tab-review" aria-controls="${prefix}-panel-review" aria-selected="true" tabindex="0" data-mode="review">${esc(t("glossary", "review"))}</button>
					<button type="button" class="switch-option" role="tab" id="${prefix}-tab-study" aria-controls="${prefix}-panel-study" aria-selected="false" tabindex="-1" data-mode="study">${esc(t("glossary", "flashcards"))}</button>
				</div>
			</div>
		</div>
		<div class="search">
			<label class="label" for="${prefix}-q">${esc(t("glossary", "search"))}</label>
			<div class="field">
				<input type="search" id="${prefix}-q" name="q" autocomplete="off" spellcheck="false" data-q>
				<button type="button" class="clear-search" data-clear-q aria-label="${esc(t("glossary", "clearSearch"))}" hidden>${esc(t("glossary", "clear"))}</button>
			</div>
		</div>
		<details class="filters" data-filters>
			<summary data-summary></summary>
			<div class="filter-rows">
				${FILTERS.map(
    (kind) => `<div class="filter-row">
					<span class="label" id="${prefix}-f-${kind}">${esc(kind === "test" ? t("glossary", "byTest") : label)}</span>
					<div class="chips" role="group" aria-labelledby="${prefix}-f-${kind}" data-chips="${kind}"></div>
				</div>`
  ).join("")}
				<div class="filter-row" data-pills-row hidden>
					<span class="label" id="${prefix}-f-meeting">${esc(t("glossary", "byMeeting"))}</span>
					<div class="chips" role="group" aria-labelledby="${prefix}-f-meeting" data-pills></div>
				</div>
			</div>
		</details>
		<p class="status" aria-live="polite" data-status></p>
		<div role="tabpanel" id="${prefix}-panel-review" aria-labelledby="${prefix}-tab-review" data-review></div>
		<div role="tabpanel" id="${prefix}-panel-study" aria-labelledby="${prefix}-tab-study" class="study" data-study hidden></div>
		<p class="sr-only" role="status" data-announce></p>`;
  const q = (selector) => app.querySelector(selector);
  const els = {
    by: q('[data-switch="radio"]'),
    modes: q('[data-switch="tabs"]'),
    tabs: q('[data-switch="tabs"] [role="tablist"]'),
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
  els.by.addEventListener("change", (event) => {
    if (event.target.matches('input[type="radio"]')) {
      state.by = event.target.value;
      render();
    }
  });
  els.tabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (button) setMode(button.dataset.mode);
  });
  roving(els.tabs, "[data-mode]", (button) => setMode(button.dataset.mode));
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
    for (const input of els.by.querySelectorAll('input[type="radio"]')) input.checked = input.value === state.by;
    for (const button of els.tabs.children) {
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
    els.pills.innerHTML = pills.map((tag) => `<button type="button" class="chip pill" data-kind="meeting" data-key="${esc(tag.key)}" aria-label="${esc(t("glossary", "removeFilter", { kind: t("glossary", "byMeeting").toLowerCase(), label: tag.label }))}">${esc(t("glossary", "meetingChip", { label: tag.label }))}</button>`).join("");
    els.clearQ.hidden = !state.q;
    const active = FILTERED.reduce((sum, kind) => sum + state.filters[kind].size, 0);
    els.summary.textContent = [t("glossary", "filterSummary", { reading: label.toLowerCase() }), active ? t("glossary", "filtersOn", { count: active }) : ""].filter(Boolean).join(" ");
    els.status.innerHTML = `${esc(active ? t("glossary", "count", { shown: filtered().length, total: terms.length }) : t("glossary", "terms", { count: terms.length }))}${active ? `${esc(t("common", "sep"))}<button type="button" data-clear>${esc(t("glossary", "clearFilters"))}</button>` : ""}`;
    els.review.hidden = state.mode !== "review";
    els.study.hidden = state.mode !== "study";
  }
  const slideLinks = (term) => term.taught.map((place) => `<a href="${esc(BASE + place.href.slice(1))}">${esc(t("glossary", "slideRef", { week: place.week, weekday: place.weekday, slide: place.slide }))}</a>`).join("") + (term.ref ? `<a href="${esc(term.ref.href)}">${esc(term.ref.label)}</a>` : "");
  const tagList = (term) => `<ul class="tags" role="list">${KINDS.flatMap((kind) => term.tags[kind].map((tag) => `<li data-kind="${kind}">${esc(tag.label)}</li>`)).join("")}</ul>`;
  function renderReview() {
    const list = filtered();
    if (!list.length) {
      els.review.innerHTML = `<div class="empty"><strong>${esc(t("glossary", "noMatch"))}</strong><span>${esc(t("glossary", "noMatchHint"))}</span></div>`;
      return;
    }
    const sets = groups(list);
    const id = (set) => `g-${state.by}-${slug(set.key)}`;
    els.review.innerHTML = sets.map(
      (set) => `<section class="group" id="${id(set)}"${state.by === "az" ? "" : ` data-kind="${state.by}"`} aria-labelledby="${id(set)}-h">
				<h2 class="heading" id="${id(set)}-h"><span class="name">${esc(set.label)}</span><span class="aside">${set.when ? `<span class="when">${esc(set.when)}</span>` : ""}${state.by === "meeting" ? `<span class="deck">${esc(set.deck)}</span>` : ""}<span class="count">${esc(t("glossary", "terms", { count: set.items.length }))}</span></span></h2>
				<dl>${set.items.map(
        (term) => `<div class="entry">
					<dt><span class="term">${highlight(term, hits?.get(term.id)?.marks)}</span>${term.group ? `<span class="api-group">${esc(term.group)}</span>` : ""}${state.known.has(term.id) ? `<span class="known">${esc(t("glossary", "known"))}</span>` : ""}</dt>
					<dd>${term.sig ? `<p class="sig">${term.sig}</p>` : ""}<p class="definition">${term.definition}</p>${term.meta ? `<p class="meta">${term.meta}</p>` : ""}${term.example ? `<p class="example"><span class="label">${esc(t("glossary", "example"))}</span> ${term.example}</p>` : ""}${tagList(term)}<p class="links">${term.taught.length || term.ref ? `<span class="label">${esc(t("glossary", "taughtIn"))}</span>` : ""}${slideLinks(term)}</p></dd>
				</div>`
      ).join("")}</dl>
			</section>`
    ).join("");
  }
  const termPart = (term) => `<div class="front">${term.term}${term.group ? `<small>${esc(term.group)}</small>` : ""}${term.sig ? `<span class="sig">${term.sig}</span>` : ""}</div>`;
  const definitionPart = (term) => `<div class="back"><p class="definition">${term.definition}</p></div>`;
  const restPart = (term) => `<div class="back">${term.meta ? `<p class="meta">${term.meta}</p>` : ""}${term.example ? `<p class="example"><span class="label">${esc(t("glossary", "example"))}</span> ${term.example}</p>` : ""}<p class="links">${slideLinks(term)}</p></div>`;
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
    const top = `<div class="study-top"><span>${esc([card ? t("glossary", "card", { n: state.idx + 1, total: state.deck.length }) : t("glossary", "toStudy", { count: state.deck.length }), t("glossary", "knownOf", { known: knownCount, total })].join(t("common", "sep")))}</span>
			<div class="opts">
				<button type="button" class="chip" data-act="shuffle" aria-pressed="${state.shuffle}">${esc(t("glossary", "shuffle"))}</button>
				<button type="button" class="chip" data-act="direction" aria-pressed="${state.direction === "def"}">${esc(t("glossary", "defFirst"))}</button>
				${knownCount && card ? `<button type="button" class="chip" data-act="reset">${esc(t("glossary", "resetKnown"))}</button>` : ""}
			</div></div>
			<div class="meter" role="progressbar" aria-label="${esc(t("glossary", "knownMeter"))}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${knownCount}"><i style="inline-size:${total ? Math.round(knownCount / total * 100) : 0}%"></i></div>`;
    let html;
    if (!total) {
      html = `${top}<div class="empty"><strong>${esc(t("glossary", "noMatch"))}</strong><span>${esc(t("glossary", "noMatchStudy"))}</span></div>`;
    } else if (!card) {
      html = `${top}<div class="done"><h2 class="heading">${esc(t("glossary", "allKnown"))}</h2><p>${esc(t("glossary", "markedKnown", { known: knownCount, total }))}</p><div class="verdict"><button type="button" data-act="again" class="primary">${esc(t("glossary", "startOver"))}</button></div></div>`;
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
					<div class="foot">${state.revealed ? "" : `<button type="button" class="reveal primary" data-act="reveal">${esc(t("glossary", termFirst ? "showDefinition" : "showTerm"))}</button>`}</div>
				</div>
				${state.revealed ? `<div class="verdict"><button type="button" class="yes" data-act="know">${esc(t("glossary", "iKnow"))}</button><button type="button" data-act="later">${esc(t("glossary", "later"))}</button></div>` : ""}
				<div class="nav"><button type="button" data-act="prev" ${state.idx === 0 ? "disabled" : ""}>${esc(t("glossary", "prev"))}</button><span class="hint">${esc(t("glossary", "hint"))}</span><button type="button" data-act="next" ${state.idx >= state.deck.length - 1 ? "disabled" : ""}>${esc(t("glossary", "next"))}</button></div>`;
    }
    els.study.innerHTML = html;
    if (working) {
      const target = focus && els.study.querySelector(focus) || act && els.study.querySelector(`[data-act="${act}"]:not(:disabled)`);
      (target || els.study.querySelector(".card") || els.study.querySelector("[data-act]"))?.focus({ preventScroll: true });
    }
    els.announce.textContent = !card ? "" : state.revealed ? t("glossary", "defShown", { term: card.plain }) : t("glossary", "card", { n: state.idx + 1, total: state.deck.length });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvZ2xvc3NhcnkuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogVGhlIGNvdXJzZSBnbG9zc2FyeTogUmV2aWV3IGFuZCBGbGFzaGNhcmRzIG92ZXIgb25lIHRhZ2dlZCwgZmlsdGVyYWJsZSBsaXN0LlxuICpcbiAqIEVuaGFuY2VzIHRoZSBwbGFpbiBsaXN0IGA8Z2xvc3NhcnktcGFuZWw+YCByZW5kZXJzIG9uIHRoZSBzZXJ2ZXIuIEl0XG4gKiByZWFkcyB0aGUgdGVybXMgZnJvbSB0aGUgcGFnZSdzIEpTT04sIGJ1aWxkcyB0aGUgY29udHJvbHMsIGFuZCByZW1vdmVzIHRoZVxuICogc3RhdGljIGxpc3Qgb25jZSBpdCBoYXMgcmVuZGVyZWQuIFRoZSBwYWdlIG5ldmVyIHJlYWRzIHRoZSBjbG9jay4gVGhlIHF1ZXJ5XG4gKiBzdHJpbmcgKGBtb2RlYCwgYGdyb3VwYCwgYHRlc3RgLCBgcmVhZGluZ2AsIGBtZWV0aW5nYCwgYHFgKSBzZXRzIHRoZSBzdGFydGluZ1xuICogc3RhdGUgYW5kIGlzIGtlcHQgaW4gc3RlcCBhcyB0aGUgcmVhZGVyIGNoYW5nZXMgaXQuXG4gKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBUYWdcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBrZXlcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBsYWJlbFxuICogQHByb3BlcnR5IHtudW1iZXJ9IG9yZGVyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW3doZW5dIHRoZSBkYXRlIGZvciBkaXNwbGF5XG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2RlY2tdIGRlY2sgdGl0bGUgKG1lZXRpbmcpXG4gKiBAcHJvcGVydHkge251bWJlcn0gW25dIHRlcm1zIGNhcnJ5aW5nIHRoZSB0YWcgdW5kZXIgdGhlIG90aGVyIHJvdydzIGZpbHRlclxuICpcbiAqIEB0eXBlZGVmIHtvYmplY3R9IFBsYWNlXG4gKiBAcHJvcGVydHkge251bWJlcn0gd2Vla1xuICogQHByb3BlcnR5IHtudW1iZXJ9IHNsaWRlXG4gKiBAcHJvcGVydHkge3N0cmluZ30gd2Vla2RheVxuICogQHByb3BlcnR5IHtzdHJpbmd9IGhyZWZcbiAqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBUZXJtXG4gKiBAcHJvcGVydHkge3N0cmluZ30gaWRcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0ZXJtIEhUTUxcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBwbGFpblxuICogQHByb3BlcnR5IHtzdHJpbmd9IGtleSBsZXR0ZXJzIGFuZCBkaWdpdHMgb25seSwgbG93ZXJjYXNlZDogdGhlIHNvcnQgYW5kIHNlYXJjaCBrZXlcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBhek9yZGVyIHBvc2l0aW9uIGluIEEgdG8gWiBvcmRlciwgZnJvbSB0aGUgbG9hZGVyXG4gKiBAcHJvcGVydHkge3sga2V5OiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcgfX0gYXpHcm91cCBcIjAgdG8gOVwiLCBhIGxldHRlciBvciBcIlN5bWJvbHNcIlxuICogQHByb3BlcnR5IHtzdHJpbmd9IGdyb3VwXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZGVmaW5pdGlvbiBIVE1MXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZXhhbXBsZSBIVE1MXG4gKiBAcHJvcGVydHkge3N0cmluZ30gbWV0YSBIVE1MXG4gKiBAcHJvcGVydHkge3N0cmluZ30gc2lnIEhUTUxcbiAqIEBwcm9wZXJ0eSB7eyBsYWJlbDogc3RyaW5nLCBocmVmOiBzdHJpbmcgfXxudWxsfSByZWZcbiAqIEBwcm9wZXJ0eSB7UmVjb3JkPHN0cmluZywgVGFnW10+fSB0YWdzXG4gKiBAcHJvcGVydHkge1BsYWNlW119IHRhdWdodFxuICovXG5cbi8qKiBUaGUgcGFnZSdzIHdvcmRpbmcsIGZyb20gdGhlIGAjY29weS1kYXRhYCBibG9jayB0aGUgbGF5b3V0IHJlbmRlcnMuICovXG5jb25zdCBDT1BZID0gSlNPTi5wYXJzZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvcHktZGF0YVwiKT8udGV4dENvbnRlbnQgfHwgXCJ7fVwiKTtcbi8qKiBgdChcImdsb3NzYXJ5XCIsIFwidGVybXNcIiwgeyBjb3VudDogMyB9KWA7IGEga2V5IHdpdGggYF9vbmVgL2Bfb3RoZXJgIHZhcmlhbnRzIGlzIHBpY2tlZCBieSBgY291bnRgLiAqL1xuY29uc3QgdCA9IChucywga2V5LCB2YXJzID0ge30pID0+IHtcblx0Y29uc3QgdGFibGUgPSBDT1BZW25zXSA/PyB7fTtcblx0bGV0IHRleHQgPSB0YWJsZVtrZXldO1xuXHRpZiAoXCJjb3VudFwiIGluIHZhcnMgJiYgKGAke2tleX1fb3RoZXJgIGluIHRhYmxlKSkge1xuXHRcdHRleHQgPSB0YWJsZVtgJHtrZXl9XyR7bmV3IEludGwuUGx1cmFsUnVsZXMoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmxhbmcgfHwgXCJlbi1VU1wiKS5zZWxlY3QodmFycy5jb3VudCl9YF0gPz8gdGFibGVbYCR7a2V5fV9vdGhlcmBdO1xuXHR9XG5cdHJldHVybiBTdHJpbmcodGV4dCA/PyBcIlwiKS5yZXBsYWNlKC9cXHsoXFx3KylcXH0vZywgKF8sIG5hbWUpID0+IFN0cmluZyh2YXJzW25hbWVdID8/IFwiXCIpKTtcbn07XG5cbmNvbnN0IEtJTkRTID0gW1widGVzdFwiLCBcImNoYXB0ZXJcIiwgXCJtZWV0aW5nXCIsIFwidG9waWNcIl07XG4vKiogVGhlIHR3byBraW5kcyB3aXRoIGEgY2hpcCByb3cuICovXG5jb25zdCBGSUxURVJTID0gW1widGVzdFwiLCBcImNoYXB0ZXJcIl07XG4vKiogRXZlcnkga2luZCBhIGxpbmsgY2FuIGZpbHRlciBieTsgYG1lZXRpbmdgIGhhcyBhIHJlbW92YWJsZSBwaWxsIGluc3RlYWQgb2YgYSByb3cuICovXG5jb25zdCBGSUxURVJFRCA9IFtcInRlc3RcIiwgXCJjaGFwdGVyXCIsIFwibWVldGluZ1wiXTtcbmNvbnN0IFBBUkFNUyA9IFtcIm1vZGVcIiwgXCJncm91cFwiLCBcInRlc3RcIiwgXCJyZWFkaW5nXCIsIFwibWVldGluZ1wiLCBcInFcIl07XG5cbi8qKiBTaXRlIHJvb3QgKG9yIHRoZSBQYWdlcyBwYXRoIHByZWZpeCksIHRha2VuIGZyb20gd2hlcmUgdGhpcyBzY3JpcHQgaXMgc2VydmVkLiAqL1xuY29uc3QgQkFTRSA9IG5ldyBVUkwoXCIuLi9cIiwgaW1wb3J0Lm1ldGEudXJsKS5wYXRobmFtZTtcblxuLyoqIEBwYXJhbSB7dW5rbm93bn0gdGV4dCAqL1xuY29uc3QgZXNjID0gKHRleHQpID0+IFN0cmluZyh0ZXh0ID8/IFwiXCIpLnJlcGxhY2UoL1smPD5cIl0vZywgKGMpID0+ICh7IFwiJlwiOiBcIiZhbXA7XCIsIFwiPFwiOiBcIiZsdDtcIiwgXCI+XCI6IFwiJmd0O1wiLCAnXCInOiBcIiZxdW90O1wiIH0pW2NdKTtcblxuLyoqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0ICovXG5jb25zdCBzbHVnID0gKHRleHQpID0+IHRleHQudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV0rL2csIFwiLVwiKS5yZXBsYWNlKC9eLXwtJC9nLCBcIlwiKTtcblxuLyoqIGxvY2FsU3RvcmFnZSB0aGF0IG5ldmVyIHRocm93cyAocHJpdmF0ZSB3aW5kb3dzLCBibG9ja2VkIHN0b3JhZ2UpLiAqL1xuY29uc3Qgc3RvcmUgPSB7XG5cdC8qKiBAcGFyYW0ge3N0cmluZ30ga2V5ICovXG5cdGdldChrZXkpIHtcblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30ga2V5XG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuXHQgKi9cblx0c2V0KGtleSwgdmFsdWUpIHtcblx0XHR0cnkge1xuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCB2YWx1ZSk7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBQcm9ncmVzcyBqdXN0IHdvbid0IHBlcnNpc3QuXG5cdFx0fVxuXHR9LFxufTtcblxuLyoqXG4gKiBCdWlsZCB0aGUgZ2xvc3NhcnkncyBjb250cm9scyBpbnNpZGUgaXRzIGVsZW1lbnQsIGFuZCByZW1vdmUgdGhlIHN0YXRpYyBsaXN0LlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm9vdCB0aGUgYDxnbG9zc2FyeS1hcHA+YCBlbGVtZW50XG4gKiBAcGFyYW0ge0Fib3J0U2lnbmFsfSBzaWduYWwgZW5kcyB0aGUgcGFnZS1sZXZlbCBsaXN0ZW5lcnMgd2hlbiB0aGUgZWxlbWVudCBsZWF2ZXMgdGhlIHBhZ2VcbiAqL1xuZnVuY3Rpb24gbW91bnQocm9vdCwgc2lnbmFsKSB7XG5cdGNvbnN0IGFwcCA9IC8qKiBAdHlwZSB7SFRNTEVsZW1lbnQgfCBudWxsfSAqLyAocm9vdC5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtYXBwXVwiKSk7XG5cdGNvbnN0IHNvdXJjZSA9IHJvb3QucXVlcnlTZWxlY3Rvcignc2NyaXB0W3R5cGU9XCJhcHBsaWNhdGlvbi9qc29uXCJdJyk7XG5cdGlmICghYXBwIHx8ICFzb3VyY2UpIHJldHVybjtcblxuXHRjb25zdCBkYXRhID0gSlNPTi5wYXJzZShzb3VyY2UudGV4dENvbnRlbnQpO1xuXHRjb25zdCBsYWJlbCA9IGRhdGEucmVhZGluZ0xhYmVsO1xuXHQvKiogVHdvIGluc3RhbmNlcyBvbiBhIHBhZ2UgbmV2ZXIgc2hhcmUgYW4gaWQ6IGV2ZXJ5IGlkIHN0YXJ0cyB3aXRoIHRoZSBtb3VudCBlbGVtZW50J3MuICovXG5cdGNvbnN0IHByZWZpeCA9IHJvb3QuaWQgfHwgXCJnbG9zc2FyeVwiO1xuXHRjb25zdCBkaW1zID0gW1xuXHRcdFtcImF6XCIsIHQoXCJnbG9zc2FyeVwiLCBcImJ5QXpcIildLFxuXHRcdFtcInRlc3RcIiwgdChcImdsb3NzYXJ5XCIsIFwiYnlUZXN0XCIpXSxcblx0XHRbXCJjaGFwdGVyXCIsIGxhYmVsXSxcblx0XHRbXCJtZWV0aW5nXCIsIHQoXCJnbG9zc2FyeVwiLCBcImJ5TWVldGluZ1wiKV0sXG5cdF07XG5cblx0Y29uc3QgdGFnc09mID0gT2JqZWN0LmZyb21FbnRyaWVzKEtJTkRTLm1hcCgoa2luZCkgPT4gW2tpbmQsIG5ldyBNYXAoZGF0YS50YWdzW2tpbmRdLm1hcCgodGFnKSA9PiBbdGFnLmtleSwgdGFnXSkpXSkpO1xuXG5cdC8qKiBAdHlwZSB7VGVybVtdfSAqL1xuXHRjb25zdCB0ZXJtcyA9IGRhdGEudGVybXMubWFwKCh0ZXJtKSA9PiAoe1xuXHRcdC4uLnRlcm0sXG5cdFx0dGFnczogT2JqZWN0LmZyb21FbnRyaWVzKEtJTkRTLm1hcCgoa2luZCkgPT4gW2tpbmQsIHRlcm0udGFnc1traW5kXS5tYXAoKGtleSkgPT4gdGFnc09mW2tpbmRdLmdldChrZXkpKV0pKSxcblx0fSkpO1xuXG5cdC8vIC0tLS0gVGhlIHN0YXJ0aW5nIHN0YXRlLCBmcm9tIHRoZSBxdWVyeSBzdHJpbmcgKHVudHJ1c3RlZDogbWF0Y2hlZCBhZ2FpbnN0IGtub3duIGtleXMgb25seSkgLS0tLVxuXG5cdGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKTtcblx0Y29uc3QgbGlzdE9mID0gKG5hbWUpID0+IHBhcmFtcy5nZXRBbGwobmFtZSkuZmxhdE1hcCgodmFsdWUpID0+IHZhbHVlLnNwbGl0KFwiLFwiKSkubWFwKCh2YWx1ZSkgPT4gdmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCkpLmZpbHRlcihCb29sZWFuKTtcblx0Y29uc3QgbGFzdE51bWJlciA9ICh0ZXh0KSA9PiB0ZXh0Lm1hdGNoKC8oXFxkKylcXHMqJC8pPy5bMV07XG5cblx0LyoqXG5cdCAqIFRoZSB0YWcga2V5cyBvZiBga2luZGAgdGhhdCB0aGUgdmFsdWVzIG5hbWU6IGEga2V5LCBpdHMgc2x1ZyBvciBsYWJlbCBzbHVnLCBgbmAgZm9yIGB0ZXN0LW5gLFxuXHQgKiBvciBhIGJhcmUgbnVtYmVyIHdoZXJlIGEgbGFiZWwgZW5kcyBpbiBvbmUuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBraW5kXG5cdCAqIEBwYXJhbSB7c3RyaW5nW119IHZhbHVlc1xuXHQgKi9cblx0Y29uc3QgcmVzb2x2ZSA9IChraW5kLCB2YWx1ZXMpID0+XG5cdFx0bmV3IFNldChcblx0XHRcdGRhdGEudGFnc1traW5kXVxuXHRcdFx0XHQuZmlsdGVyKCh0YWcpID0+XG5cdFx0XHRcdFx0dmFsdWVzLnNvbWUoXG5cdFx0XHRcdFx0XHQodmFsdWUpID0+XG5cdFx0XHRcdFx0XHRcdHRhZy5rZXkudG9Mb3dlckNhc2UoKSA9PT0gdmFsdWUgfHxcblx0XHRcdFx0XHRcdFx0c2x1Zyh0YWcua2V5KSA9PT0gc2x1Zyh2YWx1ZSkgfHxcblx0XHRcdFx0XHRcdFx0c2x1Zyh0YWcubGFiZWwpID09PSBzbHVnKHZhbHVlKSB8fFxuXHRcdFx0XHRcdFx0XHQoa2luZCA9PT0gXCJ0ZXN0XCIgJiYgdGFnLmtleSA9PT0gYHRlc3QtJHt2YWx1ZX1gKSB8fFxuXHRcdFx0XHRcdFx0XHQoL15cXGQrJC8udGVzdCh2YWx1ZSkgJiYgbGFzdE51bWJlcih0YWcubGFiZWwpID09PSB2YWx1ZSksXG5cdFx0XHRcdFx0KSxcblx0XHRcdFx0KVxuXHRcdFx0XHQubWFwKCh0YWcpID0+IHRhZy5rZXkpLFxuXHRcdCk7XG5cblx0Y29uc3Qgc3RhcnRCeSA9ICgoKSA9PiB7XG5cdFx0Y29uc3QgdmFsdWUgPSBwYXJhbXMuZ2V0KFwiZ3JvdXBcIik/LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmICh2YWx1ZSA9PT0gXCJyZWFkaW5nXCIgfHwgdmFsdWUgPT09IGxhYmVsLnRvTG93ZXJDYXNlKCkpIHJldHVybiBcImNoYXB0ZXJcIjtcblx0XHRyZXR1cm4gZGltcy5zb21lKChbZGltXSkgPT4gZGltID09PSB2YWx1ZSkgPyB2YWx1ZSA6IFwiYXpcIjtcblx0fSkoKTtcblx0Y29uc3Qgc3RhcnRNb2RlID0gW1wic3R1ZHlcIiwgXCJmbGFzaGNhcmRzXCJdLmluY2x1ZGVzKHBhcmFtcy5nZXQoXCJtb2RlXCIpPy50b0xvd2VyQ2FzZSgpKSA/IFwic3R1ZHlcIiA6IHBhcmFtcy5nZXQoXCJtb2RlXCIpPy50b0xvd2VyQ2FzZSgpID09PSBcInJldmlld1wiID8gXCJyZXZpZXdcIiA6IGxvY2F0aW9uLmhhc2ggPT09IFwiI3N0dWR5XCIgPyBcInN0dWR5XCIgOiBcInJldmlld1wiO1xuXG5cdGNvbnN0IGtub3duS2V5ID0gYCR7ZGF0YS5jb2RlLnRvTG93ZXJDYXNlKCl9LWdsb3NzYXJ5LWtub3duYDtcblx0Y29uc3Qgc3RhdGUgPSB7XG5cdFx0Ynk6IHN0YXJ0QnksXG5cdFx0bW9kZTogc3RhcnRNb2RlLFxuXHRcdHE6IHBhcmFtcy5nZXQoXCJxXCIpPy5zbGljZSgwLCAyMDApID8/IFwiXCIsXG5cdFx0ZmlsdGVyczogeyB0ZXN0OiByZXNvbHZlKFwidGVzdFwiLCBsaXN0T2YoXCJ0ZXN0XCIpKSwgY2hhcHRlcjogcmVzb2x2ZShcImNoYXB0ZXJcIiwgbGlzdE9mKFwicmVhZGluZ1wiKSksIG1lZXRpbmc6IHJlc29sdmUoXCJtZWV0aW5nXCIsIGxpc3RPZihcIm1lZXRpbmdcIikpIH0sXG5cdFx0a25vd246IG5ldyBTZXQoKSxcblx0XHRkZWNrOiAvKiogQHR5cGUge1Rlcm1bXX0gKi8gKFtdKSxcblx0XHRpZHg6IDAsXG5cdFx0cmV2ZWFsZWQ6IGZhbHNlLFxuXHRcdGRpcmVjdGlvbjogXCJ0ZXJtXCIsXG5cdFx0c2h1ZmZsZTogZmFsc2UsXG5cdH07XG5cblx0dHJ5IHtcblx0XHRzdGF0ZS5rbm93biA9IG5ldyBTZXQoSlNPTi5wYXJzZShzdG9yZS5nZXQoa25vd25LZXkpID8/IFwiW11cIikpO1xuXHR9IGNhdGNoIHtcblx0XHRzdGF0ZS5rbm93biA9IG5ldyBTZXQoKTtcblx0fVxuXHRjb25zdCBzYXZlS25vd24gPSAoKSA9PiBzdG9yZS5zZXQoa25vd25LZXksIEpTT04uc3RyaW5naWZ5KFsuLi5zdGF0ZS5rbm93bl0pKTtcblxuXHRhcHAuaW5uZXJIVE1MID0gYFxuXHRcdDxkaXYgY2xhc3M9XCJiYXJcIj5cblx0XHRcdDxmaWVsZHNldCBjbGFzcz1cInN3aXRjaFwiIGRhdGEtc3dpdGNoPVwicmFkaW9cIiBkYXRhLWJ5PlxuXHRcdFx0XHQ8bGVnZW5kIGNsYXNzPVwic3dpdGNoLWxhYmVsXCI+JHtlc2ModChcImdsb3NzYXJ5XCIsIFwiZ3JvdXBCeVwiKSl9PC9sZWdlbmQ+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzd2l0Y2gtdHJhY2tcIj4ke2RpbXNcblx0XHRcdFx0XHQubWFwKChbZGltLCB0ZXh0XSkgPT4gYDxsYWJlbCBjbGFzcz1cInN3aXRjaC1vcHRpb25cIj48aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cIiR7cHJlZml4fS1ieVwiIHZhbHVlPVwiJHtkaW19XCI+ICR7ZXNjKHRleHQpfTwvbGFiZWw+YClcblx0XHRcdFx0XHQuam9pbihcIlwiKX08L2Rpdj5cblx0XHRcdDwvZmllbGRzZXQ+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3dpdGNoXCIgZGF0YS1zd2l0Y2g9XCJ0YWJzXCIgZGF0YS1tb2Rlcz5cblx0XHRcdFx0PHNwYW4gY2xhc3M9XCJzd2l0Y2gtbGFiZWxcIiBpZD1cIiR7cHJlZml4fS1tb2RlLWxhYmVsXCI+JHtlc2ModChcImdsb3NzYXJ5XCIsIFwibW9kZVwiKSl9PC9zcGFuPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3dpdGNoLXRyYWNrXCIgcm9sZT1cInRhYmxpc3RcIiBhcmlhLWxhYmVsbGVkYnk9XCIke3ByZWZpeH0tbW9kZS1sYWJlbFwiPlxuXHRcdFx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwic3dpdGNoLW9wdGlvblwiIHJvbGU9XCJ0YWJcIiBpZD1cIiR7cHJlZml4fS10YWItcmV2aWV3XCIgYXJpYS1jb250cm9scz1cIiR7cHJlZml4fS1wYW5lbC1yZXZpZXdcIiBhcmlhLXNlbGVjdGVkPVwidHJ1ZVwiIHRhYmluZGV4PVwiMFwiIGRhdGEtbW9kZT1cInJldmlld1wiPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcInJldmlld1wiKSl9PC9idXR0b24+XG5cdFx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJzd2l0Y2gtb3B0aW9uXCIgcm9sZT1cInRhYlwiIGlkPVwiJHtwcmVmaXh9LXRhYi1zdHVkeVwiIGFyaWEtY29udHJvbHM9XCIke3ByZWZpeH0tcGFuZWwtc3R1ZHlcIiBhcmlhLXNlbGVjdGVkPVwiZmFsc2VcIiB0YWJpbmRleD1cIi0xXCIgZGF0YS1tb2RlPVwic3R1ZHlcIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJmbGFzaGNhcmRzXCIpKX08L2J1dHRvbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwic2VhcmNoXCI+XG5cdFx0XHQ8bGFiZWwgY2xhc3M9XCJsYWJlbFwiIGZvcj1cIiR7cHJlZml4fS1xXCI+JHtlc2ModChcImdsb3NzYXJ5XCIsIFwic2VhcmNoXCIpKX08L2xhYmVsPlxuXHRcdFx0PGRpdiBjbGFzcz1cImZpZWxkXCI+XG5cdFx0XHRcdDxpbnB1dCB0eXBlPVwic2VhcmNoXCIgaWQ9XCIke3ByZWZpeH0tcVwiIG5hbWU9XCJxXCIgYXV0b2NvbXBsZXRlPVwib2ZmXCIgc3BlbGxjaGVjaz1cImZhbHNlXCIgZGF0YS1xPlxuXHRcdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImNsZWFyLXNlYXJjaFwiIGRhdGEtY2xlYXItcSBhcmlhLWxhYmVsPVwiJHtlc2ModChcImdsb3NzYXJ5XCIsIFwiY2xlYXJTZWFyY2hcIikpfVwiIGhpZGRlbj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJjbGVhclwiKSl9PC9idXR0b24+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGV0YWlscyBjbGFzcz1cImZpbHRlcnNcIiBkYXRhLWZpbHRlcnM+XG5cdFx0XHQ8c3VtbWFyeSBkYXRhLXN1bW1hcnk+PC9zdW1tYXJ5PlxuXHRcdFx0PGRpdiBjbGFzcz1cImZpbHRlci1yb3dzXCI+XG5cdFx0XHRcdCR7RklMVEVSUy5tYXAoXG5cdFx0XHRcdFx0KGtpbmQpID0+IGA8ZGl2IGNsYXNzPVwiZmlsdGVyLXJvd1wiPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwibGFiZWxcIiBpZD1cIiR7cHJlZml4fS1mLSR7a2luZH1cIj4ke2VzYyhraW5kID09PSBcInRlc3RcIiA/IHQoXCJnbG9zc2FyeVwiLCBcImJ5VGVzdFwiKSA6IGxhYmVsKX08L3NwYW4+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImNoaXBzXCIgcm9sZT1cImdyb3VwXCIgYXJpYS1sYWJlbGxlZGJ5PVwiJHtwcmVmaXh9LWYtJHtraW5kfVwiIGRhdGEtY2hpcHM9XCIke2tpbmR9XCI+PC9kaXY+XG5cdFx0XHRcdDwvZGl2PmAsXG5cdFx0XHRcdCkuam9pbihcIlwiKX1cblx0XHRcdFx0PGRpdiBjbGFzcz1cImZpbHRlci1yb3dcIiBkYXRhLXBpbGxzLXJvdyBoaWRkZW4+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJsYWJlbFwiIGlkPVwiJHtwcmVmaXh9LWYtbWVldGluZ1wiPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcImJ5TWVldGluZ1wiKSl9PC9zcGFuPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGlwc1wiIHJvbGU9XCJncm91cFwiIGFyaWEtbGFiZWxsZWRieT1cIiR7cHJlZml4fS1mLW1lZXRpbmdcIiBkYXRhLXBpbGxzPjwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGV0YWlscz5cblx0XHQ8cCBjbGFzcz1cInN0YXR1c1wiIGFyaWEtbGl2ZT1cInBvbGl0ZVwiIGRhdGEtc3RhdHVzPjwvcD5cblx0XHQ8ZGl2IHJvbGU9XCJ0YWJwYW5lbFwiIGlkPVwiJHtwcmVmaXh9LXBhbmVsLXJldmlld1wiIGFyaWEtbGFiZWxsZWRieT1cIiR7cHJlZml4fS10YWItcmV2aWV3XCIgZGF0YS1yZXZpZXc+PC9kaXY+XG5cdFx0PGRpdiByb2xlPVwidGFicGFuZWxcIiBpZD1cIiR7cHJlZml4fS1wYW5lbC1zdHVkeVwiIGFyaWEtbGFiZWxsZWRieT1cIiR7cHJlZml4fS10YWItc3R1ZHlcIiBjbGFzcz1cInN0dWR5XCIgZGF0YS1zdHVkeSBoaWRkZW4+PC9kaXY+XG5cdFx0PHAgY2xhc3M9XCJzci1vbmx5XCIgcm9sZT1cInN0YXR1c1wiIGRhdGEtYW5ub3VuY2U+PC9wPmA7XG5cblx0Y29uc3QgcSA9IChzZWxlY3RvcikgPT4gYXBwLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuXHRjb25zdCBlbHMgPSB7XG5cdFx0Ynk6IHEoJ1tkYXRhLXN3aXRjaD1cInJhZGlvXCJdJyksXG5cdFx0bW9kZXM6IHEoJ1tkYXRhLXN3aXRjaD1cInRhYnNcIl0nKSxcblx0XHR0YWJzOiBxKCdbZGF0YS1zd2l0Y2g9XCJ0YWJzXCJdIFtyb2xlPVwidGFibGlzdFwiXScpLFxuXHRcdHN1bW1hcnk6IHEoXCJbZGF0YS1zdW1tYXJ5XVwiKSxcblx0XHRkZXRhaWxzOiBxKFwiW2RhdGEtZmlsdGVyc11cIiksXG5cdFx0cTogcShcIltkYXRhLXFdXCIpLFxuXHRcdGNsZWFyUTogcShcIltkYXRhLWNsZWFyLXFdXCIpLFxuXHRcdHBpbGxzOiBxKFwiW2RhdGEtcGlsbHNdXCIpLFxuXHRcdHBpbGxzUm93OiBxKFwiW2RhdGEtcGlsbHMtcm93XVwiKSxcblx0XHRzdGF0dXM6IHEoXCJbZGF0YS1zdGF0dXNdXCIpLFxuXHRcdHJldmlldzogcShcIltkYXRhLXJldmlld11cIiksXG5cdFx0c3R1ZHk6IHEoXCJbZGF0YS1zdHVkeV1cIiksXG5cdFx0YW5ub3VuY2U6IHEoXCJbZGF0YS1hbm5vdW5jZV1cIiksXG5cdH07XG5cblx0LyoqIEBwYXJhbSB7VGVybX0gdGVybSBAcGFyYW0ge3N0cmluZ30ga2luZCAqL1xuXHRjb25zdCBoYXNBbnkgPSAodGVybSwga2luZCkgPT4gIXN0YXRlLmZpbHRlcnNba2luZF0uc2l6ZSB8fCB0ZXJtLnRhZ3Nba2luZF0uc29tZSgodGFnKSA9PiBzdGF0ZS5maWx0ZXJzW2tpbmRdLmhhcyh0YWcua2V5KSk7XG5cblx0Ly8gLS0tLSBTZWFyY2g6IHRoZSB0ZXJtIGZpcnN0IChmb3JnaXZpbmcpLCB0aGVuIHRoZSBkZWZpbml0aW9uIChwbGFpbiB3b3JkcykgLS0tLVxuXG5cdC8qKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBsZXR0ZXJzIGFuZCBkaWdpdHMgb25seSwgbG93ZXJjYXNlZCwgbm8gYWNjZW50cyAqL1xuXHRjb25zdCBhbG51bSA9ICh0ZXh0KSA9PiB0ZXh0Lm5vcm1hbGl6ZShcIk5GS0RcIikudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV0vZywgXCJcIik7XG5cblx0LyoqIEBwYXJhbSB7c3RyaW5nfSBodG1sICovXG5cdGNvbnN0IHRleHRPZiA9IChodG1sKSA9PiB7XG5cdFx0Y29uc3QgYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRlbXBsYXRlXCIpO1xuXHRcdGJveC5pbm5lckhUTUwgPSBodG1sO1xuXHRcdHJldHVybiBib3guY29udGVudC50ZXh0Q29udGVudC50b0xvd2VyQ2FzZSgpO1xuXHR9O1xuXG5cdGNvbnN0IGRlZmluaXRpb25zID0gbmV3IE1hcCh0ZXJtcy5tYXAoKHRlcm0pID0+IFt0ZXJtLmlkLCB0ZXh0T2YodGVybS5kZWZpbml0aW9uKV0pKTtcblx0Y29uc3QgbmFtZXMgPSBuZXcgTWFwKHRlcm1zLm1hcCgodGVybSkgPT4gW3Rlcm0uaWQsIHRleHRPZih0ZXJtLnRlcm0pXSkpO1xuXG5cdC8qKiBXaGV0aGVyIGBhYCBpcyBgYmAgd2l0aCBvbmUgbGV0dGVyIGFkZGVkLCBkcm9wcGVkLCBjaGFuZ2VkIG9yIHR3byBzd2FwcGVkLiAqL1xuXHRjb25zdCBuZWFyID0gKGEsIGIpID0+IHtcblx0XHRpZiAoYSA9PT0gYikgcmV0dXJuIHRydWU7XG5cdFx0Y29uc3QgZ2FwID0gYS5sZW5ndGggLSBiLmxlbmd0aDtcblx0XHRpZiAoTWF0aC5hYnMoZ2FwKSA+IDEpIHJldHVybiBmYWxzZTtcblx0XHRsZXQgaSA9IDA7XG5cdFx0d2hpbGUgKGkgPCBhLmxlbmd0aCAmJiBpIDwgYi5sZW5ndGggJiYgYVtpXSA9PT0gYltpXSkgaSArPSAxO1xuXHRcdGlmIChnYXAgPT09IDApIHJldHVybiBhLnNsaWNlKGkgKyAxKSA9PT0gYi5zbGljZShpICsgMSkgfHwgKGFbaV0gPT09IGJbaSArIDFdICYmIGFbaSArIDFdID09PSBiW2ldICYmIGEuc2xpY2UoaSArIDIpID09PSBiLnNsaWNlKGkgKyAyKSk7XG5cdFx0cmV0dXJuIGdhcCA+IDAgPyBhLnNsaWNlKGkgKyAxKSA9PT0gYi5zbGljZShpKSA6IGIuc2xpY2UoaSArIDEpID09PSBhLnNsaWNlKGkpO1xuXHR9O1xuXG5cdGNvbnN0IHJhbmdlID0gKGZyb20sIGxlbmd0aCkgPT4gbmV3IFNldChBcnJheS5mcm9tKHsgbGVuZ3RoIH0sIChfLCBpKSA9PiBmcm9tICsgaSkpO1xuXG5cdC8qKlxuXHQgKiBIb3cgd2VsbCBhIHRlcm0gbWF0Y2hlczogMCBleGFjdCwgMSBwcmVmaXgsIDIgaW5zaWRlIHRoZSBuYW1lLCAzIGxldHRlcnMgaW4gb3JkZXJcblx0ICogKFwicXNhXCIgZmluZHMgcXVlcnlTZWxlY3RvckFsbCksIDQgb25lIHR5cG8gKDQrIGNoYXJhY3RlcnMpLCA1IHRoZSBkZWZpbml0aW9uLlxuXHQgKiBgbWFya3NgIGFyZSB0aGUgcG9zaXRpb25zIGluIHRoZSB0ZXJtJ3Mga2V5IHRvIGhpZ2hsaWdodC5cblx0ICogQHBhcmFtIHtUZXJtfSB0ZXJtXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSByYXcgdGhlIHF1ZXJ5IGFzIHR5cGVkXG5cdCAqIEByZXR1cm5zIHt7IHNjb3JlOiBudW1iZXIsIG1hcmtzOiBTZXQ8bnVtYmVyPnxudWxsIH18bnVsbH1cblx0ICovXG5cdGNvbnN0IG1hdGNoID0gKHRlcm0sIHJhdykgPT4ge1xuXHRcdGNvbnN0IHdhbnRlZCA9IGFsbnVtKHJhdyk7XG5cdFx0Y29uc3QgYXQgPSB0ZXJtLmtleS5pbmRleE9mKHdhbnRlZCk7XG5cdFx0aWYgKCF3YW50ZWQpIHJldHVybiBuYW1lcy5nZXQodGVybS5pZCkuaW5jbHVkZXMocmF3LnRvTG93ZXJDYXNlKCkpID8geyBzY29yZTogMiwgbWFya3M6IG51bGwgfSA6IG51bGw7XG5cdFx0aWYgKHRlcm0ua2V5ID09PSB3YW50ZWQpIHJldHVybiB7IHNjb3JlOiAwLCBtYXJrczogcmFuZ2UoMCwgd2FudGVkLmxlbmd0aCkgfTtcblx0XHRpZiAoYXQgPT09IDApIHJldHVybiB7IHNjb3JlOiAxLCBtYXJrczogcmFuZ2UoMCwgd2FudGVkLmxlbmd0aCkgfTtcblx0XHRpZiAoYXQgPiAwKSByZXR1cm4geyBzY29yZTogMiwgbWFya3M6IHJhbmdlKGF0LCB3YW50ZWQubGVuZ3RoKSB9O1xuXHRcdGlmICh3YW50ZWQubGVuZ3RoID49IDMpIHtcblx0XHRcdGNvbnN0IG1hcmtzID0gbmV3IFNldCgpO1xuXHRcdFx0bGV0IGZyb20gPSAwO1xuXHRcdFx0Zm9yIChjb25zdCBjaGFyIG9mIHdhbnRlZCkge1xuXHRcdFx0XHRmcm9tID0gdGVybS5rZXkuaW5kZXhPZihjaGFyLCBmcm9tKTtcblx0XHRcdFx0aWYgKGZyb20gPCAwKSBicmVhaztcblx0XHRcdFx0bWFya3MuYWRkKGZyb20pO1xuXHRcdFx0XHRmcm9tICs9IDE7XG5cdFx0XHR9XG5cdFx0XHRpZiAobWFya3Muc2l6ZSA9PT0gd2FudGVkLmxlbmd0aCkgcmV0dXJuIHsgc2NvcmU6IDMsIG1hcmtzIH07XG5cdFx0fVxuXHRcdGlmICh3YW50ZWQubGVuZ3RoID49IDQgJiYgWzAsIDEsIC0xXS5zb21lKChleHRyYSkgPT4gbmVhcih3YW50ZWQsIHRlcm0ua2V5LnNsaWNlKDAsIHdhbnRlZC5sZW5ndGggKyBleHRyYSkpIHx8IG5lYXIod2FudGVkLCB0ZXJtLmtleSkpKSByZXR1cm4geyBzY29yZTogNCwgbWFya3M6IG51bGwgfTtcblx0XHRjb25zdCBsb3dlciA9IHJhdy50b0xvd2VyQ2FzZSgpO1xuXHRcdGNvbnN0IHRleHQgPSBkZWZpbml0aW9ucy5nZXQodGVybS5pZCk7XG5cdFx0Y29uc3QgZm91bmQgPSBsb3dlci5sZW5ndGggPj0gMyA/IHRleHQuaW5jbHVkZXMobG93ZXIpIDogbmV3IFJlZ0V4cChgXFxcXGIke2xvd2VyLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKX1cXFxcYmApLnRlc3QodGV4dCk7XG5cdFx0cmV0dXJuIGZvdW5kID8geyBzY29yZTogNSwgbWFya3M6IG51bGwgfSA6IG51bGw7XG5cdH07XG5cblx0LyoqIE1hdGNoZXMgZm9yIHRoZSBjdXJyZW50IHF1ZXJ5LCBvciBudWxsIHdpdGggbm8gcXVlcnkuIEByZXR1cm5zIHtNYXA8c3RyaW5nLCB7IHNjb3JlOiBudW1iZXIsIG1hcmtzOiBTZXQ8bnVtYmVyPnxudWxsIH0+fG51bGx9ICovXG5cdGNvbnN0IHNlYXJjaCA9ICgpID0+IHtcblx0XHRjb25zdCByYXcgPSBzdGF0ZS5xLnRyaW0oKTtcblx0XHRpZiAoIXJhdykgcmV0dXJuIG51bGw7XG5cdFx0Y29uc3QgaGl0cyA9IG5ldyBNYXAoKTtcblx0XHRmb3IgKGNvbnN0IHRlcm0gb2YgdGVybXMpIHtcblx0XHRcdGNvbnN0IGhpdCA9IG1hdGNoKHRlcm0sIHJhdyk7XG5cdFx0XHRpZiAoaGl0KSBoaXRzLnNldCh0ZXJtLmlkLCBoaXQpO1xuXHRcdH1cblx0XHRyZXR1cm4gaGl0cztcblx0fTtcblxuXHQvKiogQHR5cGUge01hcDxzdHJpbmcsIHsgc2NvcmU6IG51bWJlciwgbWFya3M6IFNldDxudW1iZXI+fG51bGwgfT58bnVsbH0gKi9cblx0bGV0IGhpdHMgPSBudWxsO1xuXHQvKiogQHR5cGUge1Rlcm1bXXxudWxsfSAqL1xuXHRsZXQgdmlldyA9IG51bGw7XG5cblx0Y29uc3QgcGFzc2VzID0gKHRlcm0sIHNraXApID0+ICghaGl0cyB8fCBoaXRzLmhhcyh0ZXJtLmlkKSkgJiYgRklMVEVSRUQuZXZlcnkoKGtpbmQpID0+IGtpbmQgPT09IHNraXAgfHwgaGFzQW55KHRlcm0sIGtpbmQpKTtcblxuXHQvKiogVGhlIHRlcm1zIGluIHZpZXc6IGZpbHRlcnMgYW5kIHNlYXJjaCB0b2dldGhlci4gKi9cblx0Y29uc3QgZmlsdGVyZWQgPSAoKSA9PiAodmlldyA/Pz0gdGVybXMuZmlsdGVyKCh0ZXJtKSA9PiBwYXNzZXModGVybSkpKTtcblxuXHQvKipcblx0ICogVGVybXMgcGVyIHRhZyBvZiBga2luZGAsIHVuZGVyIGV2ZXJ5IG90aGVyIHNlbGVjdGlvbiBhbmQgdGhlIHNlYXJjaC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGtpbmRcblx0ICogQHJldHVybnMge1RhZ1tdfVxuXHQgKi9cblx0Y29uc3QgY291bnRUYWdzID0gKGtpbmQpID0+IHtcblx0XHRjb25zdCBjb3VudHMgPSBuZXcgTWFwKCk7XG5cdFx0Zm9yIChjb25zdCB0ZXJtIG9mIHRlcm1zKSB7XG5cdFx0XHRpZiAoIXBhc3Nlcyh0ZXJtLCBraW5kKSkgY29udGludWU7XG5cdFx0XHRmb3IgKGNvbnN0IHRhZyBvZiB0ZXJtLnRhZ3Nba2luZF0pIGNvdW50cy5zZXQodGFnLmtleSwgKGNvdW50cy5nZXQodGFnLmtleSkgPz8gMCkgKyAxKTtcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGEudGFnc1traW5kXS5tYXAoKHRhZykgPT4gKHsgLi4udGFnLCBuOiBjb3VudHMuZ2V0KHRhZy5rZXkpID8/IDAgfSkpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBXcmFwIHRoZSBtYXRjaGVkIGNoYXJhY3RlcnMgb2YgYSB0ZXJtJ3MgSFRNTCBpbiA8bWFyaz47IHRoZSBIVE1MIGNvbWVzIGJhY2sgdW5jaGFuZ2VkIGlmIHRoZVxuXHQgKiBjaGFyYWN0ZXJzIGRvIG5vdCBsaW5lIHVwIHdpdGggdGhlIHRlcm0ncyBrZXkuXG5cdCAqIEBwYXJhbSB7VGVybX0gdGVybVxuXHQgKiBAcGFyYW0ge1NldDxudW1iZXI+fG51bGx8dW5kZWZpbmVkfSBtYXJrc1xuXHQgKi9cblx0Y29uc3QgaGlnaGxpZ2h0ID0gKHRlcm0sIG1hcmtzKSA9PiB7XG5cdFx0aWYgKCFtYXJrcykgcmV0dXJuIHRlcm0udGVybTtcblx0XHRjb25zdCBib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGVtcGxhdGVcIik7XG5cdFx0Ym94LmlubmVySFRNTCA9IHRlcm0udGVybTtcblx0XHRjb25zdCB3YWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGJveC5jb250ZW50LCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG5cdFx0Y29uc3Qgbm9kZXMgPSBbXTtcblx0XHR3aGlsZSAod2Fsa2VyLm5leHROb2RlKCkpIG5vZGVzLnB1c2god2Fsa2VyLmN1cnJlbnROb2RlKTtcblx0XHRsZXQgcG9zaXRpb24gPSAwO1xuXHRcdGNvbnN0IHBsYW5zID0gW107XG5cdFx0Zm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG5cdFx0XHRjb25zdCBwYXJ0cyA9IFtdO1xuXHRcdFx0Zm9yIChjb25zdCBjaGFyIG9mIG5vZGUuZGF0YSkge1xuXHRcdFx0XHRjb25zdCBmb2xkZWQgPSBhbG51bShjaGFyKTtcblx0XHRcdFx0aWYgKGZvbGRlZC5sZW5ndGggPiAxKSByZXR1cm4gdGVybS50ZXJtO1xuXHRcdFx0XHRjb25zdCBvbiA9IGZvbGRlZC5sZW5ndGggPT09IDEgJiYgbWFya3MuaGFzKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKGZvbGRlZC5sZW5ndGggPT09IDEpIHBvc2l0aW9uICs9IDE7XG5cdFx0XHRcdGlmIChwYXJ0cy5hdCgtMSk/Lm9uID09PSBvbikgcGFydHMuYXQoLTEpLnRleHQgKz0gY2hhcjtcblx0XHRcdFx0ZWxzZSBwYXJ0cy5wdXNoKHsgdGV4dDogY2hhciwgb24gfSk7XG5cdFx0XHR9XG5cdFx0XHRwbGFucy5wdXNoKFtub2RlLCBwYXJ0c10pO1xuXHRcdH1cblx0XHRpZiAocG9zaXRpb24gIT09IHRlcm0ua2V5Lmxlbmd0aCkgcmV0dXJuIHRlcm0udGVybTtcblx0XHRmb3IgKGNvbnN0IFtub2RlLCBwYXJ0c10gb2YgcGxhbnMpIHtcblx0XHRcdGlmICghcGFydHMuc29tZSgocGFydCkgPT4gcGFydC5vbikpIGNvbnRpbnVlO1xuXHRcdFx0Y29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0XHRmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcblx0XHRcdFx0aWYgKCFwYXJ0Lm9uKSBmcmFnbWVudC5hcHBlbmQocGFydC50ZXh0KTtcblx0XHRcdFx0ZWxzZSBmcmFnbWVudC5hcHBlbmQoT2JqZWN0LmFzc2lnbihkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibWFya1wiKSwgeyB0ZXh0Q29udGVudDogcGFydC50ZXh0IH0pKTtcblx0XHRcdH1cblx0XHRcdG5vZGUucmVwbGFjZVdpdGgoZnJhZ21lbnQpO1xuXHRcdH1cblx0XHRyZXR1cm4gYm94LmlubmVySFRNTDtcblx0fTtcblxuXHQvKipcblx0ICogR3JvdXAgdGVybXMgdW5kZXIgdGhlIGNob3NlbiBvcmRlcjogQSB0byBaICh0aGUgbG9hZGVyJ3MgcmFuayBhbmQgZ3JvdXBzKSBvciBhIHRhZyBraW5kLlxuXHQgKiBBIHRlcm0gd2l0aCBzZXZlcmFsIHRhZ3Mgb2YgYSBraW5kIGFwcGVhcnMgdW5kZXIgZWFjaC4gV2l0aCBhIHF1ZXJ5LCBhIGdyb3VwIGxpc3RzIGl0c1xuXHQgKiBiZXN0IG1hdGNoZXMgZmlyc3QuXG5cdCAqIEBwYXJhbSB7VGVybVtdfSBsaXN0XG5cdCAqL1xuXHRjb25zdCBncm91cHMgPSAobGlzdCkgPT4ge1xuXHRcdGNvbnN0IHNldHMgPSBbXTtcblx0XHRpZiAoc3RhdGUuYnkgPT09IFwiYXpcIikge1xuXHRcdFx0Y29uc3QgYnlMZXR0ZXIgPSBuZXcgTWFwKCk7XG5cdFx0XHRmb3IgKGNvbnN0IHRlcm0gb2YgWy4uLmxpc3RdLnNvcnQoKGEsIGIpID0+IGEuYXpPcmRlciAtIGIuYXpPcmRlcikpIHtcblx0XHRcdFx0aWYgKCFieUxldHRlci5oYXModGVybS5hekdyb3VwLmtleSkpIGJ5TGV0dGVyLnNldCh0ZXJtLmF6R3JvdXAua2V5LCB7IC4uLnRlcm0uYXpHcm91cCwgaXRlbXM6IFtdIH0pO1xuXHRcdFx0XHRieUxldHRlci5nZXQodGVybS5hekdyb3VwLmtleSkuaXRlbXMucHVzaCh0ZXJtKTtcblx0XHRcdH1cblx0XHRcdHNldHMucHVzaCguLi5ieUxldHRlci52YWx1ZXMoKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGJ5VGFnID0gbmV3IE1hcCgpO1xuXHRcdFx0Zm9yIChjb25zdCB0ZXJtIG9mIGxpc3QpIHtcblx0XHRcdFx0Zm9yIChjb25zdCB0YWcgb2YgdGVybS50YWdzW3N0YXRlLmJ5XSkge1xuXHRcdFx0XHRcdGlmICghYnlUYWcuaGFzKHRhZy5rZXkpKSBieVRhZy5zZXQodGFnLmtleSwgeyAuLi50YWcsIGl0ZW1zOiBbXSB9KTtcblx0XHRcdFx0XHRieVRhZy5nZXQodGFnLmtleSkuaXRlbXMucHVzaCh0ZXJtKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0c2V0cy5wdXNoKC4uLlsuLi5ieVRhZy52YWx1ZXMoKV0uc29ydCgoYSwgYikgPT4gYS5vcmRlciAtIGIub3JkZXIpKTtcblx0XHR9XG5cdFx0aWYgKGhpdHMpIGZvciAoY29uc3Qgc2V0IG9mIHNldHMpIHNldC5pdGVtcy5zb3J0KChhLCBiKSA9PiBoaXRzLmdldChhLmlkKS5zY29yZSAtIGhpdHMuZ2V0KGIuaWQpLnNjb3JlKTtcblx0XHRyZXR1cm4gc2V0cztcblx0fTtcblxuXHQvKipcblx0ICogQXJyb3cga2V5cyBtb3ZlIHRocm91Z2ggYSBncm91cCBvZiB0b2dnbGVzLCBzZWxlY3RpbmcgYXMgdGhleSBnby5cblx0ICogQHBhcmFtIHtIVE1MRWxlbWVudH0gY29udGFpbmVyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciB0aGUgdG9nZ2xlc1xuXHQgKiBAcGFyYW0geyhidXR0b246IEhUTUxFbGVtZW50KSA9PiB2b2lkfSBzZWxlY3Rcblx0ICogQHBhcmFtIHtib29sZWFufSBbd3JhcF0gd2hldGhlciB0aGUgZW5kcyBsb29wIHJvdW5kXG5cdCAqL1xuXHRjb25zdCByb3ZpbmcgPSAoY29udGFpbmVyLCBzZWxlY3Rvciwgc2VsZWN0LCB3cmFwID0gdHJ1ZSkgPT4ge1xuXHRcdGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZXZlbnQpID0+IHtcblx0XHRcdGNvbnN0IGJ1dHRvbnMgPSBbLi4uY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpXTtcblx0XHRcdGNvbnN0IGF0ID0gYnV0dG9ucy5pbmRleE9mKC8qKiBAdHlwZSB7SFRNTEVsZW1lbnR9ICovIChkb2N1bWVudC5hY3RpdmVFbGVtZW50KSk7XG5cdFx0XHRpZiAoYXQgPCAwKSByZXR1cm47XG5cdFx0XHRjb25zdCBzdGVwID0geyBBcnJvd1JpZ2h0OiAxLCBBcnJvd0Rvd246IDEsIEFycm93TGVmdDogLTEsIEFycm93VXA6IC0xIH1bZXZlbnQua2V5XTtcblx0XHRcdGNvbnN0IG1vdmVkID0gYXQgKyAoc3RlcCA/PyAwKTtcblx0XHRcdGNvbnN0IG5leHQgPSBldmVudC5rZXkgPT09IFwiSG9tZVwiID8gMCA6IGV2ZW50LmtleSA9PT0gXCJFbmRcIiA/IGJ1dHRvbnMubGVuZ3RoIC0gMSA6IHN0ZXAgPyAod3JhcCA/IChtb3ZlZCArIGJ1dHRvbnMubGVuZ3RoKSAlIGJ1dHRvbnMubGVuZ3RoIDogbW92ZWQpIDogLTE7XG5cdFx0XHRpZiAobmV4dCA8IDAgfHwgbmV4dCA+PSBidXR0b25zLmxlbmd0aCkgcmV0dXJuO1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGJ1dHRvbnNbbmV4dF0uZm9jdXMoKTtcblx0XHRcdHNlbGVjdChidXR0b25zW25leHRdKTtcblx0XHR9KTtcblx0fTtcblxuXHQvLyAtLS0tIENvbnRyb2xzLCBidWlsdCBvbmNlIGFuZCB1cGRhdGVkIGluIHBsYWNlIHNvIGZvY3VzIHN0YXlzIHB1dCAtLS0tXG5cblx0Ly8gR3JvdXAgYnkgaXMgbmF0aXZlIHJhZGlvczogdGhlIGJyb3dzZXIgZG9lcyB0aGUgYXJyb3cga2V5cywgYW5kIGBjaGFuZ2VgIGZvbGxvd3MgdGhlbS5cblx0ZWxzLmJ5LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKGV2ZW50KSA9PiB7XG5cdFx0aWYgKGV2ZW50LnRhcmdldC5tYXRjaGVzKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKSkge1xuXHRcdFx0c3RhdGUuYnkgPSBldmVudC50YXJnZXQudmFsdWU7XG5cdFx0XHRyZW5kZXIoKTtcblx0XHR9XG5cdH0pO1xuXHQvLyBSZXZpZXcgLyBGbGFzaGNhcmRzIGFyZSB0YWJzOiBhIHJvdmluZyB0YWJpbmRleCwgYXJyb3dzIGFuZCBIb21lIC8gRW5kIHdpdGggd3JhcCwgYWN0aXZhdGluZyBhcyB0aGV5IG1vdmUuXG5cdGVscy50YWJzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZXZlbnQpID0+IHtcblx0XHRjb25zdCBidXR0b24gPSBldmVudC50YXJnZXQuY2xvc2VzdChcIltkYXRhLW1vZGVdXCIpO1xuXHRcdGlmIChidXR0b24pIHNldE1vZGUoYnV0dG9uLmRhdGFzZXQubW9kZSk7XG5cdH0pO1xuXHRyb3ZpbmcoZWxzLnRhYnMsIFwiW2RhdGEtbW9kZV1cIiwgKGJ1dHRvbikgPT4gc2V0TW9kZShidXR0b24uZGF0YXNldC5tb2RlKSk7XG5cblx0LyoqIEB0eXBlIHtNYXA8c3RyaW5nLCBIVE1MQnV0dG9uRWxlbWVudD59ICovXG5cdGNvbnN0IGNoaXBzID0gbmV3IE1hcCgpO1xuXHRmb3IgKGNvbnN0IGtpbmQgb2YgRklMVEVSUykge1xuXHRcdGNvbnN0IHJvdyA9IHEoYFtkYXRhLWNoaXBzPVwiJHtraW5kfVwiXWApO1xuXHRcdGZvciAoY29uc3QgdGFnIG9mIGRhdGEudGFnc1traW5kXSkge1xuXHRcdFx0Y29uc3QgY2hpcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XG5cdFx0XHRjaGlwLnR5cGUgPSBcImJ1dHRvblwiO1xuXHRcdFx0Y2hpcC5jbGFzc05hbWUgPSBcImNoaXBcIjtcblx0XHRcdGNoaXAuZGF0YXNldC5raW5kID0ga2luZDtcblx0XHRcdGNoaXAuZGF0YXNldC5rZXkgPSB0YWcua2V5O1xuXHRcdFx0Y2hpcC5pbm5lckhUTUwgPSBgPHNwYW4gY2xhc3M9XCJ0XCI+JHtlc2ModGFnLmxhYmVsKX08L3NwYW4+PHNwYW4gY2xhc3M9XCJuXCI+PC9zcGFuPmA7XG5cdFx0XHRjaGlwcy5zZXQoYCR7a2luZH06JHt0YWcua2V5fWAsIGNoaXApO1xuXHRcdFx0cm93LmFwcGVuZChjaGlwKTtcblx0XHR9XG5cdFx0cm93LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZXZlbnQpID0+IHtcblx0XHRcdGNvbnN0IGNoaXAgPSBldmVudC50YXJnZXQuY2xvc2VzdChcIltkYXRhLWtleV1cIik7XG5cdFx0XHRpZiAoIWNoaXApIHJldHVybjtcblx0XHRcdGNvbnN0IHNldCA9IHN0YXRlLmZpbHRlcnNba2luZF07XG5cdFx0XHRpZiAoIXNldC5kZWxldGUoY2hpcC5kYXRhc2V0LmtleSkpIHNldC5hZGQoY2hpcC5kYXRhc2V0LmtleSk7XG5cdFx0XHRyZW5kZXIoKTtcblx0XHR9KTtcblx0fVxuXG5cdGVscy5zdGF0dXMuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdGlmICghZXZlbnQudGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1jbGVhcl1cIikpIHJldHVybjtcblx0XHRmb3IgKGNvbnN0IGtpbmQgb2YgRklMVEVSRUQpIHN0YXRlLmZpbHRlcnNba2luZF0uY2xlYXIoKTtcblx0XHRyZW5kZXIoKTtcblx0XHRlbHMuc3VtbWFyeS5mb2N1cygpO1xuXHR9KTtcblxuXHRlbHMucGlsbHMuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdGNvbnN0IHBpbGwgPSBldmVudC50YXJnZXQuY2xvc2VzdChcIltkYXRhLWtleV1cIik7XG5cdFx0aWYgKCFwaWxsKSByZXR1cm47XG5cdFx0c3RhdGUuZmlsdGVycy5tZWV0aW5nLmRlbGV0ZShwaWxsLmRhdGFzZXQua2V5KTtcblx0XHRyZW5kZXIoKTtcblx0XHQoZWxzLnBpbGxzUm93LmhpZGRlbiA/IGVscy5zdW1tYXJ5IDogZWxzLnBpbGxzLnF1ZXJ5U2VsZWN0b3IoXCJidXR0b25cIikpPy5mb2N1cygpO1xuXHR9KTtcblxuXHRsZXQgdHlwaW5nID0gMDtcblx0ZWxzLnEuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsICgpID0+IHtcblx0XHRjbGVhclRpbWVvdXQodHlwaW5nKTtcblx0XHR0eXBpbmcgPSBzZXRUaW1lb3V0KCgpID0+IHNldFF1ZXJ5KGVscy5xLnZhbHVlKSwgMTAwKTtcblx0fSk7XG5cdGVscy5xLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldmVudCkgPT4ge1xuXHRcdGlmIChldmVudC5rZXkgIT09IFwiRXNjYXBlXCIgfHwgIWVscy5xLnZhbHVlKSByZXR1cm47XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRzZXRRdWVyeShcIlwiKTtcblx0fSk7XG5cdGVscy5jbGVhclEuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcblx0XHRzZXRRdWVyeShcIlwiKTtcblx0XHRlbHMucS5mb2N1cygpO1xuXHR9KTtcblxuXHQvKiogQHBhcmFtIHtzdHJpbmd9IHZhbHVlICovXG5cdGZ1bmN0aW9uIHNldFF1ZXJ5KHZhbHVlKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHR5cGluZyk7XG5cdFx0ZWxzLnEudmFsdWUgPSB2YWx1ZTtcblx0XHRzdGF0ZS5xID0gdmFsdWU7XG5cdFx0cmVuZGVyKCk7XG5cdH1cblxuXHRmdW5jdGlvbiByZW5kZXJDb250cm9scygpIHtcblx0XHRmb3IgKGNvbnN0IGlucHV0IG9mIGVscy5ieS5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKSkgaW5wdXQuY2hlY2tlZCA9IGlucHV0LnZhbHVlID09PSBzdGF0ZS5ieTtcblx0XHRmb3IgKGNvbnN0IGJ1dHRvbiBvZiBlbHMudGFicy5jaGlsZHJlbikge1xuXHRcdFx0Y29uc3Qgb24gPSBidXR0b24uZGF0YXNldC5tb2RlID09PSBzdGF0ZS5tb2RlO1xuXHRcdFx0YnV0dG9uLnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgU3RyaW5nKG9uKSk7XG5cdFx0XHRidXR0b24udGFiSW5kZXggPSBvbiA/IDAgOiAtMTtcblx0XHR9XG5cdFx0Zm9yIChjb25zdCBraW5kIG9mIEZJTFRFUlMpIHtcblx0XHRcdGZvciAoY29uc3QgdGFnIG9mIGNvdW50VGFncyhraW5kKSkge1xuXHRcdFx0XHRjb25zdCBjaGlwID0gY2hpcHMuZ2V0KGAke2tpbmR9OiR7dGFnLmtleX1gKTtcblx0XHRcdFx0Y29uc3Qgb24gPSBzdGF0ZS5maWx0ZXJzW2tpbmRdLmhhcyh0YWcua2V5KTtcblx0XHRcdFx0Y2hpcC5zZXRBdHRyaWJ1dGUoXCJhcmlhLXByZXNzZWRcIiwgU3RyaW5nKG9uKSk7XG5cdFx0XHRcdGNoaXAuZGlzYWJsZWQgPSAhdGFnLm4gJiYgIW9uO1xuXHRcdFx0XHRjaGlwLnF1ZXJ5U2VsZWN0b3IoXCIublwiKS50ZXh0Q29udGVudCA9IFN0cmluZyh0YWcubik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNvbnN0IHBpbGxzID0gWy4uLnN0YXRlLmZpbHRlcnMubWVldGluZ10ubWFwKChrZXkpID0+IHRhZ3NPZi5tZWV0aW5nLmdldChrZXkpKTtcblx0XHRlbHMucGlsbHNSb3cuaGlkZGVuID0gIXBpbGxzLmxlbmd0aDtcblx0XHRlbHMucGlsbHMuaW5uZXJIVE1MID0gcGlsbHNcblx0XHRcdC5tYXAoKHRhZykgPT4gYDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2hpcCBwaWxsXCIgZGF0YS1raW5kPVwibWVldGluZ1wiIGRhdGEta2V5PVwiJHtlc2ModGFnLmtleSl9XCIgYXJpYS1sYWJlbD1cIiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcInJlbW92ZUZpbHRlclwiLCB7IGtpbmQ6IHQoXCJnbG9zc2FyeVwiLCBcImJ5TWVldGluZ1wiKS50b0xvd2VyQ2FzZSgpLCBsYWJlbDogdGFnLmxhYmVsIH0pKX1cIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJtZWV0aW5nQ2hpcFwiLCB7IGxhYmVsOiB0YWcubGFiZWwgfSkpfTwvYnV0dG9uPmApXG5cdFx0XHQuam9pbihcIlwiKTtcblx0XHRlbHMuY2xlYXJRLmhpZGRlbiA9ICFzdGF0ZS5xO1xuXHRcdGNvbnN0IGFjdGl2ZSA9IEZJTFRFUkVELnJlZHVjZSgoc3VtLCBraW5kKSA9PiBzdW0gKyBzdGF0ZS5maWx0ZXJzW2tpbmRdLnNpemUsIDApO1xuXHRcdGVscy5zdW1tYXJ5LnRleHRDb250ZW50ID0gW3QoXCJnbG9zc2FyeVwiLCBcImZpbHRlclN1bW1hcnlcIiwgeyByZWFkaW5nOiBsYWJlbC50b0xvd2VyQ2FzZSgpIH0pLCBhY3RpdmUgPyB0KFwiZ2xvc3NhcnlcIiwgXCJmaWx0ZXJzT25cIiwgeyBjb3VudDogYWN0aXZlIH0pIDogXCJcIl0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgXCIpO1xuXHRcdGVscy5zdGF0dXMuaW5uZXJIVE1MID0gYCR7ZXNjKGFjdGl2ZSA/IHQoXCJnbG9zc2FyeVwiLCBcImNvdW50XCIsIHsgc2hvd246IGZpbHRlcmVkKCkubGVuZ3RoLCB0b3RhbDogdGVybXMubGVuZ3RoIH0pIDogdChcImdsb3NzYXJ5XCIsIFwidGVybXNcIiwgeyBjb3VudDogdGVybXMubGVuZ3RoIH0pKX0ke2FjdGl2ZSA/IGAke2VzYyh0KFwiY29tbW9uXCIsIFwic2VwXCIpKX08YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWNsZWFyPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcImNsZWFyRmlsdGVyc1wiKSl9PC9idXR0b24+YCA6IFwiXCJ9YDtcblx0XHRlbHMucmV2aWV3LmhpZGRlbiA9IHN0YXRlLm1vZGUgIT09IFwicmV2aWV3XCI7XG5cdFx0ZWxzLnN0dWR5LmhpZGRlbiA9IHN0YXRlLm1vZGUgIT09IFwic3R1ZHlcIjtcblx0fVxuXG5cdC8vIC0tLS0gUmV2aWV3IC0tLS1cblxuXHQvKiogQHBhcmFtIHtUZXJtfSB0ZXJtICovXG5cdGNvbnN0IHNsaWRlTGlua3MgPSAodGVybSkgPT5cblx0XHR0ZXJtLnRhdWdodC5tYXAoKHBsYWNlKSA9PiBgPGEgaHJlZj1cIiR7ZXNjKEJBU0UgKyBwbGFjZS5ocmVmLnNsaWNlKDEpKX1cIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJzbGlkZVJlZlwiLCB7IHdlZWs6IHBsYWNlLndlZWssIHdlZWtkYXk6IHBsYWNlLndlZWtkYXksIHNsaWRlOiBwbGFjZS5zbGlkZSB9KSl9PC9hPmApLmpvaW4oXCJcIikgK1xuXHRcdCh0ZXJtLnJlZiA/IGA8YSBocmVmPVwiJHtlc2ModGVybS5yZWYuaHJlZil9XCI+JHtlc2ModGVybS5yZWYubGFiZWwpfTwvYT5gIDogXCJcIik7XG5cblx0LyoqIEBwYXJhbSB7VGVybX0gdGVybSAqL1xuXHRjb25zdCB0YWdMaXN0ID0gKHRlcm0pID0+XG5cdFx0YDx1bCBjbGFzcz1cInRhZ3NcIiByb2xlPVwibGlzdFwiPiR7S0lORFMuZmxhdE1hcCgoa2luZCkgPT4gdGVybS50YWdzW2tpbmRdLm1hcCgodGFnKSA9PiBgPGxpIGRhdGEta2luZD1cIiR7a2luZH1cIj4ke2VzYyh0YWcubGFiZWwpfTwvbGk+YCkpLmpvaW4oXCJcIil9PC91bD5gO1xuXG5cdGZ1bmN0aW9uIHJlbmRlclJldmlldygpIHtcblx0XHRjb25zdCBsaXN0ID0gZmlsdGVyZWQoKTtcblx0XHRpZiAoIWxpc3QubGVuZ3RoKSB7XG5cdFx0XHRlbHMucmV2aWV3LmlubmVySFRNTCA9IGA8ZGl2IGNsYXNzPVwiZW1wdHlcIj48c3Ryb25nPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcIm5vTWF0Y2hcIikpfTwvc3Ryb25nPjxzcGFuPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcIm5vTWF0Y2hIaW50XCIpKX08L3NwYW4+PC9kaXY+YDtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3Qgc2V0cyA9IGdyb3VwcyhsaXN0KTtcblx0XHRjb25zdCBpZCA9IChzZXQpID0+IGBnLSR7c3RhdGUuYnl9LSR7c2x1ZyhzZXQua2V5KX1gO1xuXHRcdGVscy5yZXZpZXcuaW5uZXJIVE1MID0gc2V0c1xuXHRcdFx0Lm1hcChcblx0XHRcdFx0KHNldCkgPT4gYDxzZWN0aW9uIGNsYXNzPVwiZ3JvdXBcIiBpZD1cIiR7aWQoc2V0KX1cIiR7c3RhdGUuYnkgPT09IFwiYXpcIiA/IFwiXCIgOiBgIGRhdGEta2luZD1cIiR7c3RhdGUuYnl9XCJgfSBhcmlhLWxhYmVsbGVkYnk9XCIke2lkKHNldCl9LWhcIj5cblx0XHRcdFx0PGgyIGNsYXNzPVwiaGVhZGluZ1wiIGlkPVwiJHtpZChzZXQpfS1oXCI+PHNwYW4gY2xhc3M9XCJuYW1lXCI+JHtlc2Moc2V0LmxhYmVsKX08L3NwYW4+PHNwYW4gY2xhc3M9XCJhc2lkZVwiPiR7c2V0LndoZW4gPyBgPHNwYW4gY2xhc3M9XCJ3aGVuXCI+JHtlc2Moc2V0LndoZW4pfTwvc3Bhbj5gIDogXCJcIn0ke3N0YXRlLmJ5ID09PSBcIm1lZXRpbmdcIiA/IGA8c3BhbiBjbGFzcz1cImRlY2tcIj4ke2VzYyhzZXQuZGVjayl9PC9zcGFuPmAgOiBcIlwifTxzcGFuIGNsYXNzPVwiY291bnRcIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJ0ZXJtc1wiLCB7IGNvdW50OiBzZXQuaXRlbXMubGVuZ3RoIH0pKX08L3NwYW4+PC9zcGFuPjwvaDI+XG5cdFx0XHRcdDxkbD4ke3NldC5pdGVtc1xuXHRcdFx0XHRcdC5tYXAoXG5cdFx0XHRcdFx0XHQodGVybSkgPT4gYDxkaXYgY2xhc3M9XCJlbnRyeVwiPlxuXHRcdFx0XHRcdDxkdD48c3BhbiBjbGFzcz1cInRlcm1cIj4ke2hpZ2hsaWdodCh0ZXJtLCBoaXRzPy5nZXQodGVybS5pZCk/Lm1hcmtzKX08L3NwYW4+JHt0ZXJtLmdyb3VwID8gYDxzcGFuIGNsYXNzPVwiYXBpLWdyb3VwXCI+JHtlc2ModGVybS5ncm91cCl9PC9zcGFuPmAgOiBcIlwifSR7c3RhdGUua25vd24uaGFzKHRlcm0uaWQpID8gYDxzcGFuIGNsYXNzPVwia25vd25cIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJrbm93blwiKSl9PC9zcGFuPmAgOiBcIlwifTwvZHQ+XG5cdFx0XHRcdFx0PGRkPiR7dGVybS5zaWcgPyBgPHAgY2xhc3M9XCJzaWdcIj4ke3Rlcm0uc2lnfTwvcD5gIDogXCJcIn08cCBjbGFzcz1cImRlZmluaXRpb25cIj4ke3Rlcm0uZGVmaW5pdGlvbn08L3A+JHt0ZXJtLm1ldGEgPyBgPHAgY2xhc3M9XCJtZXRhXCI+JHt0ZXJtLm1ldGF9PC9wPmAgOiBcIlwifSR7dGVybS5leGFtcGxlID8gYDxwIGNsYXNzPVwiZXhhbXBsZVwiPjxzcGFuIGNsYXNzPVwibGFiZWxcIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJleGFtcGxlXCIpKX08L3NwYW4+ICR7dGVybS5leGFtcGxlfTwvcD5gIDogXCJcIn0ke3RhZ0xpc3QodGVybSl9PHAgY2xhc3M9XCJsaW5rc1wiPiR7dGVybS50YXVnaHQubGVuZ3RoIHx8IHRlcm0ucmVmID8gYDxzcGFuIGNsYXNzPVwibGFiZWxcIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJ0YXVnaHRJblwiKSl9PC9zcGFuPmAgOiBcIlwifSR7c2xpZGVMaW5rcyh0ZXJtKX08L3A+PC9kZD5cblx0XHRcdFx0PC9kaXY+YCxcblx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0LmpvaW4oXCJcIil9PC9kbD5cblx0XHRcdDwvc2VjdGlvbj5gLFxuXHRcdFx0KVxuXHRcdFx0LmpvaW4oXCJcIik7XG5cdH1cblxuXHQvLyAtLS0tIEZsYXNoY2FyZHMgLS0tLVxuXG5cdC8qKiBAcGFyYW0ge1Rlcm19IHRlcm0gKi9cblx0Y29uc3QgdGVybVBhcnQgPSAodGVybSkgPT5cblx0XHRgPGRpdiBjbGFzcz1cImZyb250XCI+JHt0ZXJtLnRlcm19JHt0ZXJtLmdyb3VwID8gYDxzbWFsbD4ke2VzYyh0ZXJtLmdyb3VwKX08L3NtYWxsPmAgOiBcIlwifSR7dGVybS5zaWcgPyBgPHNwYW4gY2xhc3M9XCJzaWdcIj4ke3Rlcm0uc2lnfTwvc3Bhbj5gIDogXCJcIn08L2Rpdj5gO1xuXHQvKiogQHBhcmFtIHtUZXJtfSB0ZXJtICovXG5cdGNvbnN0IGRlZmluaXRpb25QYXJ0ID0gKHRlcm0pID0+IGA8ZGl2IGNsYXNzPVwiYmFja1wiPjxwIGNsYXNzPVwiZGVmaW5pdGlvblwiPiR7dGVybS5kZWZpbml0aW9ufTwvcD48L2Rpdj5gO1xuXHQvKiogQHBhcmFtIHtUZXJtfSB0ZXJtICovXG5cdGNvbnN0IHJlc3RQYXJ0ID0gKHRlcm0pID0+XG5cdFx0YDxkaXYgY2xhc3M9XCJiYWNrXCI+JHt0ZXJtLm1ldGEgPyBgPHAgY2xhc3M9XCJtZXRhXCI+JHt0ZXJtLm1ldGF9PC9wPmAgOiBcIlwifSR7dGVybS5leGFtcGxlID8gYDxwIGNsYXNzPVwiZXhhbXBsZVwiPjxzcGFuIGNsYXNzPVwibGFiZWxcIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJleGFtcGxlXCIpKX08L3NwYW4+ICR7dGVybS5leGFtcGxlfTwvcD5gIDogXCJcIn08cCBjbGFzcz1cImxpbmtzXCI+JHtzbGlkZUxpbmtzKHRlcm0pfTwvcD48L2Rpdj5gO1xuXG5cdC8qKiBWaXNpYmxlLCBpbiBSZXZpZXcgb3JkZXIsIG9uZSBjYXJkIHBlciB0ZXJtLCBtaW51cyB0aGUgb25lcyBrbm93bi4gKi9cblx0ZnVuY3Rpb24gc3RhcnRTdHVkeSgpIHtcblx0XHRjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuXHRcdGNvbnN0IHBvb2wgPSBbXTtcblx0XHRmb3IgKGNvbnN0IHNldCBvZiBncm91cHMoZmlsdGVyZWQoKSkpIHtcblx0XHRcdGZvciAoY29uc3QgdGVybSBvZiBzZXQuaXRlbXMpIHtcblx0XHRcdFx0aWYgKHNlZW4uaGFzKHRlcm0uaWQpIHx8IHN0YXRlLmtub3duLmhhcyh0ZXJtLmlkKSkgY29udGludWU7XG5cdFx0XHRcdHNlZW4uYWRkKHRlcm0uaWQpO1xuXHRcdFx0XHRwb29sLnB1c2godGVybSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChzdGF0ZS5zaHVmZmxlKSB7XG5cdFx0XHRmb3IgKGxldCBpID0gcG9vbC5sZW5ndGggLSAxOyBpID4gMDsgaSAtPSAxKSB7XG5cdFx0XHRcdGNvbnN0IGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKTtcblx0XHRcdFx0W3Bvb2xbaV0sIHBvb2xbal1dID0gW3Bvb2xbal0sIHBvb2xbaV1dO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRzdGF0ZS5kZWNrID0gcG9vbDtcblx0XHRzdGF0ZS5pZHggPSAwO1xuXHRcdHN0YXRlLnJldmVhbGVkID0gZmFsc2U7XG5cdFx0cmVuZGVyU3R1ZHkoXCIucmV2ZWFsXCIpO1xuXHR9XG5cblx0LyoqIEBwYXJhbSB7c3RyaW5nfSBbZm9jdXNdIHNlbGVjdG9yIHRvIGZvY3VzIGFmdGVyd2FyZDsgZGVmYXVsdCwgdGhlIGNvbnRyb2wgdGhhdCBoYWQgZm9jdXMgKi9cblx0ZnVuY3Rpb24gcmVuZGVyU3R1ZHkoZm9jdXMpIHtcblx0XHRjb25zdCBhY3QgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50Py5jbG9zZXN0Py4oXCJbZGF0YS1hY3RdXCIpPy5kYXRhc2V0LmFjdDtcblx0XHQvLyBNb3ZlIGZvY3VzIG9ubHkgd2hlbiB0aGUgcmVhZGVyIGlzIGFscmVhZHkgd29ya2luZyBpbiB0aGUgY2FyZHMuXG5cdFx0Y29uc3Qgd29ya2luZyA9IGVscy5zdHVkeS5jb250YWlucyhkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB8fCBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSBkb2N1bWVudC5ib2R5O1xuXHRcdGNvbnN0IHRvdGFsID0gZmlsdGVyZWQoKS5sZW5ndGg7XG5cdFx0Y29uc3Qga25vd25Db3VudCA9IGZpbHRlcmVkKCkuZmlsdGVyKCh0ZXJtKSA9PiBzdGF0ZS5rbm93bi5oYXModGVybS5pZCkpLmxlbmd0aDtcblx0XHRjb25zdCBjYXJkID0gc3RhdGUuZGVja1tzdGF0ZS5pZHhdO1xuXHRcdGNvbnN0IHRvcCA9IGA8ZGl2IGNsYXNzPVwic3R1ZHktdG9wXCI+PHNwYW4+JHtlc2MoW2NhcmQgPyB0KFwiZ2xvc3NhcnlcIiwgXCJjYXJkXCIsIHsgbjogc3RhdGUuaWR4ICsgMSwgdG90YWw6IHN0YXRlLmRlY2subGVuZ3RoIH0pIDogdChcImdsb3NzYXJ5XCIsIFwidG9TdHVkeVwiLCB7IGNvdW50OiBzdGF0ZS5kZWNrLmxlbmd0aCB9KSwgdChcImdsb3NzYXJ5XCIsIFwia25vd25PZlwiLCB7IGtub3duOiBrbm93bkNvdW50LCB0b3RhbCB9KV0uam9pbih0KFwiY29tbW9uXCIsIFwic2VwXCIpKSl9PC9zcGFuPlxuXHRcdFx0PGRpdiBjbGFzcz1cIm9wdHNcIj5cblx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjaGlwXCIgZGF0YS1hY3Q9XCJzaHVmZmxlXCIgYXJpYS1wcmVzc2VkPVwiJHtzdGF0ZS5zaHVmZmxlfVwiPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcInNodWZmbGVcIikpfTwvYnV0dG9uPlxuXHRcdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImNoaXBcIiBkYXRhLWFjdD1cImRpcmVjdGlvblwiIGFyaWEtcHJlc3NlZD1cIiR7c3RhdGUuZGlyZWN0aW9uID09PSBcImRlZlwifVwiPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcImRlZkZpcnN0XCIpKX08L2J1dHRvbj5cblx0XHRcdFx0JHtrbm93bkNvdW50ICYmIGNhcmQgPyBgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjaGlwXCIgZGF0YS1hY3Q9XCJyZXNldFwiPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcInJlc2V0S25vd25cIikpfTwvYnV0dG9uPmAgOiBcIlwifVxuXHRcdFx0PC9kaXY+PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwibWV0ZXJcIiByb2xlPVwicHJvZ3Jlc3NiYXJcIiBhcmlhLWxhYmVsPVwiJHtlc2ModChcImdsb3NzYXJ5XCIsIFwia25vd25NZXRlclwiKSl9XCIgYXJpYS12YWx1ZW1pbj1cIjBcIiBhcmlhLXZhbHVlbWF4PVwiJHt0b3RhbH1cIiBhcmlhLXZhbHVlbm93PVwiJHtrbm93bkNvdW50fVwiPjxpIHN0eWxlPVwiaW5saW5lLXNpemU6JHt0b3RhbCA/IE1hdGgucm91bmQoKGtub3duQ291bnQgLyB0b3RhbCkgKiAxMDApIDogMH0lXCI+PC9pPjwvZGl2PmA7XG5cblx0XHRsZXQgaHRtbDtcblx0XHRpZiAoIXRvdGFsKSB7XG5cdFx0XHRodG1sID0gYCR7dG9wfTxkaXYgY2xhc3M9XCJlbXB0eVwiPjxzdHJvbmc+JHtlc2ModChcImdsb3NzYXJ5XCIsIFwibm9NYXRjaFwiKSl9PC9zdHJvbmc+PHNwYW4+JHtlc2ModChcImdsb3NzYXJ5XCIsIFwibm9NYXRjaFN0dWR5XCIpKX08L3NwYW4+PC9kaXY+YDtcblx0XHR9IGVsc2UgaWYgKCFjYXJkKSB7XG5cdFx0XHRodG1sID0gYCR7dG9wfTxkaXYgY2xhc3M9XCJkb25lXCI+PGgyIGNsYXNzPVwiaGVhZGluZ1wiPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcImFsbEtub3duXCIpKX08L2gyPjxwPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcIm1hcmtlZEtub3duXCIsIHsga25vd246IGtub3duQ291bnQsIHRvdGFsIH0pKX08L3A+PGRpdiBjbGFzcz1cInZlcmRpY3RcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdD1cImFnYWluXCIgY2xhc3M9XCJwcmltYXJ5XCI+JHtlc2ModChcImdsb3NzYXJ5XCIsIFwic3RhcnRPdmVyXCIpKX08L2J1dHRvbj48L2Rpdj48L2Rpdj5gO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zdCB0ZXJtRmlyc3QgPSBzdGF0ZS5kaXJlY3Rpb24gPT09IFwidGVybVwiO1xuXHRcdFx0Y29uc3QgZnJvbnQgPSB0ZXJtRmlyc3QgPyB0ZXJtUGFydChjYXJkKSA6IGRlZmluaXRpb25QYXJ0KGNhcmQpO1xuXHRcdFx0Y29uc3QgYmFjayA9IHRlcm1GaXJzdCA/IGRlZmluaXRpb25QYXJ0KGNhcmQpIDogdGVybVBhcnQoY2FyZCk7XG5cdFx0XHRjb25zdCB0ZXN0cyA9IGNhcmQudGFncy50ZXN0Lm1hcCgodGFnKSA9PiBlc2ModGFnLmxhYmVsKSkuam9pbihcIiwgXCIpO1xuXHRcdFx0Y29uc3QgY2hhcHRlcnMgPSBjYXJkLnRhZ3MuY2hhcHRlci5zbGljZSgwLCAyKS5tYXAoKHRhZykgPT4gZXNjKHRhZy5sYWJlbCkpLmpvaW4oXCIsIFwiKTtcblx0XHRcdGh0bWwgPSBgJHt0b3B9XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjYXJkXCIgdGFiaW5kZXg9XCItMVwiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ0b3BcIj48c3BhbiBkYXRhLWtpbmQ9XCJ0ZXN0XCI+JHt0ZXN0c308L3NwYW4+PHNwYW4gZGF0YS1raW5kPVwiY2hhcHRlclwiPiR7Y2hhcHRlcnN9PC9zcGFuPjwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJjb250ZW50XCI+JHtzdGF0ZS5yZXZlYWxlZCA/IGZyb250ICsgYmFjayArIHJlc3RQYXJ0KGNhcmQpIDogZnJvbnR9PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImZvb3RcIj4ke3N0YXRlLnJldmVhbGVkID8gXCJcIiA6IGA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInJldmVhbCBwcmltYXJ5XCIgZGF0YS1hY3Q9XCJyZXZlYWxcIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgdGVybUZpcnN0ID8gXCJzaG93RGVmaW5pdGlvblwiIDogXCJzaG93VGVybVwiKSl9PC9idXR0b24+YH08L2Rpdj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdCR7c3RhdGUucmV2ZWFsZWQgPyBgPGRpdiBjbGFzcz1cInZlcmRpY3RcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInllc1wiIGRhdGEtYWN0PVwia25vd1wiPiR7ZXNjKHQoXCJnbG9zc2FyeVwiLCBcImlLbm93XCIpKX08L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdD1cImxhdGVyXCI+JHtlc2ModChcImdsb3NzYXJ5XCIsIFwibGF0ZXJcIikpfTwvYnV0dG9uPjwvZGl2PmAgOiBcIlwifVxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwibmF2XCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Q9XCJwcmV2XCIgJHtzdGF0ZS5pZHggPT09IDAgPyBcImRpc2FibGVkXCIgOiBcIlwifT4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJwcmV2XCIpKX08L2J1dHRvbj48c3BhbiBjbGFzcz1cImhpbnRcIj4ke2VzYyh0KFwiZ2xvc3NhcnlcIiwgXCJoaW50XCIpKX08L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Q9XCJuZXh0XCIgJHtzdGF0ZS5pZHggPj0gc3RhdGUuZGVjay5sZW5ndGggLSAxID8gXCJkaXNhYmxlZFwiIDogXCJcIn0+JHtlc2ModChcImdsb3NzYXJ5XCIsIFwibmV4dFwiKSl9PC9idXR0b24+PC9kaXY+YDtcblx0XHR9XG5cdFx0ZWxzLnN0dWR5LmlubmVySFRNTCA9IGh0bWw7XG5cblx0XHRpZiAod29ya2luZykge1xuXHRcdFx0Y29uc3QgdGFyZ2V0ID0gKGZvY3VzICYmIGVscy5zdHVkeS5xdWVyeVNlbGVjdG9yKGZvY3VzKSkgfHwgKGFjdCAmJiBlbHMuc3R1ZHkucXVlcnlTZWxlY3RvcihgW2RhdGEtYWN0PVwiJHthY3R9XCJdOm5vdCg6ZGlzYWJsZWQpYCkpO1xuXHRcdFx0KHRhcmdldCB8fCBlbHMuc3R1ZHkucXVlcnlTZWxlY3RvcihcIi5jYXJkXCIpIHx8IGVscy5zdHVkeS5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtYWN0XVwiKSk/LmZvY3VzKHsgcHJldmVudFNjcm9sbDogdHJ1ZSB9KTtcblx0XHR9XG5cblx0XHRlbHMuYW5ub3VuY2UudGV4dENvbnRlbnQgPSAhY2FyZFxuXHRcdFx0PyBcIlwiXG5cdFx0XHQ6IHN0YXRlLnJldmVhbGVkXG5cdFx0XHRcdD8gdChcImdsb3NzYXJ5XCIsIFwiZGVmU2hvd25cIiwgeyB0ZXJtOiBjYXJkLnBsYWluIH0pXG5cdFx0XHRcdDogdChcImdsb3NzYXJ5XCIsIFwiY2FyZFwiLCB7IG46IHN0YXRlLmlkeCArIDEsIHRvdGFsOiBzdGF0ZS5kZWNrLmxlbmd0aCB9KTtcblx0fVxuXG5cdC8qKiBAcGFyYW0ge3N0cmluZ30gYWN0ICovXG5cdGZ1bmN0aW9uIHN0dWR5QWN0aW9uKGFjdCkge1xuXHRcdGNvbnN0IGNhcmQgPSBzdGF0ZS5kZWNrW3N0YXRlLmlkeF07XG5cdFx0aWYgKGFjdCA9PT0gXCJyZXZlYWxcIiAmJiBjYXJkICYmICFzdGF0ZS5yZXZlYWxlZCkge1xuXHRcdFx0c3RhdGUucmV2ZWFsZWQgPSB0cnVlO1xuXHRcdFx0cmVuZGVyU3R1ZHkoXCIueWVzXCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoYWN0ID09PSBcImtub3dcIiAmJiBjYXJkKSB7XG5cdFx0XHRzdGF0ZS5rbm93bi5hZGQoY2FyZC5pZCk7XG5cdFx0XHRzYXZlS25vd24oKTtcblx0XHRcdHN0YXRlLmRlY2suc3BsaWNlKHN0YXRlLmlkeCwgMSk7XG5cdFx0XHRzdGF0ZS5pZHggPSBNYXRoLm1pbihzdGF0ZS5pZHgsIE1hdGgubWF4KHN0YXRlLmRlY2subGVuZ3RoIC0gMSwgMCkpO1xuXHRcdH0gZWxzZSBpZiAoYWN0ID09PSBcImxhdGVyXCIgJiYgY2FyZCkge1xuXHRcdFx0c3RhdGUuZGVjay5wdXNoKC4uLnN0YXRlLmRlY2suc3BsaWNlKHN0YXRlLmlkeCwgMSkpO1xuXHRcdH0gZWxzZSBpZiAoYWN0ID09PSBcInByZXZcIiAmJiBzdGF0ZS5pZHggPiAwKSB7XG5cdFx0XHRzdGF0ZS5pZHggLT0gMTtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJuZXh0XCIgJiYgc3RhdGUuaWR4IDwgc3RhdGUuZGVjay5sZW5ndGggLSAxKSB7XG5cdFx0XHRzdGF0ZS5pZHggKz0gMTtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJzaHVmZmxlXCIpIHtcblx0XHRcdHN0YXRlLnNodWZmbGUgPSAhc3RhdGUuc2h1ZmZsZTtcblx0XHRcdHN0YXJ0U3R1ZHkoKTtcblx0XHRcdHJldHVybjtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJkaXJlY3Rpb25cIikge1xuXHRcdFx0c3RhdGUuZGlyZWN0aW9uID0gc3RhdGUuZGlyZWN0aW9uID09PSBcInRlcm1cIiA/IFwiZGVmXCIgOiBcInRlcm1cIjtcblx0XHR9IGVsc2UgaWYgKGFjdCA9PT0gXCJyZXNldFwiIHx8IGFjdCA9PT0gXCJhZ2FpblwiKSB7XG5cdFx0XHRmb3IgKGNvbnN0IHRlcm0gb2YgZmlsdGVyZWQoKSkgc3RhdGUua25vd24uZGVsZXRlKHRlcm0uaWQpO1xuXHRcdFx0c2F2ZUtub3duKCk7XG5cdFx0XHRzdGFydFN0dWR5KCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0c3RhdGUucmV2ZWFsZWQgPSBmYWxzZTtcblx0XHRyZW5kZXJTdHVkeShhY3QgPT09IFwiZGlyZWN0aW9uXCIgPyB1bmRlZmluZWQgOiBcIi5yZXZlYWxcIik7XG5cdH1cblxuXHRlbHMuc3R1ZHkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChldmVudCkgPT4ge1xuXHRcdGNvbnN0IGJ1dHRvbiA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtYWN0XVwiKTtcblx0XHRpZiAoYnV0dG9uICYmICFidXR0b24uZGlzYWJsZWQpIHN0dWR5QWN0aW9uKGJ1dHRvbi5kYXRhc2V0LmFjdCk7XG5cdH0pO1xuXG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldmVudCkgPT4ge1xuXHRcdGlmIChzdGF0ZS5tb2RlICE9PSBcInN0dWR5XCIgfHwgZXZlbnQuYWx0S2V5IHx8IGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleSkgcmV0dXJuO1xuXHRcdGNvbnN0IHRhcmdldCA9IC8qKiBAdHlwZSB7SFRNTEVsZW1lbnR9ICovIChldmVudC50YXJnZXQpO1xuXHRcdGlmICh0YXJnZXQuY2xvc2VzdChcImlucHV0LCBzZWxlY3QsIHRleHRhcmVhLCBhLCBzdW1tYXJ5LCBbcm9sZT10YWJdLCBbcm9sZT1yYWRpb11cIikpIHJldHVybjtcblx0XHRpZiAoZXZlbnQua2V5ID09PSBcIiBcIiB8fCBldmVudC5rZXkgPT09IFwiRW50ZXJcIikge1xuXHRcdFx0Ly8gQSBmb2N1c2VkIGJ1dHRvbiBhbHJlYWR5IGFjdGl2YXRlcyBpdHNlbGYuXG5cdFx0XHRpZiAodGFyZ2V0LmNsb3Nlc3QoXCJidXR0b25cIikpIHJldHVybjtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRzdHVkeUFjdGlvbihcInJldmVhbFwiKTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gXCJBcnJvd1JpZ2h0XCIpIHtcblx0XHRcdHN0dWR5QWN0aW9uKFwibmV4dFwiKTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gXCJBcnJvd0xlZnRcIikge1xuXHRcdFx0c3R1ZHlBY3Rpb24oXCJwcmV2XCIpO1xuXHRcdH1cblx0fSwgeyBzaWduYWwgfSk7XG5cblx0Ly8gLS0tLSBNb2RlIGFuZCBVUkwgLS0tLVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSBcInJldmlld1wiIG9yIFwic3R1ZHlcIlxuXHQgKi9cblx0ZnVuY3Rpb24gc2V0TW9kZShtb2RlKSB7XG5cdFx0aWYgKG1vZGUgPT09IHN0YXRlLm1vZGUpIHJldHVybjtcblx0XHRzdGF0ZS5tb2RlID0gbW9kZTtcblx0XHRyZW5kZXIoKTtcblx0fVxuXG5cdC8qKiBBbiBvbGQgYCNzdHVkeWAgbGluayBzdGlsbCBvcGVucyBGbGFzaGNhcmRzLiAqL1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImhhc2hjaGFuZ2VcIiwgKCkgPT4ge1xuXHRcdGlmIChsb2NhdGlvbi5oYXNoID09PSBcIiNzdHVkeVwiKSBzZXRNb2RlKFwic3R1ZHlcIik7XG5cdH0sIHsgc2lnbmFsIH0pO1xuXG5cdC8qKiBLZWVwIHRoZSBsaW5rIGluIHN0ZXAgd2l0aCB0aGUgc3RhdGU6IG9ubHkgbm9uLWRlZmF1bHQgdmFsdWVzLCByZXBsYWNlZCwgbmV2ZXIgcHVzaGVkLiAqL1xuXHRmdW5jdGlvbiB3cml0ZVVybCgpIHtcblx0XHRjb25zdCBuZXh0ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpO1xuXHRcdGZvciAoY29uc3QgbmFtZSBvZiBQQVJBTVMpIG5leHQuZGVsZXRlKG5hbWUpO1xuXHRcdGlmIChzdGF0ZS5tb2RlID09PSBcInN0dWR5XCIpIG5leHQuc2V0KFwibW9kZVwiLCBcInN0dWR5XCIpO1xuXHRcdGlmIChzdGF0ZS5ieSAhPT0gXCJhelwiKSBuZXh0LnNldChcImdyb3VwXCIsIHN0YXRlLmJ5ID09PSBcImNoYXB0ZXJcIiA/IFwicmVhZGluZ1wiIDogc3RhdGUuYnkpO1xuXHRcdGNvbnN0IGtleXMgPSAoa2luZCkgPT4gWy4uLnN0YXRlLmZpbHRlcnNba2luZF1dLm1hcCgoa2V5KSA9PiAoa2luZCA9PT0gXCJ0ZXN0XCIgPyBrZXkucmVwbGFjZSgvXnRlc3QtLywgXCJcIikgOiBraW5kID09PSBcImNoYXB0ZXJcIiA/IHNsdWcoa2V5KSA6IGtleSkpO1xuXHRcdGlmIChzdGF0ZS5maWx0ZXJzLnRlc3Quc2l6ZSkgbmV4dC5zZXQoXCJ0ZXN0XCIsIGtleXMoXCJ0ZXN0XCIpLmpvaW4oXCIsXCIpKTtcblx0XHRpZiAoc3RhdGUuZmlsdGVycy5jaGFwdGVyLnNpemUpIG5leHQuc2V0KFwicmVhZGluZ1wiLCBrZXlzKFwiY2hhcHRlclwiKS5qb2luKFwiLFwiKSk7XG5cdFx0aWYgKHN0YXRlLmZpbHRlcnMubWVldGluZy5zaXplKSBuZXh0LnNldChcIm1lZXRpbmdcIiwga2V5cyhcIm1lZXRpbmdcIikuam9pbihcIixcIikpO1xuXHRcdGlmIChzdGF0ZS5xLnRyaW0oKSkgbmV4dC5zZXQoXCJxXCIsIHN0YXRlLnEpO1xuXHRcdGNvbnN0IHF1ZXJ5ID0gbmV4dC50b1N0cmluZygpLnJlcGxhY2UoLyUyQy9nLCBcIixcIik7XG5cdFx0Y29uc3QgaGFzaCA9IGxvY2F0aW9uLmhhc2ggPT09IFwiI3N0dWR5XCIgPyBcIlwiIDogbG9jYXRpb24uaGFzaDtcblx0XHRjb25zdCB1cmwgPSBsb2NhdGlvbi5wYXRobmFtZSArIChxdWVyeSA/IGA/JHtxdWVyeX1gIDogXCJcIikgKyBoYXNoO1xuXHRcdGlmICh1cmwgIT09IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoICsgbG9jYXRpb24uaGFzaCkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgXCJcIiwgdXJsKTtcblx0XHRcdH0gY2F0Y2gge1xuXHRcdFx0XHQvLyBBIHNhbmRib3hlZCBmcmFtZTogdGhlIGxpbmsganVzdCB3b24ndCBmb2xsb3cgdGhlIHN0YXRlLlxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRoaXRzID0gc2VhcmNoKCk7XG5cdFx0dmlldyA9IG51bGw7XG5cdFx0cmVuZGVyQ29udHJvbHMoKTtcblx0XHRyZW5kZXJSZXZpZXcoKTtcblx0XHRpZiAoc3RhdGUubW9kZSA9PT0gXCJzdHVkeVwiKSBzdGFydFN0dWR5KCk7XG5cdFx0d3JpdGVVcmwoKTtcblx0fVxuXG5cdGVscy5xLnZhbHVlID0gc3RhdGUucTtcblx0aWYgKEZJTFRFUkVELnNvbWUoKGtpbmQpID0+IHBhcmFtcy5oYXMoa2luZCA9PT0gXCJjaGFwdGVyXCIgPyBcInJlYWRpbmdcIiA6IGtpbmQpKSkgZWxzLmRldGFpbHMub3BlbiA9IHRydWU7XG5cdHJlbmRlcigpO1xuXHRyb290LnF1ZXJ5U2VsZWN0b3IoXCJbZGF0YS1zdGF0aWNdXCIpPy5yZW1vdmUoKTtcblx0YXBwLmhpZGRlbiA9IGZhbHNlO1xufVxuXG4vKiogVGhlIGdsb3NzYXJ5J3MgZWxlbWVudDogbW91bnRzIG9uY2Ugd2hlbiBpdCBqb2lucyB0aGUgcGFnZSwgYW5kIGxldHMgZ28gd2hlbiBpdCBsZWF2ZXMuICovXG5jbGFzcyBHbG9zc2FyeUFwcCBleHRlbmRzIEhUTUxFbGVtZW50IHtcblx0I2Fib3J0ID0gbnVsbDtcblxuXHRjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHRpZiAodGhpcy4jYWJvcnQpIHJldHVybjtcblx0XHR0aGlzLiNhYm9ydCA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcblx0XHRtb3VudCh0aGlzLCB0aGlzLiNhYm9ydC5zaWduYWwpO1xuXHR9XG5cblx0ZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG5cdFx0dGhpcy4jYWJvcnQ/LmFib3J0KCk7XG5cdFx0dGhpcy4jYWJvcnQgPSBudWxsO1xuXHR9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KFwiZ2xvc3NhcnktYXBwXCIpKSBjdXN0b21FbGVtZW50cy5kZWZpbmUoXCJnbG9zc2FyeS1hcHBcIiwgR2xvc3NhcnlBcHApO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQTJDQSxJQUFNLE9BQU8sS0FBSyxNQUFNLFNBQVMsZUFBZSxXQUFXLEdBQUcsZUFBZSxJQUFJO0FBRWpGLElBQU0sSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsTUFBTTtBQUNqQyxRQUFNLFFBQVEsS0FBSyxFQUFFLEtBQUssQ0FBQztBQUMzQixNQUFJLE9BQU8sTUFBTSxHQUFHO0FBQ3BCLE1BQUksV0FBVyxRQUFTLEdBQUcsR0FBRyxZQUFZLE9BQVE7QUFDakQsV0FBTyxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksS0FBSyxZQUFZLFNBQVMsZ0JBQWdCLFFBQVEsT0FBTyxFQUFFLE9BQU8sS0FBSyxLQUFLLENBQUMsRUFBRSxLQUFLLE1BQU0sR0FBRyxHQUFHLFFBQVE7QUFBQSxFQUNwSTtBQUNBLFNBQU8sT0FBTyxRQUFRLEVBQUUsRUFBRSxRQUFRLGNBQWMsQ0FBQyxHQUFHLFNBQVMsT0FBTyxLQUFLLElBQUksS0FBSyxFQUFFLENBQUM7QUFDdEY7QUFFQSxJQUFNLFFBQVEsQ0FBQyxRQUFRLFdBQVcsV0FBVyxPQUFPO0FBRXBELElBQU0sVUFBVSxDQUFDLFFBQVEsU0FBUztBQUVsQyxJQUFNLFdB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
