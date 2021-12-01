import { z } from "zod";
import { numberStringToNumber } from "../../services/zod-helpers";

export const annotationDbSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  createdAt: z.date(),
  createdBy: z.string(),
  deletedAt: z.date().nullable(),
  resolvedAt: z.date().nullable(),
  x: z.number(),
  y: z.number(),
});
export type AnnotationDb = z.infer<typeof annotationDbSchema>;

export const annotationSchema = annotationDbSchema.extend({
  commentCount: z.number(),
  submissionCount: z.number(),
});
export type Annotation = z.infer<typeof annotationSchema>;

export const annotationDbRowSchema = z.object({
  id: annotationDbSchema.shape.id,
  canvas_id: annotationDbSchema.shape.canvasId,
  created_at: annotationDbSchema.shape.createdAt,
  created_by: annotationDbSchema.shape.createdBy,
  deleted_at: annotationDbSchema.shape.deletedAt,
  resolved_at: annotationDbSchema.shape.resolvedAt,
  x: z.union([numberStringToNumber, z.number()]),
  y: z.union([numberStringToNumber, z.number()]),
});
export type AnnotationDbRow = z.infer<typeof annotationDbRowSchema>;

export const annotationRowSchema = annotationDbRowSchema.extend({
  comment_count: z.union([numberStringToNumber, z.number()]),
  submission_count: z.union([numberStringToNumber, z.number()]),
});
export type AnnotationRow = z.infer<typeof annotationRowSchema>;
