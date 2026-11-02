---
name: test-generator
description: Write a printed test and its answer key for a course, plus a practice worksheet students can use. Use when asked to create, draft or rebuild a test, exam or quiz for a course built on the course kit. The test and key stay on the instructor's computer and never go in the repository; only the practice worksheet is published.
---

# Test generator

Makes three things from one request:

| Output | Where it goes | Published? |
|---|---|---|
| The test (PDF) and the answer key (PDF) | A private folder **outside the repository** | **Never** |
| The content file that builds them (`.mjs`) | The same private folder | **Never** |
| A practice worksheet (`.worksheet.md`, `.11tydata.js`, `.webc`) | The course's `content/practice/` | Yes |

The content file holds every question and answer, so it is as private as the key.

## The rules

1. **Tests, keys and content files never enter the repository.** Not in a branch, not in a pull request, not in `public/`. `lib/guard.mjs` refuses to write them inside a git work tree.
2. **The worksheet reuses no test question.** Same topics, same kinds of question, different wording and different numbers. `guard.mjs overlap` checks it.
3. **Every answer is checked before it is printed.** Points must total the test's points; Python output must match Python's.
4. **Show the instructor the PDFs before calling it done.** Render pages to images and look at them.

## Steps

### 1. Gather what the test covers

Ask only for what is missing. You need:

- the course folder and which test (for example `cs101`, Test 2)
- the date, the length in minutes and the points (default 100)
- what it covers: which weeks or decks, and anything to leave out
- the sections and how many points each (see [question types](reference/question-types.md))
- earlier tests for this course, so questions are not repeated

If the instructor has no section plan, propose one that matches the course's earlier tests, and say that you did.

### 2. Read the sources

Read the decks in `content/slides/` for the covered weeks, and the glossary entries (`vocab` and `api` slides). Every question should be answerable from something taught, and every worksheet question needs a `source:` link back to the slide that taught it. Note the week, day and slide number for each topic as you go.

### 3. Start the test in the private folder

```sh
node skills/test-generator/scripts/start.mjs --course cs101 --name test-2 \
  --title "Test 2: Loops" --date "Friday, October 2" --minutes 50 \
  --school "Example College · Fall 2026" --label "CS 101 · Introduction to Programming"
```

This writes `test-2.mjs` and a draft worksheet into `$COURSE_TESTS_DIR/cs101/` (default `~/course-tests/cs101/`), and stops if the folder is inside a repository. Tell the instructor where the folder is.

### 4. Write the questions

Edit `test-2.mjs`. It is a list of sections, each a function of `key` that returns the section's number, title, points, a one-line blurb and its body. Build the body from the helpers in `lib/items.mjs`; each takes `key` so one definition makes both the student copy and the key. Details and every helper: [question types](reference/question-types.md).

- Put the answer in the call (`mc(1, "…", choices, 1, key)`), never in the stem.
- Use `mark("…", key)` for partial credit; it prints only in the key.
- For a code course, list each snippet once with its expected output and check them with `lib/python-check.mjs`, so the key cannot drift from what Python prints.
- Draw figures as SVG with `svgBox` for write-in boxes, as the course builders do.
- Keep each section on its own page unless it is short; give it `flow: true` to share a page.

### 5. Build and check

```sh
node ~/course-tests/cs101/test-2.mjs          # test and key, as PDFs
KEY=1 node ~/course-tests/cs101/test-2.mjs    # only the key
HTML=1 node ~/course-tests/cs101/test-2.mjs   # also write the HTML
```

The build fails if the points do not total. Then render and look:

```sh
pdftoppm -r 60 -png ~/course-tests/cs101/test-2-key.pdf /tmp/key && pdftoppm -r 60 -png ~/course-tests/cs101/test-2.pdf /tmp/test
```

Check that nothing splits across a page badly, every box is big enough to write in, the key shows an answer for every item, and the student copy shows none.

### 6. Write the practice worksheet

Start from the draft next to the test. Rules for the worksheet:

- Same sections and the same kinds of question as the test, mapped as in [practice worksheet](reference/practice-worksheet.md).
- New questions: change the scenario, the names, the numbers and the wording. A student who memorized the worksheet should still need to know the topic.
- Every question has `why:` (the reasoning, shown after checking) and a `source:` link.
- Put it in the course repo as `content/practice/test-2.worksheet.md`, with the two small files from [Writing content](../../docs/writing-content.md#practice-worksheets).

Then check it against the test:

```sh
node skills/test-generator/lib/guard.mjs overlap ~/course-tests/cs101/test-2-stems.json content/practice/test-2.worksheet.md
```

Rewrite any question it lists.

### 7. Keep the test out of the repository

Before any commit in the course repo:

```sh
node skills/test-generator/lib/guard.mjs scan
```

It fails when the repository holds a test, a key or a content file. Commit only the three worksheet files, authored as the instructor, with no attribution lines.

### 8. Tell the instructor

Say where the test, the key and the content file are, what the worksheet covers and where it is, and anything you chose without being told (section plan, point split, topics left out).

## If something fails

| Message | Meaning |
|---|---|
| `is inside the repository … and git does not ignore it` | The output folder is in a git work tree. Set `COURSE_TESTS_DIR` to a folder elsewhere. |
| `Points total N, expected 100` | The sections do not add up. Fix a section's `points`. |
| `Python check failed for 2.3` | The key and Python disagree. Fix the key, not the check. |
| `The worksheet repeats N test questions` | Reword those worksheet questions. |
| `Install playwright or puppeteer` | `npm install playwright`, or set `HTML_ONLY=1` to skip the PDFs. |
