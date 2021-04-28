import { GraphQLType, schemaToGraphQLType } from "../../apollo";
import { collectionDbSchema } from "./types";

export const gtCollection: GraphQLType = schemaToGraphQLType(
  "Collection",
  collectionDbSchema
);
