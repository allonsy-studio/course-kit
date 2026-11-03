# Getting started

This walks you through the sample course in [`examples/starter`](../examples/starter): what each file is, and what to change to make it yours. It takes about half an hour.

## 1. Set it up

You need [Node.js](https://nodejs.org) 22 or newer.

1. Copy `examples/starter` to a new folder for your course.
2. Add the `package.json` from the [README](../README.md#start-here) to that folder.
3. In a terminal in that folder, run `npm install`, then `npm start`.
4. Open the address it prints. When you save a file, the page reloads.

To stop the server, press `Ctrl+C`. To build the site into a `public/` folder, run `npm run build`.

## 2. What is in the folder

```text
my-course/
├── eleventy.config.js     your settings (the college's name and time zone)
├── package.json
├── _data/                 describes your course: one small file per topic
│   ├── course.json        name, term, description, outcomes
│   ├── dates.json         the academic calendar
│   ├── schedule.json      meeting days and what each week covers
│   ├── instructor.json    you
│   ├── grading.json       how the grade is made up
│   ├── scale.json         letter-grade cut-offs
│   └── policies.json      attendance, honor code, and so on
└── content/               the pages
    ├── index.webc         the home page
    ├── schedule.webc      the schedule page
    └── slides/            slide decks
        ├── index.11tydata.js   tells Eleventy these files are decks
        ├── index.webc          the list of decks
        └── week-1-day-1.md     one deck
```

You will spend most of your time in `_data/` (set it once) and in `content/slides/` (every week).

## 3. Make it yours

Do these in order. After each, look at the page in your browser.

### Name your course and term

Open `_data/course.json`. Change `code`, `name`, `description` and `outcomes`. The `term` says which term of `dates.json` you are in:

```json
"term": { "year": 2026, "season": "fall" }
```

The season is lowercase: `spring`, `summer` or `fall`.

### Enter the calendar

Open `_data/dates.json`. Replace the dates with your college's calendar for the term: the first and last day of classes, holidays, deadlines, and the final exam window. Give each holiday a name under `LABELS`.

### Say when you meet

Open `_data/schedule.json`. Under `meetings`, list your days and time. Each entry in `weeks` is one week of the term, in order. For each week, list the `topics` and any `readings`. The kit works out each meeting's date from the calendar, skips holidays, and builds the schedule page and a lesson plan for every meeting.

### Add yourself, your grading and your policies

Edit `instructor.json`, `grading.json`, `scale.json` and `policies.json`. [Data files](data-files.md) explains every field. Your editor can check them as you type: each file starts with a `$schema` line that points at the kit's description of it.

### Set the college's name and time zone

Open `eleventy.config.js` and change `institution`. The time zone decides which day the schedule marks as today. See [Configuration](configuration.md).

## 4. Write a slide deck

Open `content/slides/week-1-day-1.md`. The top of the file says which meeting it is for:

```yaml
---
title: Welcome to the course
week: 1
day: 1
---
```

`week` and `day` match the schedule: day 1 is that week's first meeting. A deck needs both, so the schedule and the lesson plan can find it. Copy the file to `week-1-day-2.md` for the next meeting. [Writing content](writing-content.md#slide-decks) covers the slide syntax.

Each deck also gets a speaker-notes page for you, at `/lessons/week-1/day-1/notes/`. Only the instructor build includes it.

## 5. Publish

Build the version students see:

```sh
ELEVENTY_ENV=production npx eleventy
```

This also writes the syllabus PDF, which needs the `puppeteer` package (`npm install puppeteer`). To skip the PDF, pass `pdf: false` to `courseKit` in `eleventy.config.js`. Upload the `public/` folder to wherever you host the course. [Configuration](configuration.md#building) explains the builds.

## When something goes wrong

Read the first line of the message: it says what to fix. [Troubleshooting](troubleshooting.md) lists the common ones.
