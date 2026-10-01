/**
 * Marks today's class meeting on the slide and demo indexes.
 *
 * Elements carry `data-date` (space-separated ISO dates). Any element listing
 * today's campus date gets `data-today`, `aria-current="date"`, and a visible
 * "Today" flag (or the element's `data-today-label`), so the marker never
 * relies on color alone.
 */
const CAMPUS_TZ = "America/New_York";

/** @returns {string} today's date on campus, as `YYYY-MM-DD` */
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: CAMPUS_TZ });

const date = today();

for (const element of document.querySelectorAll("[data-date]")) {
	if (!element.dataset.date.split(/\s+/).includes(date)) continue;

	element.dataset.today = "";
	element.setAttribute("aria-current", "date");

	const flag = document.createElement("strong");
	flag.className = "today-flag";
	flag.textContent = element.dataset.todayLabel ?? "Today";

	// A table row can't hold the flag directly; put it in the row's first cell.
	(element instanceof HTMLTableRowElement ? element.cells[0] : element).prepend(flag);
}
