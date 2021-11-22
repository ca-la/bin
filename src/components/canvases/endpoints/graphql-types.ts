import { z } from "zod";
import {
  GraphQLType,
  schemaToGraphQLType,
} from "../../../apollo/published-types";
import { AttachmentInput } from "../../assets/graphql-types";
import { assetSchema } from "../../assets/types";
import { componentTypeSchema } from "../../components/types";
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

const canvasInputSchema = z.object({
  id: z.string(),
  asset: assetSchema,
  title: z.string(),
  designId: z.string(),
  ordering: z.number(),
  type: componentTypeSchema,
});

export const gtCanvasInput: GraphQLType = schemaToGraphQLType(
  "CanvasInput",
  canvasInputSchema,
  { type: "input", depTypes: { asset: AttachmentInput } }
);

export type CanvasInput = z.infer<typeof canvasInputSchema>;
