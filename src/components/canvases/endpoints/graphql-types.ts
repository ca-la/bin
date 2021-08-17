import {
  GraphQLType,
  schemaToGraphQLType,
} from "../../../apollo/published-types";
import {
  ProductDesignCanvasAnnotation,
  productDesignCanvasAnnotationSchema,
} from "../../product-design-canvas-annotations/types";
import {
  ProductDesignCanvasMeasurement,
  productDesignCanvasMeasurementSchema,
} from "../../product-design-canvas-measurements/types";

export interface CanvasAndEnvironmentParent {
  canvasId: string;
}

export const gtProductDesignCanvasAnnotation = schemaToGraphQLType(
  "ProductDesignCanvasAnnotation",
  productDesignCanvasAnnotationSchema
);

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
  annotations: ProductDesignCanvasAnnotation[];
  measurements: ProductDesignCanvasMeasurement[];
}