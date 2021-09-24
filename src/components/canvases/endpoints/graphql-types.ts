import {
  GraphQLType,
  schemaToGraphQLType,
} from "../../../apollo/published-types";
import { AnnotationDb } from "../../product-design-canvas-annotations/types";
import {
  ProductDesignCanvasMeasurement,
  productDesignCanvasMeasurementSchema,
} from "../../product-design-canvas-measurements/types";

export interface CanvasAndEnvironmentParent {
  canvasId: string;
}

export const gtProductDesignCanvasMeasurement = schemaToGraphQLType(
  "ProductDesignCanvasMeasurement",
  productDesignCanvasMeasurementSchema
);

export const gtCanvasAndEnvironment: GraphQLType = {
  name: "CanvasAndEnvironment",
  type: "type",
  body: {
    canvasId: "String!",
    annotations: "[ProductDesignCanvasAnnotation]",
    measurements: "[ProductDesignCanvasMeasurement]",
  },
  requires: ["ProductDesignCanvasAnnotation", "ProductDesignCanvasMeasurement"],
};

export interface CanvasAndEnvironment extends CanvasAndEnvironmentParent {
  canvasId: string;
  annotations: AnnotationDb[];
  measurements: ProductDesignCanvasMeasurement[];
}
