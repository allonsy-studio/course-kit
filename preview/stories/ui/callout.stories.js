export default {
	title: "Building blocks/callout",
	argTypes: { type: { options: ["success", "warn", "error"] } },
};

export const Default = { args: { default: "<p><strong>Bring a laptop.</strong> We build something in every class.</p>" } };

/** A long callout with a list wraps inside its edge. */
export const Long = {
	args: {
		type: "warn",
		default: "<p><strong>Read this before the test.</strong> The test covers every slide from the first four weeks, including the ones marked optional, and the practice sheets are the best preview of how the questions are worded.</p><ul><li>Bring a pencil.</li><li>Arrive five minutes early, because the doors close when the test starts.</li></ul>",
	},
};
