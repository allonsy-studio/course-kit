// Site facts for the layouts, read from package.json & project.json when Eleventy runs.

import path from "node:path";

import { accentHex, buildSite, npmRelease } from "@allons-y/webc-patterns/project";
import { host } from "@allons-y/webc-oss-site";

export default async () => {
	const site = buildSite({
		packagePath: path.resolve(import.meta.dirname, "../../package.json"),
		projectPath: path.join(import.meta.dirname, "project.json"),
		host,
	});
	// The footer shows npm badges once the package has a release. Until then there is nothing at the npm link to open, so it is left out.
	const release = await npmRelease(site.packageName);
	return {
		...site,
		npm: release ? site.npm : null,
		npmRelease: release,
		badgeColor: accentHex(path.join(import.meta.dirname, "../content/assets/styles/project.css")),
	};
};
