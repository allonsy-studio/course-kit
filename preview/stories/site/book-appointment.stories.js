export default { title: "Site sections/book-appointment" };

const person = { name: "Dr. Sam Example", office: "Science Hall 210", hours: ["by appointment"], email: "sam.example@example.edu" };

/** Reads `instructor.booking`, so a page can place the button anywhere, such as a contact page. */
export const Default = { data: { instructor: { ...person, booking: { url: "https://calendar.example.edu/appointments/sam" } } } };

/** `booking.label` replaces "Book an appointment". */
export const Label = { name: "With a label", data: { instructor: { ...person, booking: { url: "https://calendar.example.edu/appointments/sam", label: "Book a time with me" } } } };

/** With no `booking` the tag renders nothing. */
export const NoBooking = { name: "No booking, nothing rendered", data: { instructor: person }, empty: "With no `booking` the tag renders nothing." };
