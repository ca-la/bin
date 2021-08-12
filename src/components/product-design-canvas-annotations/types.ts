import { z } from "zod";

export const productDesignCanvasAnnotationSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  createdAt: z.date(),
  createdBy: z.string(),
  deletedAt: z.date().nullable(),
  x: z.number(),
  y: z.number(),
});
export type ProductDesignCanvasAnnotation = z.infer<
  typeof productDesignCanvasAnnotationSchema
>;

export const productDesignCanvasAnnotationRowSchema = z.object({
  id: z.string(),
  canvas_id: z.string(),
  created_at: z.date(),
  created_by: z.string(),
  deleted_at: z.date().nullable(),
  x: z.number(),
  y: z.number(),
});

export type ProductDesignCanvasAnnotationRow = z.infer<
  typeof productDesignCanvasAnnotationRowSchema
>;
