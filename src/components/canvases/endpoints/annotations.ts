import { GraphQLContextBase, GraphQLEndpoint } from "../../../apollo";
import {
  CanvasAndEnvironmentParent,
  gtProductDesignCanvasAnnotation,
} from "./graphql-types";
import { ProductDesignCanvasAnnotation } from "../../product-design-canvas-annotations/types";
import * as AnnotationsDAO from "../../product-design-canvas-annotations/dao";

export const AnnotationsEndpoint: GraphQLEndpoint<
  {},
  ProductDesignCanvasAnnotation[],
  GraphQLContextBase<ProductDesignCanvasAnnotation[]>,
  CanvasAndEnvironmentParent
> = {
  endpointType: "CanvasAndEnvironment",
  types: [gtProductDesignCanvasAnnotation],
  name: "annotations",
  resolver: async (
    parent: CanvasAndEnvironmentParent,
    _args: {},
    context: GraphQLContextBase<ProductDesignCanvasAnnotation[]>
  ) => {
    const { trx } = context;
    const { canvasId } = parent;

    return AnnotationsDAO.findAllWithCommentsByCanvasId(trx, canvasId);
  },
};
