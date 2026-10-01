import { readFileSync } from "node:fs";

import { assetPath } from "../assets.js";

/**
 * `font.css` with every self-hosted face embedded as a data URI.
 * @param {string} [inputDir]
 * @returns {string}
 */
export function inlineFontFaces(inputDir = "content") {
	const css = readFileSync(assetPath("styles/font.css", inputDir), "utf8");
	return css.replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (_, file) => {
		const data = readFileSync(assetPath(`fonts/${file}`, inputDir)).toString("base64");
		return `url("data:font/woff2;base64,${data}")`;
	});
}
