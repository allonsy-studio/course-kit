# Releasing

How a change reaches npm. Releases use [changesets](https://github.com/changesets/changesets) through `opx release`, and publish from GitHub Actions with npm trusted publishing: no token, and every version carries a provenance attestation.

## Versioning

The kit is `0.x` until the two course sites run on it. Then it becomes `1.0.0`.

| While `0.x` | Bump |
| --- | --- |
| A breaking change: a removed or renamed component, prop, class, data key, copy key or token, or a changed default that alters output | **minor** (`0.1.0` → `0.2.0`) |
| Anything else: a fix, an addition, a doc or contrast change | **patch** (`0.1.0` → `0.1.1`) |

After `1.0.0` the usual rules apply: breaking is major, an addition is minor, a fix is patch.

There is no prerelease tag. `0.1.0-alpha.0` was the last alpha.

## What needs a changeset

Anything that changes what a course gets: files under `lib/`, `layouts/`, `components/`, `assets/`, `glue/`, `schemas/` and `examples/starter/`, and the package's exports. Changes to `website/`, `preview/`, `docs/`, `test/` and `.github/` need none. The changeset bot comments "No Changeset found" on those; that is fine.

## Shipping a change

1. Run `yarn changeset`. Pick the bump from the table above and write the summary.
2. Commit the new file in `.changeset/` with the change.
3. Merge the pull request. A bot keeps one pull request open, "chore(release): version packages", that collects every pending changeset, bumps `package.json` and writes `CHANGELOG.md`.
4. Merge that pull request when you want to release. The workflow publishes to npm, tags `vX.Y.Z` and creates the GitHub release.

### Writing a changeset

The first line is the changelog entry. Write it as a sentence a course author can act on.

```md
---
"@allons-y/course-kit": minor
---

✨ Rename the `run` option to `exec`.

migration: Replace `run` with `exec` in your config.
```

- For a breaking change, end with a `migration:` line. It becomes a "To upgrade" paragraph under the entry.
- When the migration needs more than a line, write a guide in `docs/migrating/<version>.md` and link it from the `migration:` line. [`docs/migrating/0.1.0.md`](migrating/0.1.0.md) is the model. The generated changelog never overwrites these files.
- `pr:`, `commit:` and `author:` lines override the lookup that finds the pull request and the thanks.

## One-time setup

npm can add a trusted publisher only to a package that already exists, so the first version is published by hand. Do these once, in order.

| # | When | Where | What |
| --- | --- | --- | --- |
| 1 | Before anything | npmjs.com | Check that the `@allons-y` scope exists and you can publish to it. |
| 2 | Before the first release pull request is merged | GitHub: Settings, Actions, General | Turn on "Allow GitHub Actions to create and approve pull requests". |
| 3 | After this pull request is on `main` | Terminal, on a clean `main` | `npm login`, then `npm publish --tag alpha --access public --provenance=false`. This publishes `0.1.0-alpha.0` so the package exists. Provenance needs CI, so it is off here. |
| 4 | Right after step 3 | npmjs.com: `@allons-y/course-kit`, Settings, Trusted publisher | Choose GitHub Actions. Organization `allonsy-studio`, repository `course-kit`, workflow `release.yml`, environment blank. |
| 5 | When the bot opens "chore(release): version packages" | GitHub | Merge it. CI publishes `0.1.0` with provenance. |

Do not add an `NPM_TOKEN` secret.

A release published from CI carries a provenance attestation, which npm shows on the package page. `0.1.0` was published by hand, so it has none, and npm cannot add one to a published version.

If the publish step fails, run the workflow again: each step skips what is already done.

## Depending on the kit

A course site pins the **exact** version and updates it on purpose.

```json
{
  "dependencies": {
    "@allons-y/course-kit": "0.2.0"
  }
}
```

- No `~` and no `^`. A course re-uploads what the kit builds (its slide decks, the syllabus PDF) when the version string in its `package.json` changes, so that string has to change only when the course decides to take a release. A range lets a lockfile refresh move the kit under it.
- Commit the lockfile as well. A course's build should never change because the kit published.
- Let Renovate decide when to bump: it opens one pull request per release, and the course merges it after reading the changelog entry and its migration guide. In `0.x` a minor is breaking; a patch is a fix or an addition.
- After `1.0.0` the same rule holds: pin the exact version; the bump type says how careful the review should be.

### Which files change a deck

A release changes a built slide deck only when it changes one of these, so a course that wants to re-upload decks only then can compare them between two versions (`git diff v0.2.0 v0.2.1 -- <paths>` in the kit, or the same paths under `node_modules/@allons-y/course-kit` after the bump):

| Path | What it does to a deck |
|---|---|
| `layouts/deck.webc` | The deck page: its controls, head and scripts. |
| `assets/styles/deck.css` | Every deck's look and print styles. |
| `assets/scripts/deck.js`, `assets/scripts/theme-restore.js` | Slide navigation, speaker notes, the theme switcher. |
| `lib/markdown.js` | How a slide's Markdown becomes HTML (code blocks, notes, typography). |
| `lib/theme.js` | The color tokens the decks use. |
| `layouts/notes.webc`, `assets/styles/notes.css`, `glue/deck-notes.*` | The printable speaker-notes sheet. |

A change to any other file under `components/`, `layouts/` or `assets/` leaves the decks as they were, but still changes the site, so the version string is the safe signal.

## Trying a branch before it merges

```sh
opx release version --snapshot canary   # 0.0.0-canary-<timestamp>
opx release publish --tag canary --no-git-tag
```

Run this on a branch or in CI and do not commit the version bump. It never publishes under `latest`.
