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
import { baseApprovalStepSchema } from "../../approval-steps/types";

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
    collection: "Collection",
    canvases: "[CanvasWithEnrichedComponents]",
  },
  requires: ["BaseProductDesign", "Collection", "CanvasWithEnrichedComponents"],
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

export const gtApprovalStep = schemaToGraphQLType(
  "ApprovalStep",
  baseApprovalStepSchema
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
