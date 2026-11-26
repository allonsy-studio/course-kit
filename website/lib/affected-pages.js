/**
 * Which built pages a pull request affects, for the browser tests (`website/cypress.config.js`).
 * Compares two built sites. The workflow decides whether the change is content only (its `Scope` job) and builds the base.
 * See "Pull requests test only the pages they change" in `docs/accessibility.md`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** The component preview is built under `/components/`; everything else is the landing site. */
const siteOf = (url) => (url.startsWith("/components/") ? "preview" : "landing");

/** @param {string} file a built HTML file, relative to its build folder, with `/` @returns {string} its page URL */
const toUrl = (file) => `/${file.replace(/(^|\/)index\.html$/, "$1")}`;

/**
 * Removes what differs between two builds of the same source: inline source maps, and WebC's random uids
 * (`webc-` and five characters) that the text defines in an `id`, renumbered in order so a changed reference still shows.
 * @param {string} text
 * @returns {string}
 */
export const normalize = (text) => {
	const stripped = text.replace(/\/\*# sourceMappingURL=data:[^*]*\*\//g, "").replace(/\/\/# sourceMappingURL=data:\S*/g, "");
	const defined = new Set();
	for (const [, value] of stripped.matchAll(/\sid\s*=\s*["']?([^"'\s>]+)/gi)) {
		for (const [uid] of value.matchAll(/webc-[\w-]{5}/g)) defined.add(uid);
	}
	const ids = new Map();
	return stripped.replace(/webc-[\w-]{5}/g, (uid) => {
		if (!defined.has(uid)) return uid;
		if (!ids.has(uid)) ids.set(uid, `webc-${ids.size}`);
		return ids.get(uid);
	});
};

/** @param {string} dir @returns {string[]} every built file, relative to the folder, with `/` */
const files = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/"));

/** @param {string} dir @param {string} file @returns {string | undefined} text without what differs between builds, other files byte for byte, or `undefined` if missing */
const content = (dir, file) => {
	if (!existsSync(join(dir, file))) return undefined;
	const data = readFileSync(join(dir, file));
	return /\.(html|css|m?js|svg|json|txt|xml)$/.test(file) ? normalize(data.toString("utf8")) : data.toString("latin1");
};

/**
 * The pages that differ between two builds. A changed HTML file affects its page. A file of any other kind that is
 * changed, added or removed (a stylesheet, script, image or font) affects every page of its site: the landing site, or
 * the component preview under `/components/`.
 * @param {{ headDir: string, baseDir: string, pages: string[] }} options `pages` are site paths, such as "/components/"
 * @returns {string[]} the affected pages, in the order given
 */
export function affectedPages({ headDir, baseDir, pages }) {
	const changed = [...new Set([...files(headDir), ...files(baseDir)])].filter((file) => content(headDir, file) !== content(baseDir, file));
	const urls = new Set(changed.filter((file) => file.endsWith(".html")).map(toUrl));
	const sites = new Set(changed.filter((file) => !file.endsWith(".html")).map((file) => siteOf(`/${file}`)));
	return pages.filter((url) => urls.has(url) || sites.has(siteOf(url)));
}

/** @param {string} dir a build directory @returns {string[]} every built page as a site path, sorted */
export const listPages = (dir) => files(dir).filter((file) => file.endsWith(".html")).map(toUrl).sort();

/**
 * Picks the pages to test: every page, or on a pull request only the affected ones.
 * @param {{ headDir: string, env: Record<string, string | undefined> }} options
 * The workflow sets, on a pull request, `env.AUDIT_BASE_DIR` (the base's audit site, built only for a content-only change)
 * and `env.AUDIT_OUTSIDE_COUNT` (how many changed files are outside the content paths; only "0" allows a comparison).
 * `env.AUDIT_ALL_PAGES` forces every page.
 * @returns {{ pages: string[], total: number, reason: string }} `reason` is the log line's explanation
 */
export function selectPages({ headDir, env }) {
	const all = listPages(headDir);
	const every = (why) => ({ pages: all, total: all.length, reason: `every page (${all.length}): ${why}` });
	if (env.AUDIT_ALL_PAGES && env.AUDIT_ALL_PAGES !== "0") return every("AUDIT_ALL_PAGES is set");
	if (!env.AUDIT_BASE_DIR) return every("not compared with a base build (not a pull request)");
	const outside = env.AUDIT_OUTSIDE_COUNT;
	if (outside !== "0") return every(outside ? `${outside} changed file${outside === "1" ? " is" : "s are"} outside the content paths` : "the changed files were not checked");
	if (!existsSync(env.AUDIT_BASE_DIR)) return every("the base build is missing");
	try {
		const pages = affectedPages({ headDir, baseDir: env.AUDIT_BASE_DIR, pages: all });
		return { pages, total: all.length, reason: `${pages.length} affected page${pages.length === 1 ? "" : "s"} of ${all.length}` };
	} catch (error) {
		return every(`the comparison failed (${error.message})`);
	}
}
