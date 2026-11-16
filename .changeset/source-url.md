---
"@allons-y/course-kit": patch
---

✨ Add the `institution.sourceUrl` option: a web address that, when set, adds an "Open source" link to every page's footer (the `nav.openSource` copy key). It is off by default, so nothing changes until a course sets it.

migration: None. A course that added its own footer link to a repository sets `institution: { sourceUrl }` and deletes it. See [docs/migrating/0.3.0.md](https://github.com/allonsy-studio/course-kit/blob/main/docs/migrating/0.3.0.md).
