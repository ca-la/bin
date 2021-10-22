import { z } from "zod";
import {
  schemaToGraphQLType,
  GraphQLType,
} from "../../../apollo/published-types";
import {
  Collection,
  collectionDbSchema,
  collectionSchema,
  designMetaSchema,
} from "../types";
import { gtPermissions } from "../../permissions/graphql-types";

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

export const gtCollectionDb: GraphQLType = schemaToGraphQLType(
  "CollectionDb",
  collectionDbSchema,
  {
    depTypes: {
      designs: gtCollectionDesignsMeta,
    },
  }
);

export const gtCollection: GraphQLType = schemaToGraphQLType(
  "Collection",
  collectionSchema,
  {
    depTypes: {
      designs: gtCollectionDesignsMeta,
      permissions: gtPermissions,
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

export interface CollectionAndEnvironmentParent {
  collectionId: string;
  collection: Collection;
}

export const gtCollectionAndEnvironment: GraphQLType = {
  name: "CollectionAndEnvironment",
  type: "type",
  body: {
    collectionId: "String!",
    collection: "Collection",
    designs: {
      signature: "(limit: Int, offset: Int)",
      type: "[ProductDesign]",
    },
  },
  requires: ["ProductDesign", "Collection"],
};
