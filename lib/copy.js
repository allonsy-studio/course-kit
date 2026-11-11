import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Every student-facing string, by namespace. A course overrides any of them in
 * `_data/strings.json`, which has this shape and is partial. A key with
 * `_one` / `_other` variants is picked by a count; `{name}` marks a value filled
 * at render time. The same table reaches scripts through the `#copy-data` block.
 * @type {Record<string, Record<string, string | Record<string, string>>>}
 */
export const COPY_DEFAULTS = {
	common: {
		sep: " · ",
	},
	nav: {
		site: "Site",
		syllabus: "Syllabus",
		contact: "Contact",
		openSource: "Open source",
	},
	code: {
		copy: "Copy code",
		copied: "Copied",
		selected: "Code selected. Press your copy shortcut.",
		plain: "Code",
		languages: {
			bash: "Terminal",
			sh: "Terminal",
			shell: "Terminal",
			zsh: "Terminal",
			console: "Terminal",
			shellsession: "Terminal",
			css: "CSS",
			scss: "SCSS",
			html: "HTML",
			markup: "HTML",
			webc: "WebC",
			njk: "Nunjucks",
			xml: "XML",
			svg: "SVG",
			js: "JavaScript",
			javascript: "JavaScript",
			jsx: "JSX",
			ts: "TypeScript",
			typescript: "TypeScript",
			json: "JSON",
			md: "Markdown",
			markdown: "Markdown",
			php: "PHP",
			py: "Python",
			python: "Python",
			java: "Java",
			sql: "SQL",
			http: "HTTP",
			yaml: "YAML",
			yml: "YAML",
			text: "Text",
		},
	},
	home: {
		heading: "Where the course is",
		todayLabel: "Today's class",
		nextLabel: "Next class",
		firstLabel: "First class",
		when: "Week {week} · {weekday}, {date}",
		openSlides: "Open the slides",
		seeWeek: "See the week",
		comingUp: "Coming up",
		fullSchedule: "Full schedule",
		nothingDue: "Nothing else is due this term.",
		dueToday: "Today",
		dueTomorrow: "Tomorrow",
		dueInDays_one: "In {count} day",
		dueInDays_other: "In {count} days",
		progress: "Progress",
		weeksDone: "{done} of {total} weeks done",
		week: "Week {week}",
		stateDone: "Done",
		stateNow: "Now",
	},
	schedule: {
		thisWeek: "This week",
		upNext: "Up next",
		read: "Read",
		dueThisWeek: "Due this week",
		today: "Today",
		next: "Next",
		stateDone: "Done",
		stateNow: "Now",
		hidePast: "Hide past weeks",
		weeksDone: "{done} of {total} weeks done.",
		pastHidden_one: "{count} finished week hidden.",
		pastHidden_other: "{count} finished weeks hidden.",
		weekHeading: "Week {week}",
		colClass: "Class",
		colTopics: "Topics",
		colFor: "For this class",
		readBefore: "Read before class",
		due: "Due",
		dueOn: "due {when}",
		materials: "Materials",
		slides: "Slides",
		addendum: "Addendum",
		weekResources: "This week’s resources",
		noClass: "No class — {reason}",
		substitution: "Runs a {weekday} schedule",
		dueKeyLabel: "Key to due items",
		graded: "graded",
		notGraded: "not graded",
		dueKindTest: "Test",
		dueKindGraded: "Graded",
		dueKindReading: "Reading check",
		dueKindPractice: "Practice",
		finalExam: "Final exam",
	},
	glossary: {
		groupBy: "Group by",
		byAz: "A to Z",
		byTest: "Test",
		byMeeting: "Class meeting",
		mode: "Mode",
		review: "Review",
		flashcards: "Flashcards",
		search: "Search terms",
		clear: "Clear",
		clearSearch: "Clear search",
		filterSummary: "Filter by test or {reading}",
		filtersOn: "({count} on)",
		count: "{shown} of {total} terms",
		clearFilters: "Clear filters",
		removeFilter: "Remove {kind} filter: {label}",
		meetingChip: "Class meeting: {label}",
		taughtIn: "Taught in",
		slideRef: "Week {week} · {weekday}, slide {slide}",
		example: "Example",
		known: "✓ known",
		noMatch: "No terms match.",
		noMatchHint: "Clear the search or a filter to see more.",
		noMatchStudy: "Clear the search or a filter to study more.",
		terms_one: "{count} term",
		terms_other: "{count} terms",
		card: "Card {n} of {total}",
		toStudy: "{count} to study",
		knownOf: "{known} of {total} known",
		shuffle: "Shuffle",
		defFirst: "Definition first",
		resetKnown: "Reset known",
		knownMeter: "Known terms",
		allKnown: "You know every card in this set.",
		markedKnown: "{known} of {total} marked known.",
		startOver: "Start over with the ones I know",
		showDefinition: "Show definition",
		showTerm: "Show term",
		iKnow: "I know this",
		later: "Show me again later",
		prev: "← Previous",
		next: "Next →",
		hint: "Space reveals · arrows move",
		defShown: "Definition shown for {term}",
		symbols: "Symbols",
		glossary: "Glossary",
		courseGlossary: "Course glossary",
		termsFromClassEach: "terms from class. Each carries tags for its test, its {reading} and the meeting that taught it. Group by any of them, search, or narrow the list to what you are studying.",
	},
	practice: {
		colSheet: "Practice sheet",
		colFor: "For",
		caption: "Every practice sheet, with what it is for",
		empty: "No practice sheets posted yet.",
	},
	syllabus: {
		due: "Due:",
		projectDue: "{date}, {time}",
		projectPage: "Full requirements, milestone dates, and the grading rubric are on {link}.",
		projectPageLink: "the project page",
		syllabus: "Syllabus",
		learningOutcomes: "Learning outcomes",
		uponCompletingThisCourse: "Upon completing this course students will be able to:",
		additionalOutcomesInThis: "Additional outcomes in this section",
		text: "Text",
		noTextIsRequired: "No text is required.",
		required: "Required:",
		technology: "Technology",
		bringALaptopMeeting: "Bring a laptop meeting the minimum specifications specified by {institution} to class every day.",
		theCollege: "the college",
		accessIsRequired: "{lms} access is required.",
		coursework: "Coursework",
		exam: "Exam:",
		points: "{display}, {points} points",
		atTheLastClassMeeting: "at the last class meeting, {lastMeeting}",
		grading: "Grading",
		keyDates: "Key dates",
		thisSectionsFinalExam: "This section's final exam",
		classStart: "{days} at {time}",
	},
	courseSummary: {
		projectDue: "The final project is due {when}; its milestones and rubric are on {link}.",
		projectDueShort: "The final project is due {when}.",
		projectPageLink: "the project page",
		howThisSectionIs: "How this section is taught",
		scheduleClassResources: "Schedule & class resources",
		prerequisites: "Prerequisites:",
		thisIsAProposed: "This is a proposed outline of topics and is subject to change. Any changes will be announced in class.",
		eachWeekListsWhatTo: "Each week lists what to read before its first meeting and the resources posted after class.",
		allAssignmentsWillBe: "All assignments will be posted in {lms}.",
		theFinalExamFalls: "The final exam falls in the exam period ({period}); the exact date and time will be announced in class.",
		thisSectionsFinalExamIs: "This section's final exam is {slot} — see the {link} section.",
		coursework: "Coursework",
		thisDocumentOmitsTheWeekbyweek: "This document omits the week-by-week schedule, which may be adjusted during the term{live}.",
		theLiveScheduleIsPublished: "; the live schedule is published at {url}",
	},
	worksheet: {
		notice: "Nothing here is recorded or submitted.",
		noticeBody: "Your answers are saved in this browser only and go nowhere else. Checking an answer shows you the reasoning and the source it came from.",
		termsHeading: "Terms to know",
		termsHint: "Select a term for its definition, and a link to the source it comes from.",
		termSource: "",
		citeHeading: "Where this comes from",
		citeLabel: "Where this comes from, question",
		chooseOne: "Choose one answer",
		checkAll: "See results",
		resetAll: "Clear my answers",
		checkSection: "Check section",
		resetSection: "Clear section",
		section: "Section",
		wordBank: "Word bank",
		answer: "Answer:",
		showAnswer: "Show the answer",
		checkYourself: "Check yourself",
		verdict: "Verdict",
		judgeLine: "Select the line that causes the problem",
		judgeNoLine: "No line — it is fine as written",
		notGraded: "Not graded",
		navHeading: "Questions",
		resultsHeading: "Results",
		retryMissed: "Try missed questions",
		scoreOf: "of {total}",
		statusRight: "Correct",
		statusWrong: "Try again",
		statusPartial: "Unfinished",
		statusUnattempted: "Unattempted",
		statusAnswered: "Not checked",
		statusSelf: "Check yourself",
		tallyCorrect: "{right} of {total} correct",
		tallyWrong: "{count} to try again",
		tallyPartial: "{count} unfinished",
		tallyUnattempted: "{count} unattempted",
		tallySelf: "{count} to check yourself",
		feedbackRight: "Correct.",
		feedbackRightAll: "Correct: all {total} parts.",
		feedbackParts: "{right} of {total} parts correct",
		feedbackBlank: "{count} left blank",
		feedbackUnattempted: "Unattempted.",
		retryCount_one: "{count} question to try again",
		retryCount_other: "{count} questions to try again",
		confirmClearAll: "Clear every answer on this worksheet? This can't be undone.",
		confirmClearSection: "Clear every answer in this section? This can't be undone.",
		checkOne: "Check answer",
		restored: "Restored your answers from {when}.",
	},
	siteFooter: {
		pages: "Pages",
		policies: "Policies",
	},
	courseDocuments: {
		additionalResources: "Additional resources",
	},
	policies: {
		policies: "Policies",
		readTheFullPolicy: "Read the full policy",
	},
	grading: {
		gradeWeighting: "Grade weighting",
		category: "Category",
		weight: "Weight",
		gradingScale: "Grading scale",
		grade: "Grade",
		weightedAverage: "Weighted average",
		andAbove: "{min} and above",
		below: "below {max}",
	},
	scheduleOverview: {
		schedule: "Schedule",
		keyDates: "Key dates",
		jumpTo: "Jump to",
		tests: "Tests",
		finalProject: "Final project",
		finalExam: "Final exam",
		exam: "Exam",
		noClass: "No class",
	},
	slideTimetable: {
		everySlideDeckFor: "Every slide deck for this section, one row per week and one column per meeting day",
		week: "Week",
		noMeeting: "No meeting",
		noClass: "No class: {reason}",
		noDeck: "No deck",
		draftNotInThe: "Draft, not in the student build",
		speakerNotes: "Speaker notes",
		addendumDraftNotIn: "Addendum draft, not in the student build",
		addendumSpeakerNotes: "Addendum speaker notes",
	},
	tableRubric: {
		criteria: "Criteria",
		points: "Points",
		pointsEach: "{points} points",
		totalPointsPossible: "Total points possible",
		milestone: "Milestone",
		due: "Due",
		whatIsGraded: "What is graded",
	},
	demoWeeks: {
		lessonPlan: "Lesson plan",
		shownAgainFirstUsed: "Shown again, first used {date}",
		downloadTheHtmlFile: "Download the HTML file",
		usedAgain: "Used again {dates}",
	},
	instructor: {
		yourInstructor: "Your instructor",
		name: "Name",
		office: "Office",
		officeHours: "Office hours",
		email: "Email",
		message: "Message",
		sendMeAMessage: "Send me a message",
		blog: "Blog",
		instructor: "Instructor",
	},
	codepenEmbed: {
		theCode: "The code",
		html: "HTML",
		css: "CSS",
		javascript: "JavaScript",
		htmlSource: "HTML source",
		cssSource: "CSS source",
		javascriptSource: "JavaScript source",
	},
	promptCopy: {
		copyThisPrompt: "Copy this prompt",
		promptCopied: "Prompt copied",
		promptCopiedToThe: "Prompt copied to the clipboard.",
		promptSelectedPressYour: "Prompt selected — press your copy shortcut.",
	},
};

let cachedDir = "_data";
/** The last copy built, reused until `strings.json` changes. */
let resolved = null;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Throw on any key `strings.json` names that is not a copy key, or a value that is not a string.
 * @param {object} strings the parsed file
 */
const checkStrings = (strings) => {
	for (const [ns, table] of Object.entries(strings)) {
		if (ns === "$schema") continue;
		if (!(ns in COPY_DEFAULTS) || !isObject(table)) throw new Error(`strings.json: "${ns}${isObject(table) ? `.${Object.keys(table)[0] ?? ""}` : ""}" is not a copy key`);
		for (const [key, value] of Object.entries(table)) {
			if (!(key in COPY_DEFAULTS[ns])) throw new Error(`strings.json: "${ns}.${key}" is not a copy key`);
			if (ns === "code" && key === "languages") {
				if (!isObject(value) || !Object.values(value).every((label) => typeof label === "string")) throw new Error("strings.json: \"code.languages\" must map language names to strings");
			} else if (typeof value !== "string") {
				throw new Error(`strings.json: "${ns}.${key}" must be a string`);
			}
		}
	}
};

/**
 * The copy: the defaults, then the course's `_data/strings.json` over them.
 * Remembers the `dataDir` it is given, so a later call without one (a worksheet, the markdown renderer) reads the same file.
 * @param {{ dataDir?: string }} [options]
 * @returns {typeof COPY_DEFAULTS}
 */
export function resolveCopy({ dataDir } = {}) {
	if (dataDir) cachedDir = dataDir;
	const file = join(cachedDir, "strings.json");
	let stamp = 0;
	try {
		stamp = statSync(file).mtimeMs;
	} catch {
		// No strings.json: the defaults stand.
	}
	if (resolved?.file === file && resolved.stamp === stamp) return resolved.copy;
	let strings = {};
	if (stamp) {
		try {
			strings = JSON.parse(readFileSync(file, "utf8"));
		} catch (error) {
			throw new Error(`strings.json: ${file} is not valid JSON (${error.message})`, { cause: error });
		}
	}
	checkStrings(strings);
	const copy = {};
	for (const [ns, table] of Object.entries(COPY_DEFAULTS)) {
		copy[ns] = { ...table, ...strings[ns] };
		if (ns === "code") copy.code.languages = { ...table.languages, ...strings.code?.languages };
	}
	resolved = { file, stamp, copy };
	return copy;
}

/**
 * Replace each `{name}` in a template.
 * @param {string} template
 * @param {Record<string, unknown>} [vars]
 * @returns {string}
 */
export const fill = (template, vars = {}) => String(template ?? "").replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));

/**
 * The variant of a key for a count: `<key>_one`, `<key>_other` and so on, by the language's plural rules.
 * @param {Record<string, string>} table
 * @param {string} key
 * @param {number} count
 * @param {string} [lang]
 * @returns {string}
 */
export const plural = (table, key, count, lang = "en-US") => table[`${key}_${new Intl.PluralRules(lang).select(count)}`] ?? table[`${key}_other`] ?? table[key] ?? "";

/**
 * The JSON the `#copy-data` block carries: the copy, with the page's worksheet copy in place of the default.
 * Escapes `<` so the block can never close its own script tag.
 * @param {{ copy: object, worksheet?: { copy?: object } }} data
 * @returns {string}
 */
export const copyJson = (data) => JSON.stringify({ ...data.copy, worksheet: data.worksheet?.copy ?? data.copy.worksheet }).replaceAll("<", "\\u003c");
