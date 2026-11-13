export default { title: "Building blocks/meeting-decks" };

export const Default = { args: { meeting: { slides: "/slides/week-1-day-1/", addendum: "/slides/week-1-day-1-addendum/" }, slidesLabel: "Slides", addendumLabel: "Addendum" } };

/** A meeting with only its slides. */
export const SlidesOnly = { name: "Slides only", args: { meeting: { slides: "/slides/week-1-day-1/" }, slidesLabel: "Slides", addendumLabel: "Addendum" } };

/** A meeting with only an addendum. */
export const AddendumOnly = { name: "Addendum only", args: { meeting: { addendum: "/slides/week-1-day-1-addendum/" }, slidesLabel: "Slides", addendumLabel: "Addendum" } };
