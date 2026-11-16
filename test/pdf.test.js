import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { PDF_MARGIN } from "../lib/pdf.js";
import { packageRoot } from "../lib/paths.js";
import { checkPdf } from "../scripts/check-pdf.js";

const printCss = fs.readFileSync(path.join(packageRoot, "assets", "styles", "print.css"), "utf8");

test("print.css's @page margins are the PDF's margins, so the page footer sits in the margin and never over the text", () => {
	const margin = /@page\s*\{[^}]*margin:\s*([^;]+);/.exec(printCss)?.[1].trim();
	assert.equal(margin, `${PDF_MARGIN.top} ${PDF_MARGIN.right} ${PDF_MARGIN.bottom}`, "top, sides, bottom (the left matches the right)");
	assert.equal(PDF_MARGIN.left, PDF_MARGIN.right);
});

test("print lifts the reading measure and prints headings in the hosted text face", () => {
	const root = /:root\s*\{([^}]*)\}/.exec(printCss.slice(printCss.indexOf("@media print")))?.[1] ?? "";
	assert.match(root, /--measure:\s*none;/, "the 68ch cap would narrow every paragraph on paper");
	assert.match(root, /--display-font:\s*var\(--sans-font\);/, "the display serif stack is not hosted, so its fallback differs by machine");
});

const hasTool = (command, args) => {
	try {
		execFileSync(command, args, { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
};

test("the starter's syllabus PDF has no text over the footer and stays within its page bound", async (t) => {
	let puppeteer;
	try {
		({ default: puppeteer } = await import("puppeteer"));
	} catch {
		return t.skip("puppeteer is not installed");
	}
	if (!hasTool("pdftotext", ["-v"])) return t.skip("pdftotext (poppler) is not installed");
	const { default: Eleventy } = await import("@11ty/eleventy");
	const cwd = process.cwd();
	process.chdir(path.join(packageRoot, "examples", "starter"));
	try {
		process.env.BUILD_PDF = "1";
		const eleventy = new Eleventy("content", "public", { configPath: "eleventy.config.js", quietMode: true });
		await eleventy.write();
		const { pages, problems } = checkPdf(path.join("public", "resources", "syllabus.pdf"), { maxPages: 3 });
		assert.deepEqual(problems, []);
		assert.ok(pages >= 1);
	} finally {
		delete process.env.BUILD_PDF;
		process.chdir(cwd);
	}
	void puppeteer;
});
