export default { title: "Site sections/masthead" };

/** Reads the course's data files, so it needs no props. The menu is in two columns when it has more than 3 links. */
export const Default = {};

/** `"navColumns": 1` in `course.json`, or `nav-columns="1"` on the tag: a single stack however many links there are. */
export const OneColumnMenu = { args: { navColumns: 1 } };

/** `"navColumns": 2`, or `nav-columns="2"`: two columns however few links there are. */
export const TwoColumnMenu = { args: { navColumns: 2 } };

/** With `booking` in `instructor.json` the header carries the link on every page, and the menu leaves Contact to the footer. */
export const BookingLink = {
	name: "With a booking link",
	data: { instructor: { name: "Dr. Sam Example", office: "Science Hall 210", contact: "/contact/", booking: { url: "https://calendar.example.edu/appointments/sam" } } },
};
