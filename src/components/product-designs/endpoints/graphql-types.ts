import { z } from "zod";
import {
  GraphQLType,
  schemaToGraphQLType,
} from "../../../apollo/published-types";
import {
  baseProductDesignSchema,
  BaseProductDesign,
  productDesignSchema,
} from "../types";
import { CollectionDb } from "../../collections/types";
import {
  CanvasWithEnrichedComponents,
  canvasWithEnrichedComponentsSchema,
  componentWithAssetLinksSchema,
} from "../../canvases/types";
import { uploadPolicySchema } from "../../../services/upload-policy/types";
import { gtApprovalStep } from "../../approval-steps/graphql-types";

export interface DesignAndEnvironmentParent {
  designId: string;
}

export const gtBaseProductDesign: GraphQLType = schemaToGraphQLType(
  "BaseProductDesign",
  baseProductDesignSchema,
  {
    bodyPatch: {
      previewImageUrls: "[String]",
    },
  }
);

export const gtComponentWithAssetLinks = schemaToGraphQLType(
  "ComponentWithAssetLinks",
  componentWithAssetLinksSchema
);

export const gtCanvasWithEnrichedComponents = schemaToGraphQLType(
  "CanvasWithEnrichedComponents",
  canvasWithEnrichedComponentsSchema,
  {
    depTypes: {
      components: gtComponentWithAssetLinks,
    },
  }
);

export const gtDesignAndEnvironment: GraphQLType = {
  name: "DesignAndEnvironment",
  type: "type",
  body: {
    designId: "String!",
    design: "BaseProductDesign",
    collection: "CollectionDb",
    canvases: "[CanvasWithEnrichedComponents]",
  },
  requires: [
    "BaseProductDesign",
    "CollectionDb",
    "CanvasWithEnrichedComponents",
  ],
};

export interface DesignAndEnvironment extends DesignAndEnvironmentParent {
  productDesign: BaseProductDesign;
  collection: CollectionDb;
  canvases: CanvasWithEnrichedComponents[];
}

export const gtCollectionMeta = schemaToGraphQLType(
  "CollectionMeta",
  z.object({ id: z.string(), title: z.string().nullable() })
);

export const gtProductDesign: GraphQLType = schemaToGraphQLType(
  "ProductDesign",
  productDesignSchema,
  {
    depTypes: {
      collections: gtCollectionMeta,
      approvalSteps: gtApprovalStep,
    },
    bodyPatch: {
      previewImageUrls: "[String]!",
      imageLinks: "[String]!",
      collectionIds: "[String]",
    },
  }
);

export const gtDesignFilter: GraphQLType = {
  name: "DesignFilter",
  type: "input",
  body: {
    type: "String!",
    value: "String",
  },
};

const designInputSchema = productDesignSchema
  .pick({
    id: true,
    title: true,
  })
  .extend({
    collectionId: z.string().nullable(),
  });

export const gtDesignInput: GraphQLType = schemaToGraphQLType(
  "DesignInput",
  designInputSchema,
  {
    type: "input",
  }
);

export type DesignInput = z.infer<typeof designInputSchema>;

// Since we can't specify the arbitrary `formData` payload that AWS returns via
// the GraphQL type system, we serialize it to a JSON string.
export const graphqlSafeUploadPolicySchema = uploadPolicySchema
  .omit({ formData: true })
  .extend({
    formDataPayload: z.string(),
  });

export type GraphqlSafeUploadPolicy = z.infer<
  typeof graphqlSafeUploadPolicySchema
>;

export const gtUploadPolicy = schemaToGraphQLType(
  "UploadPolicy",
  graphqlSafeUploadPolicySchema
);
