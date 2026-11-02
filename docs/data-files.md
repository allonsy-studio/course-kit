# Data files

Your course is described by a handful of small `.json` files in the `_data/` folder. You write them once, and the kit builds the pages from them. The sample course has a working copy of each in [`examples/starter/_data`](../examples/starter/_data); copy one and edit it.

Every file starts with a `$schema` line:

```json
{
	"$schema": "../node_modules/@allons-y/course-kit/schemas/course.schema.json",
	"code": "CS101"
}
```

That line is for your editor. With it, VS Code and similar editors suggest the field names, explain each one when you hover, and underline a mistake as you type. The kit ignores the line itself.

JSON is strict. Text goes in double quotes, items in a list are separated by commas, and **there is no comma after the last item**. A stray comma is the most common mistake; the build names the file it is in.

## Which files do I need?

| File | Needed? | It holds | It feeds |
|---|---|---|---|
| `course.json` | **Yes** | The course's code, name, term, description and outcomes | The header, the home page, the syllabus, page titles |
| `dates.json` | **Yes** | Your college's academic calendar | The schedule dates, key dates, and every lesson plan |
| `schedule.json` | For a schedule | When you meet, and what each week covers | The schedule, the syllabus, the lesson plans |
| `instructor.json` | For `<instructor>` | Your name, office, hours and email | The instructor section |
| `grading.json` | For `<grading>` | The parts of the grade and their weights | The grading table and syllabus |
| `scale.json` | With grading | Letter-grade cut-offs | The grading scale |
| `policies.json` | For `<policies>` | Attendance, honor code and the other policies | The policies section |
| `project.json` | Optional | A staged final project and its rubric | Deadlines in the schedule, the syllabus |
| `theme.json` | Optional | Color overrides | The whole site; see [color tokens](tokens.md) |

A page that uses a component whose file is missing simply shows nothing for it, except `course.json` and `dates.json`, which stop the build with a message saying so.

## `course.json`

| Field | Meaning |
|---|---|
| `code`, `name` | The catalog code (`CS101`) and the course name. |
| `term` | `{ "year": 2026, "season": "fall" }`. It must match an entry in `dates.json`. The season is lowercase. |
| `status` | `active`, `upcoming` or `archived`. |
| `description` | The catalog description, as your college requires it on the syllabus. |
| `approach` | Optional: how *this* section runs the course. |
| `prerequisites`, `prerequisiteNote` | A list of codes, and an optional qualifier such as "or permission of the instructor". |
| `outcomes`, `additionalOutcomes` | What students will be able to do. `additionalOutcomes` is for ones beyond the catalog's. |
| `textbook` | `{ "required": "…", "access": ["steps to get it"] }`. Leave the key out if there is no text. |
| `requirements` | Software, hardware or accounts students need. |
| `documents` | Links shown under "Additional resources" on the home page. |

## `dates.json`

The college's calendar, keyed by year and then season. You can keep several terms in one file.

```json
{
	"LABELS": { "2026-11-26": "Thanksgiving Recess" },
	"2026": {
		"fall": {
			"start": "2026-08-25",
			"end": "2026-12-10",
			"holidays": ["2026-11-26"],
			"midTerm": "2026-10-16",
			"deadlines": { "addDrop": { "date": "2026-09-01", "label": "Last day to add or drop", "audience": "students" } },
			"finalExams": { "start": "2026-12-14", "end": "2026-12-18" }
		}
	}
}
```

- Dates are always `YYYY-MM-DD`.
- A holiday is one date, or `{ "start": …, "end": … }` for a break. `LABELS` names each, by its first date.
- A deadline's `audience` is `students` (shown on the syllabus) or `faculty` (shown only on your lesson plans).

## `schedule.json`

```json
{
	"meetings": { "days": ["Tuesday", "Thursday"], "time": "10:00AM–11:15AM" },
	"weeks": [
		{
			"topics": ["Welcome and how the course runs", "How the web works"],
			"readings": [{ "title": "MDN: How the web works", "href": "https://…", "check": "3 questions, due by the next class" }],
			"resources": []
		}
	]
}
```

- Each entry in `weeks` is one week, in order. The kit works out the dates from your calendar and skips holidays.
- A topic that is exactly `Test 1`, `Test 2` and so on is listed as a test on the schedule and syllabus.
- To give one meeting its own topics, add `days`: `[{ "day": 1, "topics": ["…"] }]`. Day 1 is the week's first meeting. A day can also carry its own `readings` and `due` list.
- `readings` are read before the week's first meeting; `check` says what the reading check asks. `resources` are handouts posted after class. Do not list slide decks or demos: each meeting links its own.
- `finalExam` is your section's exam slot, `{ "date", "start", "end", "note" }`. Leave it out until the registrar publishes it.

## `instructor.json`

`name`, `office`, `hours` (a list, one entry per block) and `email` are required. Write the email normally; the kit encodes it so it never appears in the page for spam bots to read. Optional: `photo` (a path under `/images/`), `profile`, `blog`, `note` (a response-time expectation) and `contact` (a path to a contact page, shown instead of the address on screen).

## `grading.json` and `scale.json`

`grading.json` has one entry per part of the grade:

```json
{
	"homework": { "title": "Homework", "weight": "40%", "body": "Weekly practice." },
	"tests": { "title": "Tests", "weight": "40%", "body": "Two tests." },
	"final": { "title": "Final exam", "weight": "20%", "body": "In the exam period." }
}
```

The weights must add up to 100%; the build warns when they do not. The names `homework`, `project` and `final` switch on matching sentences elsewhere (about where assignments are posted, the project's due date, the exam), so keep those names if you have those parts.

`scale.json` lists the cut-offs. `A`, `B`, `C` and `D` carry `min` ("this score and above"); `F` carries `max` ("below this score").

## `policies.json`

One entry per policy, each `{ "title", "body" }` with an optional `href` and `hrefText` for a link to the full text. The attendance policy and the college's required statements (`honorCode`, `dei`, `disabilities`, `titleIX`, `inclementWeather`) are expected; use your college's approved wording, or link to it. The order here is the order on the page.

## `project.json` (optional)

A staged final project. Give it a `title`, `url` (your project page), `weight`, `scale` (its points), `due` and `rubric`. Break it into dated pieces either with `components` (name, date, points) or by putting a `due` date on rubric milestones. The kit places each milestone on the last class meeting on or before its date and lists it under that meeting's deadlines. The build warns when the pieces do not add up to `scale`.

## Replacing a file with code

A data file can also be written in JavaScript (`_data/grading.js`) when you want to compute it. See [Configuration](configuration.md#data-the-kit-provides) for the names the kit builds itself.
