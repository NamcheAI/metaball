# Contributing

For the practical Cursor workflow and ownership map, start with
[`AGENTS.md`](AGENTS.md). Architecture details live in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Use a focused branch, keep unrelated generated files out of commits, and run:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

If core geometry changes, also run `npm run bake` and review the committed mark
assets. Public renderer API changes require a README example and a version
change. Persisted Studio document changes require migration tests.

Design changes should use the current sibling `design` repository tokens rather
than copying deprecated palette values. Preserve the project credits when code
is reorganized.
