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

If the publish step fails, run the workflow again: each step skips what is already done.

## Depending on the kit

A course site pins a version and updates it on purpose.

```json
{
  "dependencies": {
    "@allons-y/course-kit": "~0.1.0"
  }
}
```

- In `0.x`, `~0.1.0` takes patches only. A minor is breaking, so a course moves to it by hand, after reading the changelog entry and its migration guide.
- Commit the lockfile. A course's build should never change because the kit published.
- Let Renovate or Dependabot open the update pull request, so a course sees each release.
- Until `0.1.0` is published, install from GitHub, at a tag once there is one: `github:allonsy-studio/course-kit#v0.1.0`. Avoid a branch: it moves.
- After `1.0.0`, `^1.0.0` is the usual range.

## Trying a branch before it merges

```sh
opx release version --snapshot canary   # 0.0.0-canary-<timestamp>
opx release publish --tag canary --no-git-tag
```

Run this on a branch or in CI and do not commit the version bump. It never publishes under `latest`.
