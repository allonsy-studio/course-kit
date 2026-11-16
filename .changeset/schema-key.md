---
"@allons-y/course-kit": patch
---

🐛 Stop exposing `$schema` from data files to templates. A loop over `scale`, `policies` or any other JSON data object no longer yields a `$schema` entry; editors still read the key to validate the file.

migration: None. A page that skips the `$schema` key by hand can drop that check.
