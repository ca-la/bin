import { GraphQLContextBase, GraphQLEndpoint } from "../../../apollo";
import { CanvasAndEnvironmentParent } from "./graphql-types";
import { gtProductDesignCanvasAnnotation } from "../../product-design-canvas-annotations/graphql-types";

import { ProductDesignCanvasAnnotation } from "../../product-design-canvas-annotations/types";
import * as AnnotationsDAO from "../../product-design-canvas-annotations/dao";
import db from "../../../services/db";

export const AnnotationsEndpoint: GraphQLEndpoint<
  {},
  ProductDesignCanvasAnnotation[],
  GraphQLContextBase<ProductDesignCanvasAnnotation[]>,
  CanvasAndEnvironmentParent
> = {
  endpointType: "CanvasAndEnvironment",
  types: [gtProductDesignCanvasAnnotation],
  name: "annotations",
  resolver: async (parent: CanvasAndEnvironmentParent) => {
    const { canvasId } = parent;

    return AnnotationsDAO.findAllWithCommentsByCanvasId(db, canvasId);
  },
};
