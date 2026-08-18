# Releasing the packages

The public packages are:

- `@namche/metaball` — core geometry, currently `1.0.0`;
- `@namche/metaball-react` — React/Three.js viewer, currently `0.1.0`.

The renderer depends on the core package, so core is always published first.

## One-time npm setup

Both package names were unclaimed on npm when this workflow was added. npm can
only configure a trusted publisher after a package exists, so each name needs
one bootstrap publish by a NAMCHE npm owner:

1. Add a short-lived granular token as the repository secret
   `NPM_BOOTSTRAP_TOKEN`.
2. Run `.github/workflows/release-packages.yml` once.
3. Configure that exact workflow as trusted publisher for both packages on npm.
4. Delete `NPM_BOOTSTRAP_TOKEN`; all later publishes use GitHub OIDC.

The workflow uses Node 24 and the latest npm CLI because npm trusted publishing
requires Node 22.14+ and npm 11.5.1+. Do not keep a long-lived publish token.

The repository currently marks the code `UNLICENSED`. Confirm the intended
software license with NAMCHE before the first public registry release; do not
silently substitute the font repository's OFL, which applies to fonts only.

## Release flow

1. Update package versions and changelog/release notes in a pull request.
2. Run `npm run release:dry-run` and inspect both file manifests.
3. Merge only after normal CI and review pass.
4. In GitHub Actions, run **Release packages** and choose the npm dist-tag.
5. The workflow builds/tests everything and publishes only package versions
   that do not already exist. It publishes core before renderer.
6. Verify with `npm view @namche/metaball version` and
   `npm view @namche/metaball-react version`, then install in a clean example.

Do not run `npm publish` from a developer laptop unless recovering from a
documented trusted-publishing outage.
