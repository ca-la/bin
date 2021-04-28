import { GraphQLType, schemaToGraphQLType } from "../../../apollo";
import { baseProductDesignSchema, BaseProductDesign } from "../types";
import { CollectionDb } from "../../collections/types";

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

export const gtDesignAndEnvironment: GraphQLType = {
  name: "DesignAndEnvironment",
  type: "type",
  body: {
    designId: "String!",
    design: "BaseProductDesign!",
    collection: "Collection",
  },
  requires: ["BaseProductDesign", "Collection"],
};

export interface DesignAndEnvironment extends DesignAndEnvironmentParent {
  productDesign: BaseProductDesign;
  collection: CollectionDb;
}
