# Troubleshooting

When a build fails, Eleventy prints a block of text. **Read the first lines**: the kit writes them to say what to fix. The long lines of file paths after "Original error stack trace" are for developers; you can ignore them.

## Messages from the kit

| The message says | What it means | What to do |
|---|---|---|
| `There is no course.json, or it is empty` | The build looked in `_data/` and found no course. | Create `_data/course.json`. Copy the one from `examples/starter`. |
| `course.json needs a term` | `course.json` has no `term`. | Add `"term": { "year": 2026, "season": "fall" }`. |
| `course.json says the term is 2026 Fall, but dates.json has 2026 fall` | The year and season must match an entry in `dates.json` exactly. | Use the spelling `dates.json` shows. The season is lowercase. |
| `dates.json has no terms` | `dates.json` is missing or empty. | Add your term's calendar. See [Data files](data-files.md#datesjson). |
| `_data/schedule.json could not be read as JSON` | A typing mistake in that file. | Look for a missing or extra comma, quote or bracket. **A comma after the last item in a list is not allowed.** The text in parentheses points near the spot. |
| `courseKit: unknown option` | A misspelled option in `eleventy.config.js`. | The message suggests the right name, or lists them all. |
| `institution.timezone … is not a time zone name` | The time zone is not one computers know. | Use a name such as `America/New_York` or `America/Chicago`. |
| `demos.runtime … must be one of` | An option has a value that does not exist. | Use one of the values listed. |
| `needs the @pyscript/core package` | You asked for Python demos, and the packages are not installed. | Run `npm install @pyscript/core pyodide`. |
| `the puppeteer package is not installed` | A publishing build writes the syllabus PDF with a headless browser. | Run `npm install puppeteer`, or pass `pdf: false` to `courseKit` to skip the PDF. |
| `slide kind "…" is not one of …` | A slide has a kind that does not exist. | Use one of the kinds listed, or leave the kind out. |
| `"…" is not a valid container name` | A `:::` block has a name with capitals or spaces. | Use lowercase letters, digits and hyphens. |

The build also prints warnings that do not stop it:

| Warning | What to do |
|---|---|
| `grading.json: the weights add up to 90%, not 100%` | Fix the weights so they total 100%. |
| `project.json: the components add up to … points, but the project's scale is …` | Make the pieces' points total the project's `scale`. |

## Something looks wrong

**A component tag shows nothing.** Components only work in `.webc` pages. In a Markdown file the tag is left in the page and does not display. Rename the file to `.webc` and write the page in HTML, or move the tag into a `.webc` page.

**"Cannot read properties of undefined" and a component's name.** A component needs data you have not given it. The line "Check the dynamic attribute" names the field it was reading. Add the matching [data file](data-files.md).

**A page is not in the menu.** Give it `eleventyNavigation` with a `key` in its front matter. See [Writing content](writing-content.md#pages).

**The menu is in a strange order.** Two pages share the same `order`. Give each its own.

**A deck is not in the slide list.** Its front matter needs both `week` and `day`, and the folder needs `index.11tydata.js`. See [Writing content](writing-content.md#slide-decks).

**Today's class is not marked, or the wrong day is.** The marker uses `institution.timezone` from `eleventy.config.js`. Set it to your campus's time zone. Nothing is marked outside the term's dates.

**A lesson plan or speaker notes are missing from the site you published.** That is on purpose: the publishing build is the student build. See [Instructor and student builds](configuration.md#instructor-and-student-builds).

**The page does not update when I save.** Make sure `npm start` is still running in the terminal. For a change to `eleventy.config.js`, stop it with `Ctrl+C` and start it again.

**Still stuck?** Copy the first lines of the message, and the file it mentions, into a question for whoever helps you with the course.
