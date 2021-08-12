import { GraphQLContextBase, GraphQLEndpoint } from "../../../apollo";
import {
  CanvasAndEnvironmentParent,
  gtProductDesignCanvasMeasurement,
} from "./graphql-types";
import { ProductDesignCanvasMeasurement } from "../../product-design-canvas-measurements/types";
import * as MeasurementsDAO from "../../product-design-canvas-measurements/dao";

export const MeasurementsEndpoint: GraphQLEndpoint<
  {},
  ProductDesignCanvasMeasurement[],
  GraphQLContextBase<ProductDesignCanvasMeasurement[]>,
  CanvasAndEnvironmentParent
> = {
  endpointType: "CanvasAndEnvironment",
  types: [gtProductDesignCanvasMeasurement],
  name: "measurements",
  resolver: async (parent: CanvasAndEnvironmentParent) => {
    const { canvasId } = parent;
    return MeasurementsDAO.findAllByCanvasId(canvasId);
  },
};
