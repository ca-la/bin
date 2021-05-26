import { schemaToGraphQLType, GraphQLType } from "../../apollo/published-types";
import { collectionDbSchema } from "./types";

export const gtCollection: GraphQLType = schemaToGraphQLType(
  "Collection",
  collectionDbSchema
);
