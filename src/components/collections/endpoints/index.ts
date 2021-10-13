import { findEndpoint } from "./find-endpoint";
import { createEndpoint } from "./create-endpoint";
import { CollectionAndEnvironmentEndpoint } from "./collection-and-environment";
import { DesignsEndpoint } from "./designs";

export const CollectionEndpoints = [
  findEndpoint,
  createEndpoint,
  CollectionAndEnvironmentEndpoint,
  DesignsEndpoint,
];
