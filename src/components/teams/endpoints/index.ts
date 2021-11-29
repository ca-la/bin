import { FindTeamsEndpoint } from "./find-teams";
import { TeamAndEnvironmentEndpoint } from "./team-and-environment";
import { TeamEndpoint } from "./team";
import { CollectionsEndpoint } from "./collections";
import { SubscriptionsEndpoint } from "./subscriptions";
import { CreateEndpoint } from "./create";
import { DeleteEndpoint } from "./delete";

export * from "./graphql-types";

export const TeamEndpoints = [
  FindTeamsEndpoint,
  TeamAndEnvironmentEndpoint,
  TeamEndpoint,
  CollectionsEndpoint,
  SubscriptionsEndpoint,
  CreateEndpoint,
  DeleteEndpoint,
];
