/*
 * Grading for a practice worksheet page (see docs/worksheets.md).
 *
 * Progressive enhancement: the page is a complete, printable worksheet with
 * the script off — every control is a real input, and the answers sit behind
 * the "Show the answer" disclosures. This file only adds the checking.
 *
 * The expected answers are read from the rendered markup rather than a second
 * copy of the data: each question's `data-answers` attribute is written by the
 * template from the same object the questions come from.
 */

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

/** @param {string} scope a CSS selector for the region to grade */
const questionsIn = (scope) => [...(document.querySelector(scope)?.querySelectorAll(".question") ?? [])];

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
 * @type {Record<string, (question: HTMLElement, key: object, id: string) => {answered: boolean, right: number, total: number}>}
 */
const GRADERS = {
	choice(question, key, id) {
		const picked = checkedValue(question, `${id}-choice`);
		if (picked === null) return { answered: false, right: 0, total: 1 };
		for (const label of question.querySelectorAll(".choice")) {
			const value = Number(label.querySelector("input").value);
			if (value === key.answer) mark(label, true);
			else if (value === Number(picked)) mark(label, false);
		}
		return { answered: true, right: Number(picked) === key.answer ? 1 : 0, total: 1 };
	},

	match(question, key) {
		let right = 0;
		let answered = false;
		for (const [index, expected] of key.items.entries()) {
			const select = question.querySelector(`select[data-blank="${index}"]`);
			if (!select.value) continue;
			answered = true;
			const correct = select.value === expected;
			if (correct) right += 1;
			mark(select.closest("li"), correct);
		}
		return { answered, right, total: key.items.length };
	},

	fill(question, key) {
		let right = 0;
		let answered = false;
		for (const [index, accepted] of key.blanks.entries()) {
			const input = question.querySelector(`input[data-blank="${index}"]`);
			if (!input.value.trim()) continue;
			answered = true;
			const typed = normalize(input.value);
			const correct = accepted.some((option) => normalize(option) === typed);
			if (correct) right += 1;
			mark(input.closest("li"), correct);
		}
		return { answered, right, total: key.blanks.length };
	},

	grid(question, key, id) {
		let right = 0;
		let answered = false;
		for (const [index, expected] of key.rows.entries()) {
			const picked = checkedValue(question, `${id}-row-${index}`);
			if (picked === null) continue;
			answered = true;
			const correct = Number(picked) === expected;
			if (correct) right += 1;
			mark(question.querySelector(`tr[data-row="${index}"]`), correct);
		}
		return { answered, right, total: key.rows.length };
	},

	judge(question, key, id) {
		const verdict = checkedValue(question, `${id}-choice`);
		const line = checkedValue(question, `${id}-line`);
		if (verdict === null && line === null) return { answered: false, right: 0, total: 2 };
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

		return { answered: true, right, total: 2 };
	},
};

/* A tree is a fill whose blanks are laid out as a diagram. */
GRADERS.tree = GRADERS.fill;

/**
 * Grade one question.
 * @param {HTMLElement} question
 * @returns {{answered: boolean, right: number, total: number}}
 */
function grade(question) {
	const { kind, question: id } = question.dataset;
	clearMarks(question);
	const grader = GRADERS[kind];
	if (!grader) return { answered: false, right: 0, total: 0 };
	return grader(question, JSON.parse(question.dataset.answers ?? "{}"), id);
}

/** Grade one question and write its feedback line. */
function check(question) {
	if (!GRADERS[question.dataset.kind]) {
		const reveal = question.querySelector("[data-reveal]");
		if (reveal) reveal.open = true;
		return null;
	}

	const { answered, right, total } = grade(question);
	const feedback = question.querySelector(".feedback");
	const why = question.querySelector(".why");

	if (!answered) {
		question.removeAttribute("data-state");
		feedback.hidden = false;
		feedback.textContent = "Not answered yet.";
		why.hidden = true;
		return { right: 0, total };
	}

	const perfect = right === total;
	question.dataset.state = perfect ? "right" : "wrong";
	feedback.hidden = false;
	feedback.textContent = perfect
		? total > 1
			? `Correct — all ${total}.`
			: "Correct."
		: `Try again: ${right} of ${total} correct.`;
	why.hidden = false;
	return { right, total };
}

/** Clear one question back to unanswered. */
function reset(question) {
	clearMarks(question);
	question.removeAttribute("data-state");
	for (const input of question.querySelectorAll("input[type='radio']")) input.checked = false;
	for (const input of question.querySelectorAll("input[type='text']")) input.value = "";
	for (const select of question.querySelectorAll("select")) select.value = "";
	for (const row of question.querySelectorAll("[data-dropped], [data-over]")) {
		delete row.dataset.dropped;
		delete row.dataset.over;
	}
	markUsedWords(question);
	for (const details of question.querySelectorAll("[data-reveal]")) details.open = false;
	const feedback = question.querySelector(".feedback");
	feedback.hidden = true;
	feedback.textContent = "";
	question.querySelector(".why").hidden = true;
}

/** A question's status for the question list and the results: checked right, checked wrong, or not checked. */
const STATUS = { right: "Correct", wrong: "Try again", open: "Not checked" };
const stateOf = (question) => question.dataset.state ?? "open";
const gradable = () => [...document.querySelectorAll(".question")].filter((question) => GRADERS[question.dataset.kind]);

const questionNav = document.querySelector("[data-question-nav]");
const results = document.querySelector("[data-results]");

/** One row per gradable question: its number badge (or a mark once checked) and its status, linked to it. */
const statusRows = () =>
	gradable()
		.map((question) => {
			const state = stateOf(question);
			const badge = state === "right" ? "✓" : state === "wrong" ? "✕" : question.dataset.question;
			return `<li data-state="${state}"><a href="#${question.id}"><span class="badge" aria-hidden="true">${badge}</span><span>Question ${question.dataset.question}</span> <span class="status">${STATUS[state]}</span></a></li>`;
		})
		.join("");

/** Redraw the question list and, when it is showing, the results. */
function refreshStatus() {
	if (questionNav) questionNav.querySelector("ol").innerHTML = statusRows();
	if (!results || results.hidden) return;
	const questions = gradable();
	const right = questions.filter((question) => stateOf(question) === "right").length;
	results.querySelector("[data-score]").textContent = String(right);
	results.querySelector("[data-score-of]").textContent = `of ${questions.length}`;
	results.querySelector(".result-rows").innerHTML = statusRows();
	results.querySelector("[data-retry-results]").hidden = right === questions.length;
}

const tallyFor = (scope) => document.querySelector(`[data-tally="${scope}"]`);
const retryFor = (scope) => document.querySelector(`[data-retry="${scope}"]`);

document.addEventListener("click", (event) => {
	const oneButton = event.target.closest("[data-check-one]");
	if (oneButton) {
		check(oneButton.closest(".question"));
		refreshStatus();
		return;
	}

	if (event.target.closest("[data-see-results]") && results) {
		for (const question of gradable()) if (stateOf(question) === "open") check(question);
		results.hidden = false;
		refreshStatus();
		results.focus();
		return;
	}

	const checkButton = event.target.closest("[data-check]");
	if (checkButton) {
		const scope = checkButton.dataset.check;
		let right = 0;
		let total = 0;
		let selfMarked = 0;
		for (const question of questionsIn(scope)) {
			const result = check(question);
			if (!result) {
				selfMarked += 1;
				continue;
			}
			right += result.right;
			total += result.total;
		}
		const tally = tallyFor(scope);
		if (tally) {
			const note = selfMarked ? ` · ${selfMarked} ${tally.dataset.note || "self-marked"}` : "";
			tally.textContent = total ? `${right} of ${total}${note}` : "";
		}
		const retry = retryFor(scope);
		if (retry) retry.hidden = !questionsIn(scope).some((question) => question.dataset.state === "wrong");
		refreshStatus();
		return;
	}

	const retryButton = event.target.closest("[data-retry]");
	if (retryButton) {
		const scope = retryButton.dataset.retry;
		const missed = questionsIn(scope).filter((question) => question.dataset.state === "wrong");
		for (const question of missed) reset(question);
		retryButton.hidden = true;
		const tally = tallyFor(scope);
		if (tally) tally.textContent = "";
		if (results) results.hidden = true;
		refreshStatus();
		const first = missed[0]?.querySelector("input, select, textarea, button");
		first?.focus();
		return;
	}

	const resetButton = event.target.closest("[data-reset]");
	if (resetButton) {
		const scope = resetButton.dataset.reset;
		for (const question of questionsIn(scope)) reset(question);
		const tally = tallyFor(scope);
		if (tally) tally.textContent = "";
		const retry = retryFor(scope);
		if (retry) retry.hidden = true;
		if (results) results.hidden = true;
		refreshStatus();
	}
});

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

/* The buttons ship hidden so a no-JS reader is never offered a dead control. */
for (const button of document.querySelectorAll("[data-check], [data-reset]")) {
	button.hidden = false;
}

/* Self-marked questions have nothing to check, so they get no button. */
for (const question of gradable()) {
	const button = question.querySelector("[data-check-one]");
	if (button) button.hidden = false;
}

if (questionNav && gradable().length) {
	questionNav.hidden = false;
	refreshStatus();
}
