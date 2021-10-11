import { z } from "zod";
import {
  schemaToGraphQLType,
  GraphQLType,
} from "../../../apollo/published-types";
import { collectionDbSchema, designMetaSchema } from "../types";

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

const collectionInputSchema = collectionDbSchema
  .pick({
    id: true,
    title: true,
  })
  .extend({
    teamId: z.string(),
  });

export const gtCollectionInput: GraphQLType = schemaToGraphQLType(
  "CollectionInput",
  collectionInputSchema,
  {
    type: "input",
  }
);

export type CollectionInput = z.infer<typeof collectionInputSchema>;

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
