# Practice worksheet

The worksheet is the one thing published. It uses the course kit's worksheet format (see [Writing content](../../../docs/writing-content.md#practice-worksheets)), so a student checks answers in the browser and sees where each one was taught.

## From test items to worksheet questions

| Test item | Worksheet kind | Notes |
|---|---|---|
| `mc` | `choice` | `- [x]` marks the answer; give `why:` and `source:` |
| `matching`, `termMatch` | `match` | A `::: bank` of lettered options, then `1. text — A` |
| `fill`, `labeledLines` | `fill` | Each blank is ``label — `answer` ``; add ``/ `other` `` for accepted variants |
| `circleTable`, a works table | `grid` | A table with `x` in the right column |
| `judgeTable` | `judge` | A section `::: legend`, `verdict:` letter, `!` marks the bad line |
| A drawn tree or diagram | `tree`, or a `choice` with an `svg` fence | |
| A short explanation | `selfcheck` | A `::: reveal` list and a `::: check` list to tick |

## Keeping it different

The test and the worksheet cover the same topics, not the same questions.

- Change the scenario, the names and the numbers.
- Reword the stem; do not paraphrase it word for word.
- Ask the same skill from another angle (give the code, ask the output; then give the output, ask what code might print it).
- Do not copy a distractor set. Write new wrong answers.

`guard.js overlap` compares every test question with the worksheet by word runs and fails on a close match. Passing it is not proof that the questions are different enough; read the two side by side.

## Files

```
content/practice/test-2.worksheet.md     the questions
content/practice/test-2.11tydata.js      export default worksheetData(import.meta.url);
content/practice/test-2.webc             <practice-worksheet></practice-worksheet>
```
