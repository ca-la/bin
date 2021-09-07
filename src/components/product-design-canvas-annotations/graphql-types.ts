import { z } from "zod";
import { schemaToGraphQLType } from "../../apollo/published-types";
import { productDesignCanvasAnnotationSchema } from "./types";

export const gtProductDesignCanvasAnnotation = schemaToGraphQLType(
  "ProductDesignCanvasAnnotation",
  productDesignCanvasAnnotationSchema
);

const annotationInputSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  commentText: z.string(),
});

export const gtAnnotationInput = schemaToGraphQLType(
  "AnnotationInput",
  annotationInputSchema,
  {
    type: "input",
  }
);

export type AnnotationInput = z.infer<typeof annotationInputSchema>;
