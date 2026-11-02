import courseKit from "@allons-y/course-kit";

/** @param {import('@11ty/eleventy').UserConfig} config */
export default async function (config) {
	courseKit(config, {
		institution: { name: "Example College", timezone: "America/New_York" },
	});
}
