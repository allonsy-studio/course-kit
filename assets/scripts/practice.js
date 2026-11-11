/*
 * Grading for a practice worksheet page (see docs/components.md).
 *
 * Progressive enhancement: the page is a complete, printable worksheet with
 * the script off — every control is a real input, and the answers sit behind
 * the "Show the answer" disclosures. This file only adds the checking.
 *
 * The expected answers are read from the rendered markup rather than a second
 * copy of the data: each question's `data-answers` attribute is written by the
 * template from the same object the questions come from.
 */

/** Student-facing wording, rendered by the layout as one JSON block. */
const COPY = JSON.parse(document.getElementById("copy-data")?.textContent || "{}");
/** `t("home", "weeksDone", { done: 3, total: 16 })`; a key with `_one`/`_other` variants is picked by `count`. */
const t = (ns, key, vars = {}) => {
	const table = COPY[ns] ?? {};
	let text = table[key];
	if ("count" in vars && (`${key}_other` in table)) {
		text = table[`${key}_${new Intl.PluralRules(document.documentElement.lang || "en-US").select(vars.count)}`] ?? table[`${key}_other`];
	}
	return String(text ?? "").replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
};

/** Strip the decoration students may or may not type: tags, punctuation, case. */
const normalize = (value) =>
	value
		.toLowerCase()
		.replaceAll(/[<>/]/g, "")
		.replaceAll(/[·,;|]+/g, " ")
		.replaceAll(/\s+/g, " ")
		.trim();

/* eleventy.worksheets.js answers a built page from its own key and has to
   compare the way the page does. One copy of the rule, exercised by both. */
window.practice = { normalize };

/** The worksheet a control or question belongs to. */
const rootOf = (element) => element.closest("[data-worksheet]");

/**
 * @param {HTMLElement} root a `[data-worksheet]` element
 * @param {string} scope a CSS selector for the region to grade
 */
const questionsIn = (root, scope) => {
	// The whole-worksheet scope names the root itself, which querySelector never returns.
	const region = root.matches(scope) ? root : root.querySelector(scope);
	return [...(region?.querySelectorAll(".question") ?? [])];
};

/** The checked radio in a group, or null. */
const checkedValue = (question, name) => {
	const input = question.querySelector(`input[name="${name}"]:checked`);
	return input ? input.value : null;
};

/** Mark an element for the eye as well as the tally. */
const mark = (element, correct) => {
	if (!element) return;
	element.dataset.mark = correct ? "right" : "wrong";
	const key = element.querySelector(".answer-key");
	if (key) key.hidden = correct;
};

const clearMarks = (question) => {
	for (const marked of question.querySelectorAll("[data-mark]")) delete marked.dataset.mark;
	for (const key of question.querySelectorAll(".answer-key")) key.hidden = true;
};

/**
 * One grader per question kind, keyed by `data-kind`. Each marks its own
 * controls and reports what it found; a kind with no entry here is left to the
 * student, like `selfcheck`.
 * @type {Record<string, (question: HTMLElement, key: object, id: string) => {answered: boolean, right: number, total: number, blank: number}>}
 */
const GRADERS = {
	choice(question, key, id) {
		const picked = checkedValue(question, `${id}-choice`);
		if (picked === null) return { answered: false, right: 0, total: 1, blank: 1 };
		for (const label of question.querySelectorAll(".choice")) {
			const value = Number(label.querySelector("input").value);
			if (value === key.answer) mark(label, true);
			else if (value === Number(picked)) mark(label, false);
		}
		return { answered: true, right: Number(picked) === key.answer ? 1 : 0, total: 1, blank: 0 };
	},

	match(question, key) {
		let right = 0;
		let blank = 0;
		let answered = false;
		for (const [index, expected] of key.items.entries()) {
			const select = question.querySelector(`select[data-blank="${index}"]`);
			if (!select.value) {
				blank += 1;
				continue;
			}
			answered = true;
			const correct = select.value === expected;
			if (correct) right += 1;
			mark(select.closest("li"), correct);
		}
		return { answered, right, total: key.items.length, blank };
	},

	fill(question, key) {
		let right = 0;
		let blank = 0;
		let answered = false;
		for (const [index, accepted] of key.blanks.entries()) {
			const input = question.querySelector(`input[data-blank="${index}"]`);
			if (!input.value.trim()) {
				blank += 1;
				continue;
			}
			answered = true;
			const typed = normalize(input.value);
			const correct = accepted.some((option) => normalize(option) === typed);
			if (correct) right += 1;
			mark(input.closest("li"), correct);
		}
		return { answered, right, total: key.blanks.length, blank };
	},

	grid(question, key, id) {
		let right = 0;
		let blank = 0;
		let answered = false;
		for (const [index, expected] of key.rows.entries()) {
			const picked = checkedValue(question, `${id}-row-${index}`);
			if (picked === null) {
				blank += 1;
				continue;
			}
			answered = true;
			const correct = Number(picked) === expected;
			if (correct) right += 1;
			mark(question.querySelector(`tr[data-row="${index}"]`), correct);
		}
		return { answered, right, total: key.rows.length, blank };
	},

	judge(question, key, id) {
		const verdict = checkedValue(question, `${id}-choice`);
		const line = checkedValue(question, `${id}-line`);
		if (verdict === null && line === null) return { answered: false, right: 0, total: 2, blank: 2 };
		let right = 0;

		for (const label of question.querySelectorAll(".verdicts .choice")) {
			const value = Number(label.querySelector("input").value);
			if (value === key.answer) mark(label, true);
			else if (value === Number(verdict)) mark(label, false);
		}
		if (Number(verdict) === key.answer) right += 1;

		// A snippet with no offending line makes "none" the right pick.
		const expected = key.lines.length ? key.lines.map(String) : ["none"];
		for (const label of question.querySelectorAll(".code-lines .code-line")) {
			const value = label.querySelector("input").value;
			if (expected.includes(value)) mark(label, true);
			else if (value === line) mark(label, false);
		}
		if (line !== null && expected.includes(line)) right += 1;

		return { answered: true, right, total: 2, blank: (verdict === null ? 1 : 0) + (line === null ? 1 : 0) };
	},
};

/* A tree is a fill whose blanks are laid out as a diagram. */
GRADERS.tree = GRADERS.fill;

/* ---- Status ------------------------------------------------------------
 * unattempted | answered | right | wrong | partial | self, on `data-state`
 * of the question and of its entry in the question list. */

const STATUS_KEY = {
	unattempted: "statusUnattempted",
	answered: "statusAnswered",
	right: "statusRight",
	wrong: "statusWrong",
	partial: "statusPartial",
	self: "statusSelf",
};

const isGradable = (question) => question.dataset.kind in GRADERS;

/** Whether any part of the question holds a value. */
const hasValue = (question) =>
	[...question.querySelectorAll("input[type='radio']")].some((input) => input.checked) ||
	[...question.querySelectorAll("input[type='text'], select")].some((control) => control.value.trim() !== "");

/** @param {HTMLElement} question @param {string} state */
const setState = (question, state) => {
	question.dataset.state = state;
};

/** Remove the feedback line, marks and revealed reasoning of a question. */
function clearFeedback(question) {
	clearMarks(question);
	const feedback = question.querySelector(".feedback");
	feedback.hidden = true;
	feedback.textContent = "";
	question.querySelector(".why").hidden = true;
}

/**
 * Grade one question: mark its controls, write its feedback line, set its
 * status. Questions with no grader are left to the student.
 * @param {HTMLElement} question
 * @returns {"right"|"wrong"|"partial"|"unattempted"|"self"}
 */
function check(question) {
	if (!isGradable(question)) {
		const reveal = question.querySelector("[data-reveal]");
		if (reveal) reveal.open = true;
		return "self";
	}
	const { kind, question: id } = question.dataset;
	clearMarks(question);
	const { answered, right, total, blank } = GRADERS[kind](question, JSON.parse(question.dataset.answers ?? "{}"), id);
	const feedback = question.querySelector(".feedback");
	const why = question.querySelector(".why");
	feedback.hidden = false;

	if (!answered) {
		setState(question, "unattempted");
		feedback.textContent = t("worksheet", "feedbackUnattempted");
		why.hidden = true;
		return "unattempted";
	}

	const wrong = total - right - blank > 0;
	const state = right === total ? "right" : wrong ? "wrong" : "partial";
	setState(question, state);
	feedback.textContent =
		state === "right"
			? total > 1
				? t("worksheet", "feedbackRightAll", { total })
				: t("worksheet", "feedbackRight")
			: t("worksheet", "feedbackParts", { right, total }) +
				(blank > 0 ? t("common", "sep") + t("worksheet", "feedbackBlank", { count: blank }) : "");
	why.hidden = false;
	return state;
}

/** Clear one question back to unattempted. */
function reset(question) {
	clearFeedback(question);
	for (const input of question.querySelectorAll("input[type='radio']")) input.checked = false;
	for (const input of question.querySelectorAll("input[type='text']")) input.value = "";
	for (const select of question.querySelectorAll("select")) select.value = "";
	for (const row of question.querySelectorAll("[data-dropped], [data-over]")) {
		delete row.dataset.dropped;
		delete row.dataset.over;
	}
	markUsedWords(question);
	for (const details of question.querySelectorAll("[data-reveal]")) details.open = false;
	setState(question, isGradable(question) ? "unattempted" : "self");
}

/** Mirror each question's status onto its entry in the question list. */
function syncNav(root) {
	for (const question of questionsIn(root, "#worksheet")) {
		const item = root.querySelector(`[data-nav-for="${question.dataset.question}"]`);
		if (!item) continue;
		const state = question.dataset.state ?? "unattempted";
		item.dataset.state = state;
		const status = item.querySelector(".nav-status");
		if (status) status.textContent = t("worksheet", STATUS_KEY[state]);
	}
}

/* ---- Saved answers ------------------------------------------------------
 * localStorage, one key per question: `ck-ws:v1:<storage-id>:<question-id>`.
 * Every access is in try/catch; with storage unavailable (a private window,
 * a file:// copy, an upload to Brightspace) the page works and saves nothing. */

const PREFIX = "ck-ws:v1:";

/** djb2, base 36: enough to notice that a question's key changed. */
const hashOf = (text) => {
	let hash = 5381;
	for (const char of text) hash = ((hash << 5) + hash + char.codePointAt(0)) | 0;
	return (hash >>> 0).toString(36);
};

const storageKey = (root, question) => `${PREFIX}${root.dataset.storageId}:${question.dataset.question}`;

const storageGet = (key) => {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
};
const storageSet = (key, value) => {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Storage is unavailable or full: nothing is saved.
	}
};
const storageRemove = (key) => {
	try {
		localStorage.removeItem(key);
	} catch {
		// Nothing to remove.
	}
};

/** The question's current answers: radios by `name`, selects and texts by blank. */
function collect(question) {
	const answers = {};
	for (const input of question.querySelectorAll("input[type='radio']:checked")) answers[input.name] = input.value;
	for (const [tag, selector] of [
		["select", "select"],
		["text", "input[type='text']"],
	]) {
		for (const [index, control] of [...question.querySelectorAll(selector)].entries()) {
			if (control.value.trim() !== "") answers[`${tag}:${control.dataset.blank ?? index}`] = control.value;
		}
	}
	return answers;
}

/** Put saved answers back into the question's controls. */
function apply(question, answers) {
	for (const [key, value] of Object.entries(answers)) {
		const [tag, blank] = key.split(":");
		if (blank === undefined) {
			const input = [...question.querySelectorAll("input[type='radio']")].find((item) => item.name === key && item.value === value);
			if (input) input.checked = true;
			continue;
		}
		const selector = tag === "select" ? "select" : "input[type='text']";
		const controls = [...question.querySelectorAll(selector)];
		const control = controls.find((item) => item.dataset.blank === blank) ?? controls[Number(blank)];
		if (control) control.value = value;
	}
	markUsedWords(question);
}

/** Save a question, or drop its key when it is empty. */
function save(root, question, checked = false) {
	const answers = collect(question);
	const key = storageKey(root, question);
	if (!Object.keys(answers).length) return storageRemove(key);
	storageSet(key, JSON.stringify({ v: 1, h: hashOf(question.dataset.answers ?? ""), t: Date.now(), checked, a: answers }));
}

/** Restore a worksheet's saved answers. @returns {number} the newest save time, or 0 */
function restore(root) {
	let newest = 0;
	for (const question of questionsIn(root, "#worksheet")) {
		if (!isGradable(question)) continue;
		const key = storageKey(root, question);
		const raw = storageGet(key);
		if (raw === null) continue;
		let saved;
		try {
			saved = JSON.parse(raw);
		} catch {
			saved = null;
		}
		if (saved?.v !== 1 || saved.h !== hashOf(question.dataset.answers ?? "") || typeof saved.a !== "object") {
			storageRemove(key);
			continue;
		}
		apply(question, saved.a);
		newest = Math.max(newest, saved.t ?? 0);
		if (saved.checked) check(question);
		else setState(question, hasValue(question) ? "answered" : "unattempted");
	}
	return newest;
}

/** Old-shape keys are ignored and pruned. */
function prune() {
	try {
		for (const key of Object.keys(localStorage)) {
			if (key.startsWith("ck-ws:") && !key.startsWith(PREFIX)) localStorage.removeItem(key);
		}
	} catch {
		// No storage, nothing to prune.
	}
}

/* ---- Scores and summary -------------------------------------------------- */

const tallyFor = (root, scope) => root.querySelector(`[data-tally="${scope}"]`);

/** @param {HTMLElement[]} questions */
function counts(questions) {
	const found = { right: 0, wrong: 0, partial: 0, unattempted: 0, self: 0, total: 0 };
	for (const question of questions) {
		if (!isGradable(question)) {
			found.self += 1;
			continue;
		}
		found.total += 1;
		const state = question.dataset.state;
		if (state in found) found[state] += 1;
		else found.unattempted += 1;
	}
	return found;
}

/** `2 of 23 correct · 1 to try again · 20 unattempted` */
function tallyText(found) {
	const parts = [t("worksheet", "tallyCorrect", { right: found.right, total: found.total })];
	if (found.wrong) parts.push(t("worksheet", "tallyWrong", { count: found.wrong }));
	if (found.partial) parts.push(t("worksheet", "tallyPartial", { count: found.partial }));
	if (found.unattempted) parts.push(t("worksheet", "tallyUnattempted", { count: found.unattempted }));
	if (found.self) parts.push(t("worksheet", "tallySelf", { count: found.self }));
	return parts.join(t("common", "sep"));
}

/** Fill and show the results panel with every question. */
function summarize(root, found, questions) {
	const panel = root.querySelector("[data-summary]");
	if (!panel) return;
	panel.querySelector("[data-score]").textContent = String(found.right);
	panel.querySelector("[data-score-of]").textContent = t("worksheet", "scoreOf", { total: found.total });
	const list = panel.querySelector("[data-summary-list]");
	list.replaceChildren();
	for (const question of questions) {
		const status = isGradable(question) ? (question.dataset.state ?? "unattempted") : "self";
		const item = document.createElement("li");
		item.dataset.status = status;
		const link = document.createElement("a");
		link.href = `#q-${question.dataset.question}`;
		link.textContent = question.dataset.question;
		const label = document.createElement("span");
		label.textContent = t("worksheet", STATUS_KEY[status]);
		item.append(link, " ", label);
		list.append(item);
	}
	panel.querySelector("[data-retry]").hidden = !(found.wrong || found.partial || found.unattempted);
	panel.hidden = false;
	const heading = panel.querySelector("h2");
	heading.tabIndex = -1;
	heading.focus();
}

const hideSummary = (root) => {
	const panel = root.querySelector("[data-summary]");
	if (panel) panel.hidden = true;
};

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("click", (event) => {
	const checkButton = event.target.closest("[data-check]");
	if (checkButton) {
		const root = rootOf(checkButton);
		const scope = checkButton.dataset.check;
		const questions = questionsIn(root, scope);
		for (const question of questions) {
			check(question);
			if (isGradable(question)) save(root, question, true);
		}
		const found = counts(questions);
		const tally = tallyFor(root, scope);
		if (tally) tally.textContent = tallyText(found);
		if (scope === "#worksheet") summarize(root, found, questions);
		syncNav(root);
		return;
	}

	const oneButton = event.target.closest("[data-check-one]");
	if (oneButton) {
		const root = rootOf(oneButton);
		const question = oneButton.closest(".question");
		check(question);
		if (isGradable(question)) save(root, question, true);
		syncNav(root);
		return;
	}

	const retryButton = event.target.closest("[data-retry]");
	if (retryButton) {
		const root = rootOf(retryButton);
		const questions = questionsIn(root, retryButton.dataset.retry);
		const found = counts(questions);
		for (const question of questions) {
			if (question.dataset.state !== "wrong" && question.dataset.state !== "partial") continue;
			reset(question);
			storageRemove(storageKey(root, question));
		}
		hideSummary(root);
		const tally = tallyFor(root, retryButton.dataset.retry);
		if (tally) tally.textContent = t("worksheet", "retryCount", { count: found.wrong + found.partial + found.unattempted });
		syncNav(root);
		const first = questions.find((question) => isGradable(question) && question.dataset.state !== "right");
		const control = first?.querySelector("input, select, textarea");
		if (control) {
			control.focus();
			control.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
		}
		return;
	}

	const resetButton = event.target.closest("[data-reset]");
	if (resetButton) {
		if (!window.confirm(resetButton.dataset.confirm)) return;
		const root = rootOf(resetButton);
		const scope = resetButton.dataset.reset;
		for (const question of questionsIn(root, scope)) {
			reset(question);
			storageRemove(storageKey(root, question));
		}
		const tally = tallyFor(root, scope);
		if (tally) tally.textContent = "";
		hideSummary(root);
		if (scope === "#worksheet") {
			const note = root.querySelector("[data-restore-note]");
			if (note) note.hidden = true;
		}
		syncNav(root);
	}
});

/* Editing an answer: the old verdict no longer applies. Nothing is regraded. */
const onEdit = (event) => {
	const question = event.target.closest?.(".question");
	if (!question || !isGradable(question)) return;
	const root = rootOf(question);
	if (!root) return;
	clearFeedback(question);
	setState(question, hasValue(question) ? "answered" : "unattempted");
	save(root, question, false);
	syncNav(root);
};
document.addEventListener("input", onEdit);
document.addEventListener("change", onEdit);

/* Citation panels are an exclusive group through `<details name>`; Escape
   closes whichever is open. */
document.addEventListener("keydown", (event) => {
	if (event.key !== "Escape") return;
	for (const open of document.querySelectorAll(".cite[open]")) open.open = false;
});

/*
 * Drag and drop, for the questions whose data asks for it.
 *
 * A pointer affordance layered over the real control, never a replacement for
 * it: the <select> or text input stays the keyboard, touch and screen-reader
 * path (HTML5 drag events do not fire from touch), and a drop just sets its
 * value. Nothing here is needed to answer a question.
 */
const DROPPED_MS = 700;

/** Mark the bank words that already appear in this question's blanks. */
function markUsedWords(question) {
	const bank = question.querySelectorAll(".word-bank .word[data-word]");
	if (!bank.length) return;
	const typed = [...question.querySelectorAll(".blanks input[type='text']")]
		.flatMap((input) => normalize(input.value).split(" "))
		.filter(Boolean);
	for (const word of bank) {
		if (typed.includes(normalize(word.dataset.word))) word.dataset.used = "";
		else delete word.dataset.used;
	}
}

for (const chip of document.querySelectorAll('[draggable="true"][data-letter], [draggable="true"][data-word]')) {
	const payload = chip.dataset.letter ?? chip.dataset.word;
	chip.addEventListener("dragstart", (event) => {
		event.dataTransfer.setData("text/plain", payload);
		event.dataTransfer.effectAllowed = "copy";
		chip.dataset.dragging = "";
	});
	chip.addEventListener("dragend", () => delete chip.dataset.dragging);
}

/**
 * Apply a dropped value to the row's control.
 * A select takes the letter outright; a text blank appends, because one of
 * them holds three words.
 * @returns {boolean} whether anything was set
 */
function applyDrop(row, dropped) {
	const select = row.querySelector("select");
	if (select) {
		if (![...select.options].some((option) => option.value === dropped)) return false;
		select.value = dropped;
		select.dispatchEvent(new Event("change", { bubbles: true }));
		return true;
	}

	const input = row.querySelector("input[type='text']");
	if (!input) return false;
	const current = input.value.trim();
	if (normalize(current).split(" ").includes(normalize(dropped))) return false;
	input.value = current ? `${current}, ${dropped}` : dropped;
	input.dispatchEvent(new Event("input", { bubbles: true }));
	return true;
}

for (const row of document.querySelectorAll("[data-drop]")) {
	// The drop only lands if dragover cancels the default.
	row.addEventListener("dragover", (event) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
		row.dataset.over = "";
	});
	row.addEventListener("dragleave", (event) => {
		if (!row.contains(event.relatedTarget)) delete row.dataset.over;
	});
	row.addEventListener("drop", (event) => {
		event.preventDefault();
		delete row.dataset.over;
		const dropped = event.dataTransfer.getData("text/plain");
		if (!dropped || !applyDrop(row, dropped)) return;
		row.dataset.dropped = "";
		setTimeout(() => delete row.dataset.dropped, DROPPED_MS);
		markUsedWords(row.closest(".question"));
	});
}

/* Typing by hand keeps the word bank honest too. */
for (const question of document.querySelectorAll(".question[data-kind='fill']")) {
	question.addEventListener("input", () => markUsedWords(question));
	markUsedWords(question);
}

/* On load: show the buttons, restore saved answers, start the question list. */
prune();
for (const root of document.querySelectorAll("[data-worksheet]")) {
	for (const button of root.querySelectorAll("[data-check], [data-reset], [data-check-one]")) button.hidden = false;
	for (const question of questionsIn(root, "#worksheet")) {
		if (!isGradable(question)) setState(question, "self");
		else if (!question.dataset.state) setState(question, "unattempted");
	}
	const newest = restore(root);
	const note = root.querySelector("[data-restore-note]");
	if (newest && note) {
		const when = new Intl.DateTimeFormat(document.documentElement.lang || "en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(newest);
		note.textContent = t("worksheet", "restored", { when });
		note.hidden = false;
	}
	syncNav(root);
}
