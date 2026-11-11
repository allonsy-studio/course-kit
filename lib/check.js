/** The options `courseKit` accepts. A group lists its own keys; `null` means a plain value. */
const OPTIONS = {
	inputDir: null,
	outputDir: null,
	dataDir: null,
	components: null,
	theme: null,
	copy: null,
	clientCopy: null,
	institution: ["name", "timezone", "lms"],
	site: ["description", "keywords", "language"],
	lessons: ["segments", "defaultDays"],
	demos: ["runtime", "dir"],
	slides: ["decks"],
	pdf: ["course", "term", "dataDir"],
	prism: ["theme", "plugins"],
	worksheets: ["checkMode"],
};

const RUNTIMES = ["none", "codepen", "pyscript"];

/** How many single-character edits turn one word into another. */
const distance = (a, b) => {
	const row = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		let previous = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const above = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
			previous = above;
		}
	}
	return row[b.length];
};

/**
 * " Did you mean `demos`?" for a near miss, else the full list.
 * @param {string} name
 * @param {string[]} valid
 * @returns {string}
 */
const hint = (name, valid) => {
	const close = valid.find((candidate) => distance(name.toLowerCase(), candidate.toLowerCase()) <= 2);
	return close ? ` Did you mean \`${close}\`?` : ` The options are: ${valid.join(", ")}.`;
};

/**
 * Fail at startup, in plain language, on an option that would otherwise be
 * ignored: a misspelled name, a runtime that does not exist, a time zone no
 * computer knows.
 * @param {object} [options] what the course passed to `courseKit`
 * @throws {Error}
 */
export function checkOptions(options = {}) {
	if (options === null || typeof options !== "object" || Array.isArray(options)) {
		throw new Error("courseKit(config, options): options must be an object, such as { institution: { name: \"My College\" } }.");
	}
	for (const [name, value] of Object.entries(options)) {
		if (!(name in OPTIONS)) throw new Error(`courseKit: unknown option \`${name}\`.${hint(name, Object.keys(OPTIONS))}`);
		const keys = OPTIONS[name];
		if (!keys || value === undefined || (name === "pdf" && value === false)) continue;
		if (value === null || typeof value !== "object") throw new Error(`courseKit: \`${name}\` must be an object with ${keys.map((key) => `\`${key}\``).join(", ")}.`);
		for (const key of Object.keys(value)) {
			if (!keys.includes(key)) throw new Error(`courseKit: unknown option \`${name}.${key}\`.${hint(key, keys)}`);
		}
	}
	const runtime = options.demos?.runtime;
	if (runtime !== undefined && !RUNTIMES.includes(runtime)) {
		throw new Error(`courseKit: \`demos.runtime\` is "${runtime}", but it must be one of ${RUNTIMES.map((name) => `"${name}"`).join(", ")}.`);
	}
	const timeZone = options.institution?.timezone;
	if (timeZone !== undefined) {
		try {
			new Intl.DateTimeFormat("en-US", { timeZone });
		} catch {
			throw new Error(`courseKit: \`institution.timezone\` is "${timeZone}", which is not a time zone name. Use one like "America/New_York".`);
		}
	}
	const checkMode = options.worksheets?.checkMode;
	if (checkMode !== undefined && !["question", "end"].includes(checkMode)) {
		throw new Error(`courseKit: \`worksheets.checkMode\` is "${checkMode}", but it must be "question" or "end".`);
	}
	if (options.components !== undefined && !Array.isArray(options.components)) {
		throw new Error("courseKit: `components` must be a list of file patterns, such as [\"components/*.webc\"].");
	}
}

/**
 * Problems in the course's data that do not stop the build but would give a
 * wrong page: grade weights that do not total 100%, project pieces that do not
 * total the project's points.
 * @param {{ grading?: object, project?: object }} data
 * @returns {string[]}
 */
export function courseWarnings({ grading, project } = {}) {
	const warnings = [];
	const weights = Object.entries(grading ?? {})
		.filter(([key]) => key !== "$schema")
		.map(([, category]) => parseFloat(category?.weight));
	if (weights.length && weights.every((weight) => !Number.isNaN(weight))) {
		const total = weights.reduce((sum, weight) => sum + weight, 0);
		if (Math.round(total * 100) !== 10000) warnings.push(`grading.json: the weights add up to ${total}%, not 100%.`);
	}
	if (Array.isArray(project?.components) && typeof project.scale === "number") {
		const points = project.components.reduce((sum, piece) => sum + (piece.points ?? 0), 0);
		if (points !== project.scale) warnings.push(`project.json: the components add up to ${points} points, but the project's scale is ${project.scale}.`);
	}
	return warnings;
}
