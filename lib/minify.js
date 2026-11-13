import { transform } from "esbuild";

/** `<script>` types whose body is JavaScript; anything else (JSON data, `py-editor`) is left alone. */
const SCRIPT_TYPES = new Set(["", "module", "text/javascript", "application/javascript"]);

/** The value of an attribute in a tag's attribute text, or undefined. */
const attribute = (attributes, name) => new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|(\\S+))`, "i").exec(attributes)?.slice(1).find((value) => value !== undefined);

/**
 * An Eleventy transform that minifies the inline JavaScript and CSS of every built page with esbuild: each `<script>` with no `src` and a JavaScript type,
 * and each `<style>`. It does nothing else: names are shortened inside a script but no property or string is ever renamed, so a copy key or a
 * `data-*` selector a script looks up by name survives, and a JSON data block, a `<pre>` and every attribute are left as they are.
 * A script or style esbuild cannot parse fails the build and names the page, rather than shipping something broken.
 * The kit does not register this; a course opts in (docs/configuration.md).
 *
 * @param {{ production?: boolean }} [options] `production: false` runs it in every build; by default only when `ELEVENTY_ENV` is `production`
 * @returns {(content: string, outputPath?: string) => Promise<string>}
 */
export function minifyInline({ production = true } = {}) {
	return async function minifyInlineTransform(content, outputPath) {
		if (production && process.env.ELEVENTY_ENV !== "production") return content;
		const page = outputPath ?? this?.page?.outputPath;
		if (typeof page !== "string" || !page.endsWith(".html")) return content;
		const jobs = [];
		const queue = (pattern, kind) => {
			content.replace(pattern, (whole, attributes, body, offset) => {
				if (!body.trim()) return whole;
				if (kind === "js" && (/\ssrc\s*=/i.test(attributes) || !SCRIPT_TYPES.has((attribute(attributes, "type") ?? "").toLowerCase()))) return whole;
				jobs.push({ kind, body, module: (attribute(attributes, "type") ?? "").toLowerCase() === "module", offset: offset + whole.indexOf(">") + 1, length: body.length });
				return whole;
			});
		};
		queue(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, "js");
		queue(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, "css");
		if (!jobs.length) return content;
		const done = await Promise.all(
			jobs.map(async (job) => {
				try {
					// A module's top-level names are its own, so esbuild may shorten them; a classic script's are globals, which it leaves.
					const options = job.kind === "js" ? { loader: "js", format: job.module ? "esm" : undefined } : { loader: "css" };
					const { code } = await transform(job.body, { ...options, minify: true, legalComments: "none" });
					return { ...job, code: code.trim() };
				} catch (error) {
					throw new Error(`minifyInline: could not minify an inline ${job.kind === "js" ? "script" : "style"} in ${page}: ${error.message}`, { cause: error });
				}
			}),
		);
		// Splice from the end, so earlier offsets stay true.
		let result = content;
		for (const job of done.sort((a, b) => b.offset - a.offset)) result = result.slice(0, job.offset) + job.code + result.slice(job.offset + job.length);
		return result;
	};
}
