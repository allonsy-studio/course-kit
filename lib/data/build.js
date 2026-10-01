/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean} whether this build is a production build
 */
export const isProduction = (env = process.env) => (env.ELEVENTY_ENV || "development") === "production";

/**
 * The build's audience: anything but "student" is instructor.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ value: string, student: boolean, instructor: boolean }}
 */
export function resolveAudience(env = process.env) {
	const student = (env.AUDIENCE ?? (isProduction(env) ? "student" : "instructor")) === "student";
	return { value: student ? "student" : "instructor", student, instructor: !student };
}

/**
 * Whether this build writes the syllabus PDF, so a dev build never links one it did not write.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ available: boolean }}
 */
export const resolvePdf = (env = process.env) => ({ available: isProduction(env) || env.BUILD_PDF === "1" });
