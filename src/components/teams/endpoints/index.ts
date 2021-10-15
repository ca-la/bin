import { FindTeamsEndpoint } from "./find-teams";
import { TeamAndEnvironmentEndpoint } from "./team-and-environment";
import { TeamEndpoint } from "./team";
import { CollectionsEndpoint } from "./collections";
import { CreateEndpoint } from "./create";

export * from "./graphql-types";

export const TeamEndpoints = [
  FindTeamsEndpoint,
  TeamAndEnvironmentEndpoint,
  TeamEndpoint,
  CollectionsEndpoint,
  CreateEndpoint,
];
