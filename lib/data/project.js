/**
 * The project's dated milestones, whichever way the course authors them: a
 * `components` list (name, date) or rubric criteria that carry a `due` date.
 * @param {object} [project] `_data/project.json`
 * @returns {{ title: string, label: string, due: string, dueTime?: string }[]}
 */
export function projectMilestones(project) {
	if (project?.components?.length) {
		return project.components.map((component) => ({
			title: `${project.title}: ${component.name}`,
			label: component.name,
			due: component.date,
			dueTime: component.dueTime,
		}));
	}
	return (project?.rubric?.criteria ?? [])
		.filter((criterion) => criterion.due)
		.map((criterion) => {
			const title = criterion.id ? `${criterion.id} · ${criterion.title}` : criterion.title;
			return { title, label: title, due: criterion.due, dueTime: criterion.dueTime };
		});
}
