export default {
	title: "Site sections/instructor",
	argTypes: { contactLinks: { control: "text" } },
};

const person = { name: "Dr. Sam Example", office: "Science Hall 210", hours: ["Tuesday and Thursday 1:00PM–2:30PM", "or by appointment"], email: "sam.example@example.edu" };
const photo = "/images/instructor-sample.svg";
const note = "I reply within one school day.";
const blog = "https://sam.example.edu/blog/";
const contact = "/contact/";

/** Reads the course's data files, so it needs no props. The email, the message link and the blog are rows in the facts. */
export const Default = {};

export const Card = { args: { variant: "card" } };

/** The same panel with a photo, a note and every contact method, as rows. */
export const AllRows = { name: "All contact methods, photo", data: { instructor: { ...person, photo, note, contact, blog } } };

/** `contactLinks: "icons"`: the email as an icon link at the top right of the panel. The starter's own instructor, no photo. */
export const IconLinks = { name: "Icon links, email only", args: { contactLinks: "icons" } };

export const IconLinksPhoto = { name: "Icon links, with photo", args: { contactLinks: "icons" }, data: { instructor: { ...person, photo, note } } };

export const IconLinksAll = {
	name: "Icon links, every method and a photo",
	note: "The message link is the address's stand-in on screen; print shows the address and the host, with no photo or icons.",
	args: { contactLinks: "icons" },
	data: { instructor: { ...person, photo, note, contact, blog } },
};

export const IconLinksAllNoPhoto = { name: "Icon links, every method, no photo", args: { contactLinks: "icons" }, data: { instructor: { ...person, note, contact, blog } } };

export const IconLinksMessage = { name: "Icon links, message only", args: { contactLinks: "icons" }, data: { instructor: { ...person, email: undefined, contact } } };

export const IconLinksBlog = { name: "Icon links, blog only", args: { contactLinks: "icons" }, data: { instructor: { ...person, email: undefined, blog } } };

/** A long address in a narrow column: on screen the icon holds its place, in print the address wraps at its dots. Use the Phone width. */
export const IconLinksLongAddress = {
	name: "Icon links, long address, phone width",
	note: "Pick the Phone (320px) width. The address is in the link's text, which print shows and wraps at its dots.",
	args: { contactLinks: "icons" },
	data: { instructor: { ...person, photo, email: "samantha.the.very.long.example.address@mail.department.example-university.edu", blog: "https://a-very-long-blog-address.department.example-university.edu/posts/" } },
};
