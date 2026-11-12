export default { title: "Building blocks/meeting-card" };

export const Default = {
	wrap: "<h2>Schedule</h2>\n<h3>Week 1</h3>\n<ul role=\"list\">{story}</ul>",
	args: {
		meeting: { iso: "2026-09-01", weekday: "Tuesday", date: "Sep 1" },
		when: "<span>Room 210</span>",
		default: "<div><h4>How the web works</h4><p>Requests, responses and the browser.</p></div>",
	},
};
