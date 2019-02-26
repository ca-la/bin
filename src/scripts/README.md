# scripts/

One-off scripts and tools that do not need run on a regular/automated basis, but
were run in production at some point. Some of these may be useful in future.

Scripts that will only be run one time belong in `one-off/`. These are
still source controlled so that we have a history of stuff we've run in the
past, and to provide a reference point for future similar work.

## TypeScript

Since these scripts are meant to be run once, they could get out of date with
modules that they import. Therefore, instead of compiling them in the normal
flow, we exclude them and run them manually.

```bash
npm run script -- src/scripts/one-off/2020-05-01-may-day.ts
```
