# Copy keys

Generated from `lib/copy.js` by `yarn docs`. Do not edit by hand.

Every student-facing and instructor-facing string, by namespace. Override any key in the course's `_data/strings.json`, which has this shape and is partial; see [Changing the wording](configuration.md#changing-the-wording). `{name}` marks a value filled at render time. A key with `_one` and `_other` variants is picked by a count.

## What a page carries

A page's `#copy-data` block carries only the namespaces its scripts read: `code`, `common`, `glossary`, `home`, `promptCopy`, `schedule`, `themePanel`, `worksheet` (`CLIENT_COPY` in `lib/copy.js`); a worksheet's own copy replaces `worksheet`. A course whose own script reads more adds them: `courseKit(config, { clientCopy: ["demo", "demoCheck"] })`. A script never parses the block itself: the layout renders a small reader after it, and the script uses `window.ckCopy.t("ns", "key", vars)`. A test scans the kit's scripts and fails if a namespace they read is missing from `CLIENT_COPY`, or one is listed that no script reads.

## Naming

- The namespace is the component, layout, script or build module's file name in lowerCamelCase (`schedule-overview` is `scheduleOverview`).
- The key is the lowerCamelCase of the first four words of the English string, with punctuation and placeholders dropped ("Full requirements, milestone dates, and…" is `fullRequirementsMilestoneDates`). A string that is mostly placeholders, or that collides with another key in its namespace, gets a short descriptive name instead (`contrast`, `weekDay`, `footer`).
- The default is the English with each interpolated value turned into a `{name}` placeholder.
- A course that has components of its own adds its own namespaces; see [Course-only copy](configuration.md#course-only-copy).

## `common`

| Key | Default |
|---|---|
| `sep` | ` · ` |

## `nav`

| Key | Default |
|---|---|
| `site` | `Site` |
| `syllabus` | `Syllabus` |
| `contact` | `Contact` |
| `openSource` | `Open source` |

## `code`

| Key | Default |
|---|---|
| `copy` | `Copy code` |
| `copied` | `Copied` |
| `selected` | `Code selected. Press your copy shortcut.` |
| `plain` | `Code` |
| `languages` | a map of language names to labels (31 entries; see `lib/copy.js`) |

## `home`

| Key | Default |
|---|---|
| `heading` | `Where the course is` |
| `todayLabel` | `Today's class` |
| `nextLabel` | `Next class` |
| `firstLabel` | `First class` |
| `when` | `Week {week} · {weekday}, {date}` |
| `openSlides` | `Open the slides` |
| `seeWeek` | `See the week` |
| `comingUp` | `Coming up` |
| `fullSchedule` | `Full schedule` |
| `nothingDue` | `Nothing else is due this term.` |
| `dueToday` | `Today` |
| `dueTomorrow` | `Tomorrow` |
| `dueInDays_one` | `In {count} day` |
| `dueInDays_other` | `In {count} days` |
| `progress` | `Progress` |
| `weeksDone` | `{done} of {total} weeks done` |
| `week` | `Week {week}` |
| `stateDone` | `Done` |
| `stateNow` | `Now` |

## `schedule`

| Key | Default |
|---|---|
| `thisWeek` | `This week` |
| `upNext` | `Up next` |
| `read` | `Read` |
| `dueThisWeek` | `Due this week` |
| `today` | `Today` |
| `next` | `Next` |
| `stateDone` | `Done` |
| `stateNow` | `Now` |
| `hidePast` | `Hide past weeks` |
| `weeksDone` | `{done} of {total} weeks done.` |
| `pastHidden_one` | `{count} finished week hidden.` |
| `pastHidden_other` | `{count} finished weeks hidden.` |
| `weekHeading` | `Week {week}` |
| `colClass` | `Class` |
| `colTopics` | `Topics` |
| `colFor` | `For this class` |
| `readBefore` | `Read before class` |
| `due` | `Due` |
| `dueOn` | `due {when}` |
| `materials` | `Materials` |
| `slides` | `Slides` |
| `addendum` | `Addendum` |
| `weekResources` | `This week’s resources` |
| `noClass` | `No class — {reason}` |
| `substitution` | `Runs a {weekday} schedule` |
| `dueKeyLabel` | `Key to due items` |
| `graded` | `graded` |
| `notGraded` | `not graded` |
| `dueKindTest` | `Test` |
| `dueKindGraded` | `Graded` |
| `dueKindReading` | `Reading check` |
| `dueKindPractice` | `Practice` |
| `finalExam` | `Final exam` |

## `glossary`

| Key | Default |
|---|---|
| `groupBy` | `Group by` |
| `byAz` | `A to Z` |
| `byTest` | `Test` |
| `byMeeting` | `Class meeting` |
| `mode` | `Mode` |
| `review` | `Review` |
| `flashcards` | `Flashcards` |
| `search` | `Search terms` |
| `clear` | `Clear` |
| `clearSearch` | `Clear search` |
| `filterSummary` | `Filter by test or {reading}` |
| `filtersOn` | `({count} on)` |
| `count` | `{shown} of {total} terms` |
| `clearFilters` | `Clear filters` |
| `removeFilter` | `Remove {kind} filter: {label}` |
| `meetingChip` | `Class meeting: {label}` |
| `taughtIn` | `Taught in` |
| `slideRef` | `Week {week} · {weekday}, slide {slide}` |
| `example` | `Example` |
| `known` | `✓ known` |
| `noMatch` | `No terms match.` |
| `noMatchHint` | `Clear the search or a filter to see more.` |
| `noMatchStudy` | `Clear the search or a filter to study more.` |
| `terms_one` | `{count} term` |
| `terms_other` | `{count} terms` |
| `card` | `Card {n} of {total}` |
| `toStudy` | `{count} to study` |
| `knownOf` | `{known} of {total} known` |
| `shuffle` | `Shuffle` |
| `defFirst` | `Definition first` |
| `resetKnown` | `Reset known` |
| `knownMeter` | `Known terms` |
| `allKnown` | `You know every card in this set.` |
| `markedKnown` | `{known} of {total} marked known.` |
| `startOver` | `Start over with the ones I know` |
| `showDefinition` | `Show definition` |
| `showTerm` | `Show term` |
| `iKnow` | `I know this` |
| `later` | `Show me again later` |
| `prev` | `← Previous` |
| `next` | `Next →` |
| `hint` | `Space reveals · arrows move` |
| `defShown` | `Definition shown for {term}` |
| `symbols` | `Symbols` |
| `glossary` | `Glossary` |
| `courseGlossary` | `Course glossary` |
| `slidesOnly` | `Slides only` |
| `finalExam` | `Final exam` |
| `reading` | `Reading` |
| `chapter` | `Chapter` |
| `section` | `Section` |
| `unit` | `Unit` |
| `module` | `Module` |
| `lesson` | `Lesson` |
| `termsFromClassEach` | `terms from class. Each carries tags for its test, its {reading} and the meeting that taught it. Group by any of them, search, or narrow the list to what you are studying.` |

## `practice`

| Key | Default |
|---|---|
| `colSheet` | `Practice sheet` |
| `colFor` | `For` |
| `caption` | `Every practice sheet, with what it is for` |
| `empty` | `No practice sheets posted yet.` |

## `syllabus`

| Key | Default |
|---|---|
| `due` | `Due:` |
| `projectDue` | `{date}, {time}` |
| `projectPage` | `Full requirements, milestone dates, and the grading rubric are on {link}.` |
| `projectPageLink` | `the project page` |
| `syllabus` | `Syllabus` |
| `learningOutcomes` | `Learning outcomes` |
| `uponCompletingThisCourse` | `Upon completing this course students will be able to:` |
| `additionalOutcomesInThis` | `Additional outcomes in this section` |
| `text` | `Text` |
| `noTextIsRequired` | `No text is required.` |
| `required` | `Required:` |
| `technology` | `Technology` |
| `bringALaptopMeeting` | `Bring a laptop meeting the minimum specifications specified by {institution} to class every day.` |
| `theCollege` | `the college` |
| `accessIsRequired` | `{lms} access is required.` |
| `coursework` | `Coursework` |
| `exam` | `Exam:` |
| `points` | `{display}, {points} points` |
| `atTheLastClassMeeting` | `at the last class meeting, {lastMeeting}` |
| `grading` | `Grading` |
| `keyDates` | `Key dates` |
| `thisSectionsFinalExam` | `This section's final exam` |
| `classStart` | `{days} at {time}` |

## `courseSummary`

| Key | Default |
|---|---|
| `projectDue` | `The final project is due {when}; its milestones and rubric are on {link}.` |
| `projectDueShort` | `The final project is due {when}.` |
| `projectPageLink` | `the project page` |
| `howThisSectionIs` | `How this section is taught` |
| `scheduleClassResources` | `Schedule & class resources` |
| `prerequisites` | `Prerequisites:` |
| `thisIsAProposed` | `This is a proposed outline of topics and is subject to change. Any changes will be announced in class.` |
| `eachWeekListsWhatTo` | `Each week lists what to read before its first meeting and the resources posted after class.` |
| `allAssignmentsWillBe` | `All assignments will be posted in {lms}.` |
| `theFinalExamFalls` | `The final exam falls in the exam period ({period}); the exact date and time will be announced in class.` |
| `thisSectionsFinalExamIs` | `This section's final exam is {slot} — see the {link} section.` |
| `coursework` | `Coursework` |
| `thisDocumentOmitsTheWeekbyweek` | `This document omits the week-by-week schedule, which may be adjusted during the term{live}.` |
| `theLiveScheduleIsPublished` | `; the live schedule is published at {url}` |

## `worksheet`

| Key | Default |
|---|---|
| `notice` | `Nothing here is recorded or submitted.` |
| `noticeBody` | `Your answers are saved in this browser only and go nowhere else. Checking an answer shows you the reasoning and the source it came from.` |
| `termsHeading` | `Terms to know` |
| `termsHint` | `Select a term for its definition, and a link to the source it comes from.` |
| `termSource` | (empty) |
| `citeHeading` | `Where this comes from` |
| `citeLabel` | `Where this comes from, question` |
| `chooseOne` | `Choose one answer` |
| `checkAll` | `See results` |
| `resetAll` | `Clear my answers` |
| `checkSection` | `Check section` |
| `resetSection` | `Clear section` |
| `section` | `Section` |
| `wordBank` | `Word bank` |
| `answer` | `Answer:` |
| `showAnswer` | `Show the answer` |
| `checkYourself` | `Check yourself` |
| `verdict` | `Verdict` |
| `judgeLine` | `Select the line that causes the problem` |
| `judgeNoLine` | `No line — it is fine as written` |
| `notGraded` | `Not graded` |
| `navHeading` | `Questions` |
| `resultsHeading` | `Results` |
| `retryMissed` | `Try missed questions` |
| `scoreOf` | `of {total}` |
| `statusRight` | `Correct` |
| `statusWrong` | `Try again` |
| `statusPartial` | `Unfinished` |
| `statusUnattempted` | `Unattempted` |
| `statusAnswered` | `Not checked` |
| `statusSelf` | `Check yourself` |
| `tallyCorrect` | `{right} of {total} correct` |
| `tallyWrong` | `{count} to try again` |
| `tallyPartial` | `{count} unfinished` |
| `tallyUnattempted` | `{count} unattempted` |
| `tallySelf` | `{count} to check yourself` |
| `feedbackRight` | `Correct.` |
| `feedbackRightAll` | `Correct: all {total} parts.` |
| `feedbackParts` | `{right} of {total} parts correct` |
| `feedbackBlank` | `{count} left blank` |
| `feedbackUnattempted` | `Unattempted.` |
| `retryCount_one` | `{count} question to try again` |
| `retryCount_other` | `{count} questions to try again` |
| `confirmClearAll` | `Clear every answer on this worksheet? This can't be undone.` |
| `confirmClearSection` | `Clear every answer in this section? This can't be undone.` |
| `checkOne` | `Check answer` |
| `restored` | `Restored your answers from {when}.` |

## `siteFooter`

| Key | Default |
|---|---|
| `pages` | `Pages` |
| `policies` | `Policies` |

## `courseDocuments`

| Key | Default |
|---|---|
| `additionalResources` | `Additional resources` |

## `policies`

| Key | Default |
|---|---|
| `policies` | `Policies` |
| `readTheFullPolicy` | `Read the full policy` |

## `grading`

| Key | Default |
|---|---|
| `gradeWeighting` | `Grade weighting` |
| `category` | `Category` |
| `weight` | `Weight` |
| `gradingScale` | `Grading scale` |
| `grade` | `Grade` |
| `weightedAverage` | `Weighted average` |
| `andAbove` | `{min} and above` |
| `below` | `below {max}` |

## `scheduleOverview`

| Key | Default |
|---|---|
| `schedule` | `Schedule` |
| `keyDates` | `Key dates` |
| `jumpTo` | `Jump to` |
| `tests` | `Tests` |
| `finalProject` | `Final project` |
| `finalExam` | `Final exam` |
| `exam` | `Exam` |
| `noClass` | `No class` |

## `slideTimetable`

| Key | Default |
|---|---|
| `everySlideDeckFor` | `Every slide deck for this section, one row per week and one column per meeting day` |
| `week` | `Week` |
| `noMeeting` | `No meeting` |
| `noClass` | `No class: {reason}` |
| `noDeck` | `No deck` |
| `draftNotInThe` | `Draft, not in the student build` |
| `speakerNotes` | `Speaker notes` |
| `addendumDraftNotIn` | `Addendum draft, not in the student build` |
| `addendumSpeakerNotes` | `Addendum speaker notes` |

## `tableRubric`

| Key | Default |
|---|---|
| `criteria` | `Criteria` |
| `points` | `Points` |
| `pointsEach` | `{points} points` |
| `totalPointsPossible` | `Total points possible` |
| `milestone` | `Milestone` |
| `due` | `Due` |
| `whatIsGraded` | `What is graded` |

## `demoWeeks`

| Key | Default |
|---|---|
| `lessonPlan` | `Lesson plan` |
| `shownAgainFirstUsed` | `Shown again, first used {date}` |
| `downloadTheHtmlFile` | `Download the HTML file` |
| `usedAgain` | `Used again {dates}` |

## `instructor`

| Key | Default |
|---|---|
| `yourInstructor` | `Your instructor` |
| `name` | `Name` |
| `office` | `Office` |
| `officeHours` | `Office hours` |
| `email` | `Email` |
| `message` | `Message` |
| `sendMeAMessage` | `Send me a message` |
| `blog` | `Blog` |
| `instructor` | `Instructor` |

## `codepenEmbed`

| Key | Default |
|---|---|
| `theCode` | `The code` |
| `html` | `HTML` |
| `css` | `CSS` |
| `javascript` | `JavaScript` |
| `htmlSource` | `HTML source` |
| `cssSource` | `CSS source` |
| `javascriptSource` | `JavaScript source` |

## `base`

| Key | Default |
|---|---|
| `skipToContent` | `Skip to content` |

## `deck`

| Key | Default |
|---|---|
| `skipToFirstSlide` | `Skip to first slide` |
| `slides` | `Slides` |
| `previousSlide` | `Previous slide` |
| `nextSlide` | `Next slide` |
| `cycleColorTheme` | `Cycle color theme` |
| `toggleFullscreen` | `Toggle fullscreen` |

## `document`

| Key | Default |
|---|---|
| `contents` | `Contents` |

## `lesson`

| Key | Default |
|---|---|
| `lessonPlans` | `Lesson plans` |
| `onePlanPerClass` | `One plan per class meeting ({time}), generated from the course schedule and the academic calendar. Holidays are shown in sequence so the term reads day by day.` |
| `slideIndex` | `Slide index` |
| `everyDeckInMeeting` | `{link} — every deck in meeting order. Speaker notes are on a separate printable sheet per deck, linked as "Notes" below.` |
| `exercises` | `Exercises` |
| `theBriefAndStarter` | `{link} — the brief and starter for each. Exercises due on a meeting are linked from its row below.` |
| `instructorDeadlines` | `Instructor deadlines` |
| `dueDate` | `Due date` |
| `everyClassMeetingOf` | `Every class meeting of the term, in order` |
| `date` | `Date` |
| `links` | `Links` |
| `topics` | `Topics` |
| `runsASchedule` | `(runs a {weekday} schedule)` |
| `noClass` | `No class — {reason}` |
| `lessonPlan` | `Lesson\u00a0plan` |
| `slides` | `Slides` |
| `addendum` | `Addendum` |
| `notes` | `Notes` |
| `addendumNotes` | `Addendum notes` |
| `due` | `Due:` |

## `lessonDay`

| Key | Default |
|---|---|
| `weekDayLesson` | `Week {week}, Day {day} — Lesson Plan` |

## `lessonDetail`

| Key | Default |
|---|---|
| `week` | `Week {week}` |
| `weekDay` | `Week {week}, Day {day}` |
| `noClass` | `No class` |
| `lessonNavigation` | `Lesson navigation` |
| `allLessons` | `All lessons` |
| `previousDay` | `Previous day` |
| `nextDay` | `Next day` |
| `classMeetingOfThe` | `Class meeting #{meeting} of the term` |
| `noClassOn` | `No class on {reason}. Use this day to prep the next lesson or catch up on grading.` |
| `focus` | `Focus:` |
| `thisMeetingRunsA` | `This meeting runs a {weekday} schedule (college-wide) — plan the substituted day's session, not this weekday's usual rhythm.` |
| `aTestIsScheduledThis` | `A test is scheduled this week — confirm day, reserve class time, and remind students at least one meeting ahead.` |
| `thisWeeksTopics` | `This week's topics` |
| `beforeClass` | `Before class` |
| `reviewTheReadingsSee` | `Review the readings (see materials below)` |
| `prepareupdateSlidesAndLivedemo` | `Prepare/update slides and live-demo code` |
| `printOrOpenThe` | `Print or open the {link}` |
| `speakerNotesSheet` | `speaker notes sheet` |
| `stageStarterFilesOr` | `Stage starter files or lab handout if needed` |
| `checkForStudentQuestions` | `Check {lms} for student questions or submissions` |
| `lessonOutline` | `Lesson outline` |
| `lessonOutlineMinutes` | `Lesson outline ({minutes} minutes)` |
| `time` | `Time` |
| `segment` | `Segment` |
| `min` | `{minutes} min` |
| `afterClass` | `After class` |
| `postHandoutsToAnd` | `Post handouts to {resources} and link them in {schedule}'s {list} for the week; the slide deck publishes itself from {slides}, so it only needs a link there if students should see it from the schedule` |
| `noteAnythingNotCovered` | `Note anything not covered and roll it into the next lesson` |
| `postOrGradeLabhomework` | `Post or grade lab/homework in {lms} as needed` |
| `lessonTools` | `Lesson tools` |
| `onThisPage` | `On this page` |
| `materialsLinks` | `Materials & links` |

## `lessonMaterials`

| Key | Default |
|---|---|
| `slidesForThisMeeting` | `Slides for this meeting` |
| `speakerNotes` | `speaker notes` |
| `printable` | `(printable)` |
| `demosFromThisMeeting` | `Demos from this meeting` |
| `exercisesDue` | `Exercises due` |
| `readingForThisMeeting` | `Reading for this meeting` |
| `due` | `due {when}` |
| `deadlinesToAnnounce` | `Deadlines to announce` |
| `assignedBeforeThisWeek` | `Assigned before this week` |
| `postedForTheClass` | `Posted for the class` |
| `nothingPostedForThis` | `Nothing posted for this week yet.` |

## `lessons`

| Key | Default |
|---|---|
| `welcomeRecapThePrevious` | `Welcome, recap the previous class, open questions` |
| `welcomeIntroductionsHowThe` | `Welcome, introductions, how the course runs` |
| `instructionThisWeeksTopics` | `Instruction: this week's topics (see above)` |
| `guidedPracticeLabWork` | `Guided practice / lab work` |
| `wrapupRecapPreviewNext` | `Wrap-up: recap, preview next class, assignment reminders` |
| `buffer` | `Buffer` |
| `collegeHoliday` | `College holiday` |
| `introduceThisWeeksMaterial` | `Introduce this week's material` |
| `continuePracticeAndLab` | `Continue, practice, and lab work` |
| `tbd` | `TBD` |

## `term`

| Key | Default |
|---|---|
| `classesBegin` | `Classes begin` |
| `collegeHoliday` | `College holiday` |
| `lastDayOfClasses` | `Last day of classes` |
| `readingDaysNoClasses` | `Reading days (no classes or exams)` |
| `finalExaminationPeriod` | `Final examination period` |
| `preregistrationForTheNext` | `Pre-registration for the next term opens` |

## `deckNotes`

| Key | Default |
|---|---|
| `speakerNotes` | `Speaker notes` |
| `speakerNotesTitle` | `Speaker notes: {title}` |
| `weekDay` | `Week {week}, Day {day}` |
| `speakerNotesInstructorOnly` | `Speaker notes · instructor only` |
| `slideOpenInThe` | `Slide {number}, open in the deck` |
| `untitledSlide` | `Untitled slide` |

## `lessonPlans`

| Key | Default |
|---|---|
| `lessonPlans` | `Lesson plans` |
| `navTitle` | `Lesson Plans` |

## `markdown`

| Key | Default |
|---|---|
| `permalinkToThisHeading` | `Permalink to this heading` |

## `pdf`

| Key | Default |
|---|---|
| `footer` | `{course}: {name} — {term} syllabus · Generated {generated} ({version}) · Page {page} of {pages}` |

## `themePanel`

| Key | Default |
|---|---|
| `brand` | `Brand` |
| `brandColor` | `Brand color` |
| `brandColorForText` | `Brand color for text` |
| `textOnBrandColor` | `Text on brand color` |
| `wayfindingColor` | `Wayfinding color` |
| `textOnWayfindingColor` | `Text on wayfinding color` |
| `page` | `Page` |
| `pageBackground` | `Page background` |
| `cardsAndPanels` | `Cards and panels` |
| `linesAndBorders` | `Lines and borders` |
| `text` | `Text` |
| `bodyText` | `Body text` |
| `secondaryText` | `Secondary text` |
| `links` | `Links` |
| `theme` | `Theme` |
| `unsavedChanges` | `Unsaved changes` |
| `preview` | `Preview` |
| `light` | `Light` |
| `dark` | `Dark` |
| `everyColor` | `Every color` |
| `allTokens` | `All tokens` |
| `gradient` | `Gradient` |
| `addAColor` | `Add a color` |
| `undo` | `Undo` |
| `reset` | `Reset` |
| `save` | `Save` |
| `download` | `Download` |
| `hideTheThemePanel` | `Hide the theme panel` |
| `notACssColor` | `Not a CSS color` |
| `cssValue` | `{name}, CSS value` |
| `backToTheSaved` | `Back to the saved theme.` |
| `thePage` | `the page` |
| `theBrandColor` | `the brand color` |
| `passes` | `passes` |
| `below` | `below {minimum} : 1` |
| `contrast` | `{ratio} : 1 on {ground}, {verdict}` |
| `color` | `Color {n}` |
| `removeColor` | `Remove color {n}` |
| `saving` | `Saving…` |
| `savedToThe` | `Saved to {file}. The site is rebuilding.` |
| `notSaved` | `Not saved: {message}` |
| `downloadedPutItIn` | `Downloaded. Put it in {folder} to keep it.` |

## `promptCopy`

| Key | Default |
|---|---|
| `copyThisPrompt` | `Copy this prompt` |
| `promptCopied` | `Prompt copied` |
| `promptCopiedToThe` | `Prompt copied to the clipboard.` |
| `promptSelectedPressYour` | `Prompt selected — press your copy shortcut.` |
