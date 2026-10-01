import { execFileSync } from "node:child_process";

/** The person part of an npm `author` string: "Name <email> (url)" is "Name". */
const authorName = (author) =>
	typeof author === "string" ? author.replace(/\s*[<(].*$/, "").trim() : (author?.name ?? "");

const strip = (url) => (url || "").replace(/\/+$/, "");

/**
 * The GitHub Pages address for an `owner/repo` slug. A repo named for its
 * owner is served from the bare domain.
 * @param {string} slug
 * @returns {string} no trailing slash, or "" if the slug is not a pair
 */
const pagesUrl = (slug) => {
	const [owner, repo] = (slug || "").split("/");
	if (!owner || !repo) return "";
	const domain = `${owner.toLowerCase()}.github.io`;
	return repo.toLowerCase() === domain ? `https://${domain}` : `https://${domain}/${repo}`;
};

/** `owner/repo` from the origin remote, for a build with no CI variables. */
const originSlug = () => {
	try {
		const remote = execFileSync("git", ["remote", "get-url", "origin"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		return remote.trim().replace(/\.git$/, "").split(/[:/]/).slice(-2).join("/");
	} catch {
		return "";
	}
};

/**
 * Site-wide metadata, the global `site`. URL resolution reads the CONTEXT, URL
 * and DEPLOY_PRIME_URL variables; see the README.
 * @param {{ course: object, pkg?: object, institution?: { name?: string }, site?: { description?: string, keywords?: string, language?: string }, env?: NodeJS.ProcessEnv }} data
 * @returns {object}
 */
export function resolveSite({ course, pkg = {}, institution = {}, site = {}, env = process.env }) {
	const isProd = env.CONTEXT === "production";
	const prodUrl = strip(env.URL);
	const previewUrl = strip(env.DEPLOY_PRIME_URL);
	// No trailing slash: consumers append page.url, which starts with "/".
	const url = isProd || !previewUrl ? prodUrl : previewUrl;

	// The public address, for pages that travel and have to link back. Derived so a
	// rename carries: the deploy's URL, then the CI repo slug, then the origin remote.
	const hostname = prodUrl || pagesUrl(env.GITHUB_REPOSITORY) || pagesUrl(originSlug());

	const name = institution.name ?? "";
	return {
		title: `${course.code}: ${course.name}`,
		buildYear: new Date().getFullYear(),
		description: site.description ?? (name ? `Course content for ${name}.` : ""),
		language: site.language ?? "en-US",
		author: authorName(pkg.author),
		institution: name,
		keywords: site.keywords ?? [name, course.code, course.name, "syllabus", "course schedule", "class resources"].filter(Boolean).join(", "),
		url,
		hostname,
		preview: !isProd,
		sitemap: "sitemap.xml",
		robots: "robots.txt",
		blocked: ["/.git", "/.env", "/xmlrpc.php", "/phpmyadmin", "/wp-admin", "/wp-login.php", "/wp-includes", "/wp-content"],
	};
}
