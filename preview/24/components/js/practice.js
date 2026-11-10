// assets/scripts/practice.js
var normalize = (value) => value.toLowerCase().replaceAll(/[<>/]/g, "").replaceAll(/[·,;|]+/g, " ").replaceAll(/\s+/g, " ").trim();
window.practice = { normalize };
var questionsIn = (scope) => [...document.querySelector(scope)?.querySelectorAll(".question") ?? []];
var checkedValue = (question, name) => {
  const input = question.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : null;
};
var mark = (element, correct) => {
  if (!element) return;
  element.dataset.mark = correct ? "right" : "wrong";
  const key = element.querySelector(".answer-key");
  if (key) key.hidden = correct;
};
var clearMarks = (question) => {
  for (const marked of question.querySelectorAll("[data-mark]")) delete marked.dataset.mark;
  for (const key of question.querySelectorAll(".answer-key")) key.hidden = true;
};
var GRADERS = {
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
    const expected = key.lines.length ? key.lines.map(String) : ["none"];
    for (const label of question.querySelectorAll(".code-lines .code-line")) {
      const value = label.querySelector("input").value;
      if (expected.includes(value)) mark(label, true);
      else if (value === line) mark(label, false);
    }
    if (line !== null && expected.includes(line)) right += 1;
    return { answered: true, right, total: 2 };
  }
};
GRADERS.tree = GRADERS.fill;
function grade(question) {
  const { kind, question: id } = question.dataset;
  clearMarks(question);
  const grader = GRADERS[kind];
  if (!grader) return { answered: false, right: 0, total: 0 };
  return grader(question, JSON.parse(question.dataset.answers ?? "{}"), id);
}
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
  feedback.textContent = perfect ? total > 1 ? `Correct \u2014 all ${total}.` : "Correct." : `Try again: ${right} of ${total} correct.`;
  why.hidden = false;
  return { right, total };
}
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
var STATUS = { right: "Correct", wrong: "Try again", open: "Not checked" };
var stateOf = (question) => question.dataset.state ?? "open";
var gradable = () => [...document.querySelectorAll(".question")].filter((question) => GRADERS[question.dataset.kind]);
var questionNav = document.querySelector("[data-question-nav]");
var results = document.querySelector("[data-results]");
var statusRows = () => gradable().map((question) => {
  const state = stateOf(question);
  const badge = state === "right" ? "\u2713" : state === "wrong" ? "\u2715" : question.dataset.question;
  return `<li data-state="${state}"><a href="#${question.id}"><span class="badge" aria-hidden="true">${badge}</span><span>Question ${question.dataset.question}</span> <span class="status">${STATUS[state]}</span></a></li>`;
}).join("");
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
var tallyFor = (scope) => document.querySelector(`[data-tally="${scope}"]`);
var retryFor = (scope) => document.querySelector(`[data-retry="${scope}"]`);
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
      const note = selfMarked ? ` \xB7 ${selfMarked} ${tally.dataset.note || "self-marked"}` : "";
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
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  for (const open of document.querySelectorAll(".cite[open]")) open.open = false;
});
var DROPPED_MS = 700;
function markUsedWords(question) {
  const bank = question.querySelectorAll(".word-bank .word[data-word]");
  if (!bank.length) return;
  const typed = [...question.querySelectorAll(".blanks input[type='text']")].flatMap((input) => normalize(input.value).split(" ")).filter(Boolean);
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
for (const question of document.querySelectorAll(".question[data-kind='fill']")) {
  question.addEventListener("input", () => markUsedWords(question));
  markUsedWords(question);
}
for (const button of document.querySelectorAll("[data-check], [data-reset]")) {
  button.hidden = false;
}
for (const question of gradable()) {
  const button = question.querySelector("[data-check-one]");
  if (button) button.hidden = false;
}
if (questionNav && gradable().length) {
  questionNav.hidden = false;
  refreshStatus();
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvcHJhY3RpY2UuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qXG4gKiBHcmFkaW5nIGZvciBhIHByYWN0aWNlIHdvcmtzaGVldCBwYWdlIChzZWUgZG9jcy93b3Jrc2hlZXRzLm1kKS5cbiAqXG4gKiBQcm9ncmVzc2l2ZSBlbmhhbmNlbWVudDogdGhlIHBhZ2UgaXMgYSBjb21wbGV0ZSwgcHJpbnRhYmxlIHdvcmtzaGVldCB3aXRoXG4gKiB0aGUgc2NyaXB0IG9mZiBcdTIwMTQgZXZlcnkgY29udHJvbCBpcyBhIHJlYWwgaW5wdXQsIGFuZCB0aGUgYW5zd2VycyBzaXQgYmVoaW5kXG4gKiB0aGUgXCJTaG93IHRoZSBhbnN3ZXJcIiBkaXNjbG9zdXJlcy4gVGhpcyBmaWxlIG9ubHkgYWRkcyB0aGUgY2hlY2tpbmcuXG4gKlxuICogVGhlIGV4cGVjdGVkIGFuc3dlcnMgYXJlIHJlYWQgZnJvbSB0aGUgcmVuZGVyZWQgbWFya3VwIHJhdGhlciB0aGFuIGEgc2Vjb25kXG4gKiBjb3B5IG9mIHRoZSBkYXRhOiBlYWNoIHF1ZXN0aW9uJ3MgYGRhdGEtYW5zd2Vyc2AgYXR0cmlidXRlIGlzIHdyaXR0ZW4gYnkgdGhlXG4gKiB0ZW1wbGF0ZSBmcm9tIHRoZSBzYW1lIG9iamVjdCB0aGUgcXVlc3Rpb25zIGNvbWUgZnJvbS5cbiAqL1xuXG4vKiogU3RyaXAgdGhlIGRlY29yYXRpb24gc3R1ZGVudHMgbWF5IG9yIG1heSBub3QgdHlwZTogdGFncywgcHVuY3R1YXRpb24sIGNhc2UuICovXG5jb25zdCBub3JtYWxpemUgPSAodmFsdWUpID0+XG5cdHZhbHVlXG5cdFx0LnRvTG93ZXJDYXNlKClcblx0XHQucmVwbGFjZUFsbCgvWzw+L10vZywgXCJcIilcblx0XHQucmVwbGFjZUFsbCgvW1x1MDBCNyw7fF0rL2csIFwiIFwiKVxuXHRcdC5yZXBsYWNlQWxsKC9cXHMrL2csIFwiIFwiKVxuXHRcdC50cmltKCk7XG5cbi8qIGVsZXZlbnR5LndvcmtzaGVldHMuanMgYW5zd2VycyBhIGJ1aWx0IHBhZ2UgZnJvbSBpdHMgb3duIGtleSBhbmQgaGFzIHRvXG4gICBjb21wYXJlIHRoZSB3YXkgdGhlIHBhZ2UgZG9lcy4gT25lIGNvcHkgb2YgdGhlIHJ1bGUsIGV4ZXJjaXNlZCBieSBib3RoLiAqL1xud2luZG93LnByYWN0aWNlID0geyBub3JtYWxpemUgfTtcblxuLyoqIEBwYXJhbSB7c3RyaW5nfSBzY29wZSBhIENTUyBzZWxlY3RvciBmb3IgdGhlIHJlZ2lvbiB0byBncmFkZSAqL1xuY29uc3QgcXVlc3Rpb25zSW4gPSAoc2NvcGUpID0+IFsuLi4oZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzY29wZSk/LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucXVlc3Rpb25cIikgPz8gW10pXTtcblxuLyoqIFRoZSBjaGVja2VkIHJhZGlvIGluIGEgZ3JvdXAsIG9yIG51bGwuICovXG5jb25zdCBjaGVja2VkVmFsdWUgPSAocXVlc3Rpb24sIG5hbWUpID0+IHtcblx0Y29uc3QgaW5wdXQgPSBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yKGBpbnB1dFtuYW1lPVwiJHtuYW1lfVwiXTpjaGVja2VkYCk7XG5cdHJldHVybiBpbnB1dCA/IGlucHV0LnZhbHVlIDogbnVsbDtcbn07XG5cbi8qKiBNYXJrIGFuIGVsZW1lbnQgZm9yIHRoZSBleWUgYXMgd2VsbCBhcyB0aGUgdGFsbHkuICovXG5jb25zdCBtYXJrID0gKGVsZW1lbnQsIGNvcnJlY3QpID0+IHtcblx0aWYgKCFlbGVtZW50KSByZXR1cm47XG5cdGVsZW1lbnQuZGF0YXNldC5tYXJrID0gY29ycmVjdCA/IFwicmlnaHRcIiA6IFwid3JvbmdcIjtcblx0Y29uc3Qga2V5ID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmFuc3dlci1rZXlcIik7XG5cdGlmIChrZXkpIGtleS5oaWRkZW4gPSBjb3JyZWN0O1xufTtcblxuY29uc3QgY2xlYXJNYXJrcyA9IChxdWVzdGlvbikgPT4ge1xuXHRmb3IgKGNvbnN0IG1hcmtlZCBvZiBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtbWFya11cIikpIGRlbGV0ZSBtYXJrZWQuZGF0YXNldC5tYXJrO1xuXHRmb3IgKGNvbnN0IGtleSBvZiBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yQWxsKFwiLmFuc3dlci1rZXlcIikpIGtleS5oaWRkZW4gPSB0cnVlO1xufTtcblxuLyoqXG4gKiBPbmUgZ3JhZGVyIHBlciBxdWVzdGlvbiBraW5kLCBrZXllZCBieSBgZGF0YS1raW5kYC4gRWFjaCBtYXJrcyBpdHMgb3duXG4gKiBjb250cm9scyBhbmQgcmVwb3J0cyB3aGF0IGl0IGZvdW5kOyBhIGtpbmQgd2l0aCBubyBlbnRyeSBoZXJlIGlzIGxlZnQgdG8gdGhlXG4gKiBzdHVkZW50LCBsaWtlIGBzZWxmY2hlY2tgLlxuICogQHR5cGUge1JlY29yZDxzdHJpbmcsIChxdWVzdGlvbjogSFRNTEVsZW1lbnQsIGtleTogb2JqZWN0LCBpZDogc3RyaW5nKSA9PiB7YW5zd2VyZWQ6IGJvb2xlYW4sIHJpZ2h0OiBudW1iZXIsIHRvdGFsOiBudW1iZXJ9Pn1cbiAqL1xuY29uc3QgR1JBREVSUyA9IHtcblx0Y2hvaWNlKHF1ZXN0aW9uLCBrZXksIGlkKSB7XG5cdFx0Y29uc3QgcGlja2VkID0gY2hlY2tlZFZhbHVlKHF1ZXN0aW9uLCBgJHtpZH0tY2hvaWNlYCk7XG5cdFx0aWYgKHBpY2tlZCA9PT0gbnVsbCkgcmV0dXJuIHsgYW5zd2VyZWQ6IGZhbHNlLCByaWdodDogMCwgdG90YWw6IDEgfTtcblx0XHRmb3IgKGNvbnN0IGxhYmVsIG9mIHF1ZXN0aW9uLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuY2hvaWNlXCIpKSB7XG5cdFx0XHRjb25zdCB2YWx1ZSA9IE51bWJlcihsYWJlbC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRcIikudmFsdWUpO1xuXHRcdFx0aWYgKHZhbHVlID09PSBrZXkuYW5zd2VyKSBtYXJrKGxhYmVsLCB0cnVlKTtcblx0XHRcdGVsc2UgaWYgKHZhbHVlID09PSBOdW1iZXIocGlja2VkKSkgbWFyayhsYWJlbCwgZmFsc2UpO1xuXHRcdH1cblx0XHRyZXR1cm4geyBhbnN3ZXJlZDogdHJ1ZSwgcmlnaHQ6IE51bWJlcihwaWNrZWQpID09PSBrZXkuYW5zd2VyID8gMSA6IDAsIHRvdGFsOiAxIH07XG5cdH0sXG5cblx0bWF0Y2gocXVlc3Rpb24sIGtleSkge1xuXHRcdGxldCByaWdodCA9IDA7XG5cdFx0bGV0IGFuc3dlcmVkID0gZmFsc2U7XG5cdFx0Zm9yIChjb25zdCBbaW5kZXgsIGV4cGVjdGVkXSBvZiBrZXkuaXRlbXMuZW50cmllcygpKSB7XG5cdFx0XHRjb25zdCBzZWxlY3QgPSBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yKGBzZWxlY3RbZGF0YS1ibGFuaz1cIiR7aW5kZXh9XCJdYCk7XG5cdFx0XHRpZiAoIXNlbGVjdC52YWx1ZSkgY29udGludWU7XG5cdFx0XHRhbnN3ZXJlZCA9IHRydWU7XG5cdFx0XHRjb25zdCBjb3JyZWN0ID0gc2VsZWN0LnZhbHVlID09PSBleHBlY3RlZDtcblx0XHRcdGlmIChjb3JyZWN0KSByaWdodCArPSAxO1xuXHRcdFx0bWFyayhzZWxlY3QuY2xvc2VzdChcImxpXCIpLCBjb3JyZWN0KTtcblx0XHR9XG5cdFx0cmV0dXJuIHsgYW5zd2VyZWQsIHJpZ2h0LCB0b3RhbDoga2V5Lml0ZW1zLmxlbmd0aCB9O1xuXHR9LFxuXG5cdGZpbGwocXVlc3Rpb24sIGtleSkge1xuXHRcdGxldCByaWdodCA9IDA7XG5cdFx0bGV0IGFuc3dlcmVkID0gZmFsc2U7XG5cdFx0Zm9yIChjb25zdCBbaW5kZXgsIGFjY2VwdGVkXSBvZiBrZXkuYmxhbmtzLmVudHJpZXMoKSkge1xuXHRcdFx0Y29uc3QgaW5wdXQgPSBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yKGBpbnB1dFtkYXRhLWJsYW5rPVwiJHtpbmRleH1cIl1gKTtcblx0XHRcdGlmICghaW5wdXQudmFsdWUudHJpbSgpKSBjb250aW51ZTtcblx0XHRcdGFuc3dlcmVkID0gdHJ1ZTtcblx0XHRcdGNvbnN0IHR5cGVkID0gbm9ybWFsaXplKGlucHV0LnZhbHVlKTtcblx0XHRcdGNvbnN0IGNvcnJlY3QgPSBhY2NlcHRlZC5zb21lKChvcHRpb24pID0+IG5vcm1hbGl6ZShvcHRpb24pID09PSB0eXBlZCk7XG5cdFx0XHRpZiAoY29ycmVjdCkgcmlnaHQgKz0gMTtcblx0XHRcdG1hcmsoaW5wdXQuY2xvc2VzdChcImxpXCIpLCBjb3JyZWN0KTtcblx0XHR9XG5cdFx0cmV0dXJuIHsgYW5zd2VyZWQsIHJpZ2h0LCB0b3RhbDoga2V5LmJsYW5rcy5sZW5ndGggfTtcblx0fSxcblxuXHRncmlkKHF1ZXN0aW9uLCBrZXksIGlkKSB7XG5cdFx0bGV0IHJpZ2h0ID0gMDtcblx0XHRsZXQgYW5zd2VyZWQgPSBmYWxzZTtcblx0XHRmb3IgKGNvbnN0IFtpbmRleCwgZXhwZWN0ZWRdIG9mIGtleS5yb3dzLmVudHJpZXMoKSkge1xuXHRcdFx0Y29uc3QgcGlja2VkID0gY2hlY2tlZFZhbHVlKHF1ZXN0aW9uLCBgJHtpZH0tcm93LSR7aW5kZXh9YCk7XG5cdFx0XHRpZiAocGlja2VkID09PSBudWxsKSBjb250aW51ZTtcblx0XHRcdGFuc3dlcmVkID0gdHJ1ZTtcblx0XHRcdGNvbnN0IGNvcnJlY3QgPSBOdW1iZXIocGlja2VkKSA9PT0gZXhwZWN0ZWQ7XG5cdFx0XHRpZiAoY29ycmVjdCkgcmlnaHQgKz0gMTtcblx0XHRcdG1hcmsocXVlc3Rpb24ucXVlcnlTZWxlY3RvcihgdHJbZGF0YS1yb3c9XCIke2luZGV4fVwiXWApLCBjb3JyZWN0KTtcblx0XHR9XG5cdFx0cmV0dXJuIHsgYW5zd2VyZWQsIHJpZ2h0LCB0b3RhbDoga2V5LnJvd3MubGVuZ3RoIH07XG5cdH0sXG5cblx0anVkZ2UocXVlc3Rpb24sIGtleSwgaWQpIHtcblx0XHRjb25zdCB2ZXJkaWN0ID0gY2hlY2tlZFZhbHVlKHF1ZXN0aW9uLCBgJHtpZH0tY2hvaWNlYCk7XG5cdFx0Y29uc3QgbGluZSA9IGNoZWNrZWRWYWx1ZShxdWVzdGlvbiwgYCR7aWR9LWxpbmVgKTtcblx0XHRpZiAodmVyZGljdCA9PT0gbnVsbCAmJiBsaW5lID09PSBudWxsKSByZXR1cm4geyBhbnN3ZXJlZDogZmFsc2UsIHJpZ2h0OiAwLCB0b3RhbDogMiB9O1xuXHRcdGxldCByaWdodCA9IDA7XG5cblx0XHRmb3IgKGNvbnN0IGxhYmVsIG9mIHF1ZXN0aW9uLnF1ZXJ5U2VsZWN0b3JBbGwoXCIudmVyZGljdHMgLmNob2ljZVwiKSkge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSBOdW1iZXIobGFiZWwucXVlcnlTZWxlY3RvcihcImlucHV0XCIpLnZhbHVlKTtcblx0XHRcdGlmICh2YWx1ZSA9PT0ga2V5LmFuc3dlcikgbWFyayhsYWJlbCwgdHJ1ZSk7XG5cdFx0XHRlbHNlIGlmICh2YWx1ZSA9PT0gTnVtYmVyKHZlcmRpY3QpKSBtYXJrKGxhYmVsLCBmYWxzZSk7XG5cdFx0fVxuXHRcdGlmIChOdW1iZXIodmVyZGljdCkgPT09IGtleS5hbnN3ZXIpIHJpZ2h0ICs9IDE7XG5cblx0XHQvLyBBIHNuaXBwZXQgd2l0aCBubyBvZmZlbmRpbmcgbGluZSBtYWtlcyBcIm5vbmVcIiB0aGUgcmlnaHQgcGljay5cblx0XHRjb25zdCBleHBlY3RlZCA9IGtleS5saW5lcy5sZW5ndGggPyBrZXkubGluZXMubWFwKFN0cmluZykgOiBbXCJub25lXCJdO1xuXHRcdGZvciAoY29uc3QgbGFiZWwgb2YgcXVlc3Rpb24ucXVlcnlTZWxlY3RvckFsbChcIi5jb2RlLWxpbmVzIC5jb2RlLWxpbmVcIikpIHtcblx0XHRcdGNvbnN0IHZhbHVlID0gbGFiZWwucXVlcnlTZWxlY3RvcihcImlucHV0XCIpLnZhbHVlO1xuXHRcdFx0aWYgKGV4cGVjdGVkLmluY2x1ZGVzKHZhbHVlKSkgbWFyayhsYWJlbCwgdHJ1ZSk7XG5cdFx0XHRlbHNlIGlmICh2YWx1ZSA9PT0gbGluZSkgbWFyayhsYWJlbCwgZmFsc2UpO1xuXHRcdH1cblx0XHRpZiAobGluZSAhPT0gbnVsbCAmJiBleHBlY3RlZC5pbmNsdWRlcyhsaW5lKSkgcmlnaHQgKz0gMTtcblxuXHRcdHJldHVybiB7IGFuc3dlcmVkOiB0cnVlLCByaWdodCwgdG90YWw6IDIgfTtcblx0fSxcbn07XG5cbi8qIEEgdHJlZSBpcyBhIGZpbGwgd2hvc2UgYmxhbmtzIGFyZSBsYWlkIG91dCBhcyBhIGRpYWdyYW0uICovXG5HUkFERVJTLnRyZWUgPSBHUkFERVJTLmZpbGw7XG5cbi8qKlxuICogR3JhZGUgb25lIHF1ZXN0aW9uLlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcXVlc3Rpb25cbiAqIEByZXR1cm5zIHt7YW5zd2VyZWQ6IGJvb2xlYW4sIHJpZ2h0OiBudW1iZXIsIHRvdGFsOiBudW1iZXJ9fVxuICovXG5mdW5jdGlvbiBncmFkZShxdWVzdGlvbikge1xuXHRjb25zdCB7IGtpbmQsIHF1ZXN0aW9uOiBpZCB9ID0gcXVlc3Rpb24uZGF0YXNldDtcblx0Y2xlYXJNYXJrcyhxdWVzdGlvbik7XG5cdGNvbnN0IGdyYWRlciA9IEdSQURFUlNba2luZF07XG5cdGlmICghZ3JhZGVyKSByZXR1cm4geyBhbnN3ZXJlZDogZmFsc2UsIHJpZ2h0OiAwLCB0b3RhbDogMCB9O1xuXHRyZXR1cm4gZ3JhZGVyKHF1ZXN0aW9uLCBKU09OLnBhcnNlKHF1ZXN0aW9uLmRhdGFzZXQuYW5zd2VycyA/PyBcInt9XCIpLCBpZCk7XG59XG5cbi8qKiBHcmFkZSBvbmUgcXVlc3Rpb24gYW5kIHdyaXRlIGl0cyBmZWVkYmFjayBsaW5lLiAqL1xuZnVuY3Rpb24gY2hlY2socXVlc3Rpb24pIHtcblx0aWYgKCFHUkFERVJTW3F1ZXN0aW9uLmRhdGFzZXQua2luZF0pIHtcblx0XHRjb25zdCByZXZlYWwgPSBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtcmV2ZWFsXVwiKTtcblx0XHRpZiAocmV2ZWFsKSByZXZlYWwub3BlbiA9IHRydWU7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRjb25zdCB7IGFuc3dlcmVkLCByaWdodCwgdG90YWwgfSA9IGdyYWRlKHF1ZXN0aW9uKTtcblx0Y29uc3QgZmVlZGJhY2sgPSBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yKFwiLmZlZWRiYWNrXCIpO1xuXHRjb25zdCB3aHkgPSBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yKFwiLndoeVwiKTtcblxuXHRpZiAoIWFuc3dlcmVkKSB7XG5cdFx0cXVlc3Rpb24ucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1zdGF0ZVwiKTtcblx0XHRmZWVkYmFjay5oaWRkZW4gPSBmYWxzZTtcblx0XHRmZWVkYmFjay50ZXh0Q29udGVudCA9IFwiTm90IGFuc3dlcmVkIHlldC5cIjtcblx0XHR3aHkuaGlkZGVuID0gdHJ1ZTtcblx0XHRyZXR1cm4geyByaWdodDogMCwgdG90YWwgfTtcblx0fVxuXG5cdGNvbnN0IHBlcmZlY3QgPSByaWdodCA9PT0gdG90YWw7XG5cdHF1ZXN0aW9uLmRhdGFzZXQuc3RhdGUgPSBwZXJmZWN0ID8gXCJyaWdodFwiIDogXCJ3cm9uZ1wiO1xuXHRmZWVkYmFjay5oaWRkZW4gPSBmYWxzZTtcblx0ZmVlZGJhY2sudGV4dENvbnRlbnQgPSBwZXJmZWN0XG5cdFx0PyB0b3RhbCA+IDFcblx0XHRcdD8gYENvcnJlY3QgXHUyMDE0IGFsbCAke3RvdGFsfS5gXG5cdFx0XHQ6IFwiQ29ycmVjdC5cIlxuXHRcdDogYFRyeSBhZ2FpbjogJHtyaWdodH0gb2YgJHt0b3RhbH0gY29ycmVjdC5gO1xuXHR3aHkuaGlkZGVuID0gZmFsc2U7XG5cdHJldHVybiB7IHJpZ2h0LCB0b3RhbCB9O1xufVxuXG4vKiogQ2xlYXIgb25lIHF1ZXN0aW9uIGJhY2sgdG8gdW5hbnN3ZXJlZC4gKi9cbmZ1bmN0aW9uIHJlc2V0KHF1ZXN0aW9uKSB7XG5cdGNsZWFyTWFya3MocXVlc3Rpb24pO1xuXHRxdWVzdGlvbi5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLXN0YXRlXCIpO1xuXHRmb3IgKGNvbnN0IGlucHV0IG9mIHF1ZXN0aW9uLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbnB1dFt0eXBlPSdyYWRpbyddXCIpKSBpbnB1dC5jaGVja2VkID0gZmFsc2U7XG5cdGZvciAoY29uc3QgaW5wdXQgb2YgcXVlc3Rpb24ucXVlcnlTZWxlY3RvckFsbChcImlucHV0W3R5cGU9J3RleHQnXVwiKSkgaW5wdXQudmFsdWUgPSBcIlwiO1xuXHRmb3IgKGNvbnN0IHNlbGVjdCBvZiBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yQWxsKFwic2VsZWN0XCIpKSBzZWxlY3QudmFsdWUgPSBcIlwiO1xuXHRmb3IgKGNvbnN0IHJvdyBvZiBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtZHJvcHBlZF0sIFtkYXRhLW92ZXJdXCIpKSB7XG5cdFx0ZGVsZXRlIHJvdy5kYXRhc2V0LmRyb3BwZWQ7XG5cdFx0ZGVsZXRlIHJvdy5kYXRhc2V0Lm92ZXI7XG5cdH1cblx0bWFya1VzZWRXb3JkcyhxdWVzdGlvbik7XG5cdGZvciAoY29uc3QgZGV0YWlscyBvZiBxdWVzdGlvbi5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtcmV2ZWFsXVwiKSkgZGV0YWlscy5vcGVuID0gZmFsc2U7XG5cdGNvbnN0IGZlZWRiYWNrID0gcXVlc3Rpb24ucXVlcnlTZWxlY3RvcihcIi5mZWVkYmFja1wiKTtcblx0ZmVlZGJhY2suaGlkZGVuID0gdHJ1ZTtcblx0ZmVlZGJhY2sudGV4dENvbnRlbnQgPSBcIlwiO1xuXHRxdWVzdGlvbi5xdWVyeVNlbGVjdG9yKFwiLndoeVwiKS5oaWRkZW4gPSB0cnVlO1xufVxuXG4vKiogQSBxdWVzdGlvbidzIHN0YXR1cyBmb3IgdGhlIHF1ZXN0aW9uIGxpc3QgYW5kIHRoZSByZXN1bHRzOiBjaGVja2VkIHJpZ2h0LCBjaGVja2VkIHdyb25nLCBvciBub3QgY2hlY2tlZC4gKi9cbmNvbnN0IFNUQVRVUyA9IHsgcmlnaHQ6IFwiQ29ycmVjdFwiLCB3cm9uZzogXCJUcnkgYWdhaW5cIiwgb3BlbjogXCJOb3QgY2hlY2tlZFwiIH07XG5jb25zdCBzdGF0ZU9mID0gKHF1ZXN0aW9uKSA9PiBxdWVzdGlvbi5kYXRhc2V0LnN0YXRlID8/IFwib3BlblwiO1xuY29uc3QgZ3JhZGFibGUgPSAoKSA9PiBbLi4uZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5xdWVzdGlvblwiKV0uZmlsdGVyKChxdWVzdGlvbikgPT4gR1JBREVSU1txdWVzdGlvbi5kYXRhc2V0LmtpbmRdKTtcblxuY29uc3QgcXVlc3Rpb25OYXYgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtcXVlc3Rpb24tbmF2XVwiKTtcbmNvbnN0IHJlc3VsdHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtcmVzdWx0c11cIik7XG5cbi8qKiBPbmUgcm93IHBlciBncmFkYWJsZSBxdWVzdGlvbjogaXRzIG51bWJlciBiYWRnZSAob3IgYSBtYXJrIG9uY2UgY2hlY2tlZCkgYW5kIGl0cyBzdGF0dXMsIGxpbmtlZCB0byBpdC4gKi9cbmNvbnN0IHN0YXR1c1Jvd3MgPSAoKSA9PlxuXHRncmFkYWJsZSgpXG5cdFx0Lm1hcCgocXVlc3Rpb24pID0+IHtcblx0XHRcdGNvbnN0IHN0YXRlID0gc3RhdGVPZihxdWVzdGlvbik7XG5cdFx0XHRjb25zdCBiYWRnZSA9IHN0YXRlID09PSBcInJpZ2h0XCIgPyBcIlx1MjcxM1wiIDogc3RhdGUgPT09IFwid3JvbmdcIiA/IFwiXHUyNzE1XCIgOiBxdWVzdGlvbi5kYXRhc2V0LnF1ZXN0aW9uO1xuXHRcdFx0cmV0dXJuIGA8bGkgZGF0YS1zdGF0ZT1cIiR7c3RhdGV9XCI+PGEgaHJlZj1cIiMke3F1ZXN0aW9uLmlkfVwiPjxzcGFuIGNsYXNzPVwiYmFkZ2VcIiBhcmlhLWhpZGRlbj1cInRydWVcIj4ke2JhZGdlfTwvc3Bhbj48c3Bhbj5RdWVzdGlvbiAke3F1ZXN0aW9uLmRhdGFzZXQucXVlc3Rpb259PC9zcGFuPiA8c3BhbiBjbGFzcz1cInN0YXR1c1wiPiR7U1RBVFVTW3N0YXRlXX08L3NwYW4+PC9hPjwvbGk+YDtcblx0XHR9KVxuXHRcdC5qb2luKFwiXCIpO1xuXG4vKiogUmVkcmF3IHRoZSBxdWVzdGlvbiBsaXN0IGFuZCwgd2hlbiBpdCBpcyBzaG93aW5nLCB0aGUgcmVzdWx0cy4gKi9cbmZ1bmN0aW9uIHJlZnJlc2hTdGF0dXMoKSB7XG5cdGlmIChxdWVzdGlvbk5hdikgcXVlc3Rpb25OYXYucXVlcnlTZWxlY3RvcihcIm9sXCIpLmlubmVySFRNTCA9IHN0YXR1c1Jvd3MoKTtcblx0aWYgKCFyZXN1bHRzIHx8IHJlc3VsdHMuaGlkZGVuKSByZXR1cm47XG5cdGNvbnN0IHF1ZXN0aW9ucyA9IGdyYWRhYmxlKCk7XG5cdGNvbnN0IHJpZ2h0ID0gcXVlc3Rpb25zLmZpbHRlcigocXVlc3Rpb24pID0+IHN0YXRlT2YocXVlc3Rpb24pID09PSBcInJpZ2h0XCIpLmxlbmd0aDtcblx0cmVzdWx0cy5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtc2NvcmVdXCIpLnRleHRDb250ZW50ID0gU3RyaW5nKHJpZ2h0KTtcblx0cmVzdWx0cy5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtc2NvcmUtb2ZdXCIpLnRleHRDb250ZW50ID0gYG9mICR7cXVlc3Rpb25zLmxlbmd0aH1gO1xuXHRyZXN1bHRzLnF1ZXJ5U2VsZWN0b3IoXCIucmVzdWx0LXJvd3NcIikuaW5uZXJIVE1MID0gc3RhdHVzUm93cygpO1xuXHRyZXN1bHRzLnF1ZXJ5U2VsZWN0b3IoXCJbZGF0YS1yZXRyeS1yZXN1bHRzXVwiKS5oaWRkZW4gPSByaWdodCA9PT0gcXVlc3Rpb25zLmxlbmd0aDtcbn1cblxuY29uc3QgdGFsbHlGb3IgPSAoc2NvcGUpID0+IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXRhbGx5PVwiJHtzY29wZX1cIl1gKTtcbmNvbnN0IHJldHJ5Rm9yID0gKHNjb3BlKSA9PiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1yZXRyeT1cIiR7c2NvcGV9XCJdYCk7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZXZlbnQpID0+IHtcblx0Y29uc3Qgb25lQnV0dG9uID0gZXZlbnQudGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1jaGVjay1vbmVdXCIpO1xuXHRpZiAob25lQnV0dG9uKSB7XG5cdFx0Y2hlY2sob25lQnV0dG9uLmNsb3Nlc3QoXCIucXVlc3Rpb25cIikpO1xuXHRcdHJlZnJlc2hTdGF0dXMoKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoZXZlbnQudGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1zZWUtcmVzdWx0c11cIikgJiYgcmVzdWx0cykge1xuXHRcdGZvciAoY29uc3QgcXVlc3Rpb24gb2YgZ3JhZGFibGUoKSkgaWYgKHN0YXRlT2YocXVlc3Rpb24pID09PSBcIm9wZW5cIikgY2hlY2socXVlc3Rpb24pO1xuXHRcdHJlc3VsdHMuaGlkZGVuID0gZmFsc2U7XG5cdFx0cmVmcmVzaFN0YXR1cygpO1xuXHRcdHJlc3VsdHMuZm9jdXMoKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCBjaGVja0J1dHRvbiA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtY2hlY2tdXCIpO1xuXHRpZiAoY2hlY2tCdXR0b24pIHtcblx0XHRjb25zdCBzY29wZSA9IGNoZWNrQnV0dG9uLmRhdGFzZXQuY2hlY2s7XG5cdFx0bGV0IHJpZ2h0ID0gMDtcblx0XHRsZXQgdG90YWwgPSAwO1xuXHRcdGxldCBzZWxmTWFya2VkID0gMDtcblx0XHRmb3IgKGNvbnN0IHF1ZXN0aW9uIG9mIHF1ZXN0aW9uc0luKHNjb3BlKSkge1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gY2hlY2socXVlc3Rpb24pO1xuXHRcdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdFx0c2VsZk1hcmtlZCArPSAxO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdHJpZ2h0ICs9IHJlc3VsdC5yaWdodDtcblx0XHRcdHRvdGFsICs9IHJlc3VsdC50b3RhbDtcblx0XHR9XG5cdFx0Y29uc3QgdGFsbHkgPSB0YWxseUZvcihzY29wZSk7XG5cdFx0aWYgKHRhbGx5KSB7XG5cdFx0XHRjb25zdCBub3RlID0gc2VsZk1hcmtlZCA/IGAgXHUwMEI3ICR7c2VsZk1hcmtlZH0gJHt0YWxseS5kYXRhc2V0Lm5vdGUgfHwgXCJzZWxmLW1hcmtlZFwifWAgOiBcIlwiO1xuXHRcdFx0dGFsbHkudGV4dENvbnRlbnQgPSB0b3RhbCA/IGAke3JpZ2h0fSBvZiAke3RvdGFsfSR7bm90ZX1gIDogXCJcIjtcblx0XHR9XG5cdFx0Y29uc3QgcmV0cnkgPSByZXRyeUZvcihzY29wZSk7XG5cdFx0aWYgKHJldHJ5KSByZXRyeS5oaWRkZW4gPSAhcXVlc3Rpb25zSW4oc2NvcGUpLnNvbWUoKHF1ZXN0aW9uKSA9PiBxdWVzdGlvbi5kYXRhc2V0LnN0YXRlID09PSBcIndyb25nXCIpO1xuXHRcdHJlZnJlc2hTdGF0dXMoKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCByZXRyeUJ1dHRvbiA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtcmV0cnldXCIpO1xuXHRpZiAocmV0cnlCdXR0b24pIHtcblx0XHRjb25zdCBzY29wZSA9IHJldHJ5QnV0dG9uLmRhdGFzZXQucmV0cnk7XG5cdFx0Y29uc3QgbWlzc2VkID0gcXVlc3Rpb25zSW4oc2NvcGUpLmZpbHRlcigocXVlc3Rpb24pID0+IHF1ZXN0aW9uLmRhdGFzZXQuc3RhdGUgPT09IFwid3JvbmdcIik7XG5cdFx0Zm9yIChjb25zdCBxdWVzdGlvbiBvZiBtaXNzZWQpIHJlc2V0KHF1ZXN0aW9uKTtcblx0XHRyZXRyeUJ1dHRvbi5oaWRkZW4gPSB0cnVlO1xuXHRcdGNvbnN0IHRhbGx5ID0gdGFsbHlGb3Ioc2NvcGUpO1xuXHRcdGlmICh0YWxseSkgdGFsbHkudGV4dENvbnRlbnQgPSBcIlwiO1xuXHRcdGlmIChyZXN1bHRzKSByZXN1bHRzLmhpZGRlbiA9IHRydWU7XG5cdFx0cmVmcmVzaFN0YXR1cygpO1xuXHRcdGNvbnN0IGZpcnN0ID0gbWlzc2VkWzBdPy5xdWVyeVNlbGVjdG9yKFwiaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEsIGJ1dHRvblwiKTtcblx0XHRmaXJzdD8uZm9jdXMoKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCByZXNldEJ1dHRvbiA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KFwiW2RhdGEtcmVzZXRdXCIpO1xuXHRpZiAocmVzZXRCdXR0b24pIHtcblx0XHRjb25zdCBzY29wZSA9IHJlc2V0QnV0dG9uLmRhdGFzZXQucmVzZXQ7XG5cdFx0Zm9yIChjb25zdCBxdWVzdGlvbiBvZiBxdWVzdGlvbnNJbihzY29wZSkpIHJlc2V0KHF1ZXN0aW9uKTtcblx0XHRjb25zdCB0YWxseSA9IHRhbGx5Rm9yKHNjb3BlKTtcblx0XHRpZiAodGFsbHkpIHRhbGx5LnRleHRDb250ZW50ID0gXCJcIjtcblx0XHRjb25zdCByZXRyeSA9IHJldHJ5Rm9yKHNjb3BlKTtcblx0XHRpZiAocmV0cnkpIHJldHJ5LmhpZGRlbiA9IHRydWU7XG5cdFx0aWYgKHJlc3VsdHMpIHJlc3VsdHMuaGlkZGVuID0gdHJ1ZTtcblx0XHRyZWZyZXNoU3RhdHVzKCk7XG5cdH1cbn0pO1xuXG4vKiBDaXRhdGlvbiBwYW5lbHMgYXJlIGFuIGV4Y2x1c2l2ZSBncm91cCB0aHJvdWdoIGA8ZGV0YWlscyBuYW1lPmA7IEVzY2FwZVxuICAgY2xvc2VzIHdoaWNoZXZlciBpcyBvcGVuLiAqL1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2ZW50KSA9PiB7XG5cdGlmIChldmVudC5rZXkgIT09IFwiRXNjYXBlXCIpIHJldHVybjtcblx0Zm9yIChjb25zdCBvcGVuIG9mIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuY2l0ZVtvcGVuXVwiKSkgb3Blbi5vcGVuID0gZmFsc2U7XG59KTtcblxuLypcbiAqIERyYWcgYW5kIGRyb3AsIGZvciB0aGUgcXVlc3Rpb25zIHdob3NlIGRhdGEgYXNrcyBmb3IgaXQuXG4gKlxuICogQSBwb2ludGVyIGFmZm9yZGFuY2UgbGF5ZXJlZCBvdmVyIHRoZSByZWFsIGNvbnRyb2wsIG5ldmVyIGEgcmVwbGFjZW1lbnQgZm9yXG4gKiBpdDogdGhlIDxzZWxlY3Q+IG9yIHRleHQgaW5wdXQgc3RheXMgdGhlIGtleWJvYXJkLCB0b3VjaCBhbmQgc2NyZWVuLXJlYWRlclxuICogcGF0aCAoSFRNTDUgZHJhZyBldmVudHMgZG8gbm90IGZpcmUgZnJvbSB0b3VjaCksIGFuZCBhIGRyb3AganVzdCBzZXRzIGl0c1xuICogdmFsdWUuIE5vdGhpbmcgaGVyZSBpcyBuZWVkZWQgdG8gYW5zd2VyIGEgcXVlc3Rpb24uXG4gKi9cbmNvbnN0IERST1BQRURfTVMgPSA3MDA7XG5cbi8qKiBNYXJrIHRoZSBiYW5rIHdvcmRzIHRoYXQgYWxyZWFkeSBhcHBlYXIgaW4gdGhpcyBxdWVzdGlvbidzIGJsYW5rcy4gKi9cbmZ1bmN0aW9uIG1hcmtVc2VkV29yZHMocXVlc3Rpb24pIHtcblx0Y29uc3QgYmFuayA9IHF1ZXN0aW9uLnF1ZXJ5U2VsZWN0b3JBbGwoXCIud29yZC1iYW5rIC53b3JkW2RhdGEtd29yZF1cIik7XG5cdGlmICghYmFuay5sZW5ndGgpIHJldHVybjtcblx0Y29uc3QgdHlwZWQgPSBbLi4ucXVlc3Rpb24ucXVlcnlTZWxlY3RvckFsbChcIi5ibGFua3MgaW5wdXRbdHlwZT0ndGV4dCddXCIpXVxuXHRcdC5mbGF0TWFwKChpbnB1dCkgPT4gbm9ybWFsaXplKGlucHV0LnZhbHVlKS5zcGxpdChcIiBcIikpXG5cdFx0LmZpbHRlcihCb29sZWFuKTtcblx0Zm9yIChjb25zdCB3b3JkIG9mIGJhbmspIHtcblx0XHRpZiAodHlwZWQuaW5jbHVkZXMobm9ybWFsaXplKHdvcmQuZGF0YXNldC53b3JkKSkpIHdvcmQuZGF0YXNldC51c2VkID0gXCJcIjtcblx0XHRlbHNlIGRlbGV0ZSB3b3JkLmRhdGFzZXQudXNlZDtcblx0fVxufVxuXG5mb3IgKGNvbnN0IGNoaXAgb2YgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RyYWdnYWJsZT1cInRydWVcIl1bZGF0YS1sZXR0ZXJdLCBbZHJhZ2dhYmxlPVwidHJ1ZVwiXVtkYXRhLXdvcmRdJykpIHtcblx0Y29uc3QgcGF5bG9hZCA9IGNoaXAuZGF0YXNldC5sZXR0ZXIgPz8gY2hpcC5kYXRhc2V0LndvcmQ7XG5cdGNoaXAuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdzdGFydFwiLCAoZXZlbnQpID0+IHtcblx0XHRldmVudC5kYXRhVHJhbnNmZXIuc2V0RGF0YShcInRleHQvcGxhaW5cIiwgcGF5bG9hZCk7XG5cdFx0ZXZlbnQuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSBcImNvcHlcIjtcblx0XHRjaGlwLmRhdGFzZXQuZHJhZ2dpbmcgPSBcIlwiO1xuXHR9KTtcblx0Y2hpcC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VuZFwiLCAoKSA9PiBkZWxldGUgY2hpcC5kYXRhc2V0LmRyYWdnaW5nKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIGRyb3BwZWQgdmFsdWUgdG8gdGhlIHJvdydzIGNvbnRyb2wuXG4gKiBBIHNlbGVjdCB0YWtlcyB0aGUgbGV0dGVyIG91dHJpZ2h0OyBhIHRleHQgYmxhbmsgYXBwZW5kcywgYmVjYXVzZSBvbmUgb2ZcbiAqIHRoZW0gaG9sZHMgdGhyZWUgd29yZHMuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciBhbnl0aGluZyB3YXMgc2V0XG4gKi9cbmZ1bmN0aW9uIGFwcGx5RHJvcChyb3csIGRyb3BwZWQpIHtcblx0Y29uc3Qgc2VsZWN0ID0gcm93LnF1ZXJ5U2VsZWN0b3IoXCJzZWxlY3RcIik7XG5cdGlmIChzZWxlY3QpIHtcblx0XHRpZiAoIVsuLi5zZWxlY3Qub3B0aW9uc10uc29tZSgob3B0aW9uKSA9PiBvcHRpb24udmFsdWUgPT09IGRyb3BwZWQpKSByZXR1cm4gZmFsc2U7XG5cdFx0c2VsZWN0LnZhbHVlID0gZHJvcHBlZDtcblx0XHRzZWxlY3QuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoXCJjaGFuZ2VcIiwgeyBidWJibGVzOiB0cnVlIH0pKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGNvbnN0IGlucHV0ID0gcm93LnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFt0eXBlPSd0ZXh0J11cIik7XG5cdGlmICghaW5wdXQpIHJldHVybiBmYWxzZTtcblx0Y29uc3QgY3VycmVudCA9IGlucHV0LnZhbHVlLnRyaW0oKTtcblx0aWYgKG5vcm1hbGl6ZShjdXJyZW50KS5zcGxpdChcIiBcIikuaW5jbHVkZXMobm9ybWFsaXplKGRyb3BwZWQpKSkgcmV0dXJuIGZhbHNlO1xuXHRpbnB1dC52YWx1ZSA9IGN1cnJlbnQgPyBgJHtjdXJyZW50fSwgJHtkcm9wcGVkfWAgOiBkcm9wcGVkO1xuXHRpbnB1dC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChcImlucHV0XCIsIHsgYnViYmxlczogdHJ1ZSB9KSk7XG5cdHJldHVybiB0cnVlO1xufVxuXG5mb3IgKGNvbnN0IHJvdyBvZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtZHJvcF1cIikpIHtcblx0Ly8gVGhlIGRyb3Agb25seSBsYW5kcyBpZiBkcmFnb3ZlciBjYW5jZWxzIHRoZSBkZWZhdWx0LlxuXHRyb3cuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdvdmVyXCIsIChldmVudCkgPT4ge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0ZXZlbnQuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSBcImNvcHlcIjtcblx0XHRyb3cuZGF0YXNldC5vdmVyID0gXCJcIjtcblx0fSk7XG5cdHJvdy5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2xlYXZlXCIsIChldmVudCkgPT4ge1xuXHRcdGlmICghcm93LmNvbnRhaW5zKGV2ZW50LnJlbGF0ZWRUYXJnZXQpKSBkZWxldGUgcm93LmRhdGFzZXQub3Zlcjtcblx0fSk7XG5cdHJvdy5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCAoZXZlbnQpID0+IHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdGRlbGV0ZSByb3cuZGF0YXNldC5vdmVyO1xuXHRcdGNvbnN0IGRyb3BwZWQgPSBldmVudC5kYXRhVHJhbnNmZXIuZ2V0RGF0YShcInRleHQvcGxhaW5cIik7XG5cdFx0aWYgKCFkcm9wcGVkIHx8ICFhcHBseURyb3Aocm93LCBkcm9wcGVkKSkgcmV0dXJuO1xuXHRcdHJvdy5kYXRhc2V0LmRyb3BwZWQgPSBcIlwiO1xuXHRcdHNldFRpbWVvdXQoKCkgPT4gZGVsZXRlIHJvdy5kYXRhc2V0LmRyb3BwZWQsIERST1BQRURfTVMpO1xuXHRcdG1hcmtVc2VkV29yZHMocm93LmNsb3Nlc3QoXCIucXVlc3Rpb25cIikpO1xuXHR9KTtcbn1cblxuLyogVHlwaW5nIGJ5IGhhbmQga2VlcHMgdGhlIHdvcmQgYmFuayBob25lc3QgdG9vLiAqL1xuZm9yIChjb25zdCBxdWVzdGlvbiBvZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnF1ZXN0aW9uW2RhdGEta2luZD0nZmlsbCddXCIpKSB7XG5cdHF1ZXN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiBtYXJrVXNlZFdvcmRzKHF1ZXN0aW9uKSk7XG5cdG1hcmtVc2VkV29yZHMocXVlc3Rpb24pO1xufVxuXG4vKiBUaGUgYnV0dG9ucyBzaGlwIGhpZGRlbiBzbyBhIG5vLUpTIHJlYWRlciBpcyBuZXZlciBvZmZlcmVkIGEgZGVhZCBjb250cm9sLiAqL1xuZm9yIChjb25zdCBidXR0b24gb2YgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLWNoZWNrXSwgW2RhdGEtcmVzZXRdXCIpKSB7XG5cdGJ1dHRvbi5oaWRkZW4gPSBmYWxzZTtcbn1cblxuLyogU2VsZi1tYXJrZWQgcXVlc3Rpb25zIGhhdmUgbm90aGluZyB0byBjaGVjaywgc28gdGhleSBnZXQgbm8gYnV0dG9uLiAqL1xuZm9yIChjb25zdCBxdWVzdGlvbiBvZiBncmFkYWJsZSgpKSB7XG5cdGNvbnN0IGJ1dHRvbiA9IHF1ZXN0aW9uLnF1ZXJ5U2VsZWN0b3IoXCJbZGF0YS1jaGVjay1vbmVdXCIpO1xuXHRpZiAoYnV0dG9uKSBidXR0b24uaGlkZGVuID0gZmFsc2U7XG59XG5cbmlmIChxdWVzdGlvbk5hdiAmJiBncmFkYWJsZSgpLmxlbmd0aCkge1xuXHRxdWVzdGlv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
