# published-types

Any exports from `index.ts` will become available in the `@cala/api-types`
package on npm on every API `main` build run.

## Caveats

- Avoid types which import or transitively depend on 3rd-party modules. The
  typescript compiler will not "bundle" any types from the `node_modules`
  directory, so these will not be exported.
