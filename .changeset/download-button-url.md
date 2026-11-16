---
"@allons-y/course-kit": patch
---

🐛 Make `<download-button>` read only a string as its `url`, so a page that does not give one can no longer print Eleventy's `url` filter as the link, and show no link at all when there is no file.

migration: None. Call it as `<download-button :@url="$data.demo.download">`; see docs/components-reference.md.
