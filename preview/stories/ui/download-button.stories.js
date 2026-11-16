export default { title: "Building blocks/download-button" };

export const Default = { args: { url: "/resources/starter.zip", default: "Download the starter files" } };

/** A long label wraps beside the icon; the icon keeps its size. */
export const LongLabel = { name: "Long label", args: { url: "#", default: "Download the complete course packet, with every slide deck, worksheet and starter file" } };

/** The call a page makes with data (`:@url`): the file is `$data.course.code` here, standing in for a demo's download path. */
export const PageStyleCall = {
	name: "Called with page data",
	wrap: "<download-button :@url=\"$data.course.code\" @text=\"$data.copy.demo?.download ?? 'Download the file'\"></download-button>\n{story}",
	args: { url: "/resources/starter.zip", default: "Download the starter files" },
};
