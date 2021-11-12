import { z } from "zod";
import { schemaToGraphQLType } from "../../apollo/published-types";
import { AttachmentInput } from "../assets/graphql-types";
import { assetSchema } from "../assets/types";
import { annotationDbSchema } from "./types";

export const gtProductDesignCanvasAnnotation = schemaToGraphQLType(
  "ProductDesignCanvasAnnotation",
  annotationDbSchema
);

const annotationInputSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  commentText: z.string(),
  commentAttachments: z.array(assetSchema).optional(),
});

export const gtAnnotationInput = schemaToGraphQLType(
  "AnnotationInput",
  annotationInputSchema,
  {
    type: "input",
    depTypes: {
      commentAttachments: AttachmentInput,
    },
  }
);

export type AnnotationInput = z.infer<typeof annotationInputSchema>;
