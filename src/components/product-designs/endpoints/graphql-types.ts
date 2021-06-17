import {
  GraphQLType,
  schemaToGraphQLType,
} from "../../../apollo/published-types";
import { baseProductDesignSchema, BaseProductDesign } from "../types";
import { CollectionDb } from "../../collections/types";
import {
  CanvasWithEnrichedComponents,
  canvasWithEnrichedComponentsSchema,
  componentWithAssetLinksSchema,
} from "../../canvases/types";

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
