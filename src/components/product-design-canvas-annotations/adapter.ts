import { fromSchema } from "../../services/cala-component/cala-adapter";
import { defaultEncoder } from "../../services/data-adapter";
import {
  annotationDbRowSchema,
  annotationDbSchema,
  annotationRowSchema,
  annotationSchema,
} from "./types";

export const rawAdapter = fromSchema({
  modelSchema: annotationDbSchema,
  rowSchema: annotationDbRowSchema,
  encodeTransformer: annotationDbRowSchema
    .transform(defaultEncoder)
    .transform(annotationDbSchema.parse).parse,
});

export const adapter = fromSchema({
  modelSchema: annotationSchema,
  rowSchema: annotationRowSchema,
  encodeTransformer: annotationRowSchema
    .transform(defaultEncoder)
    .transform(annotationSchema.parse).parse,
});
