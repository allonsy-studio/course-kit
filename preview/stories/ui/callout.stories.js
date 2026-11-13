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

/** A typed callout opens with its type in words; one story per type. */
export const Success = { args: { type: "success", default: "<p>Your answers are saved in this browser.</p>" } };
export const Warning = { args: { type: "warn", default: "<p>This section's final exam is on a different day.</p>" } };
export const Error = { args: { type: "error", default: "<p>The file could not be read.</p>" } };

/** `label` replaces the opening word. */
export const CustomLabel = { name: "Custom label", args: { type: "warn", label: "Heads up", default: "<p>Bring a laptop.</p>" } };

/** `label=""` shows no word, though the type still colors the callout. */
export const NoLabel = { name: "No label", args: { type: "warn", label: "", default: "<p>Bring a laptop.</p>" } };
