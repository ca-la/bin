import { schemaToGraphQLType, GraphQLType } from "../../apollo/published-types";
import { collectionDbSchema, designMetaSchema } from "./types";

export const gtCollectionDesignsMeta = schemaToGraphQLType(
  "CollectionDesignsMeta",
  designMetaSchema,
  {
    bodyPatch: {
      previewImageUrls: "[String]",
      createdAt: "GraphQLDateTime",
    },
  }
);

export const gtCollection: GraphQLType = schemaToGraphQLType(
  "Collection",
  collectionDbSchema,
  {
    depTypes: {
      designs: gtCollectionDesignsMeta,
    },
  }
);

export const gtCollectionFilter: GraphQLType = {
  type: "input",
  name: "CollectionFilter",
  body: {
    userId: "String!",
  },
};

export interface CollectionFilter {
  userId: string;
}
