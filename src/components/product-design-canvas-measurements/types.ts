import { z } from "zod";

export const productDesignCanvasMeasurementSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  canvasId: z.string(),
  createdBy: z.string(),
  deletedAt: z.date().nullable(),
  label: z.string(),
  measurement: z.string(),
  name: z.string().nullable(),
  startingX: z.number(),
  startingY: z.number(),
  endingX: z.number(),
  endingY: z.number(),
});
export type ProductDesignCanvasMeasurement = z.infer<
  typeof productDesignCanvasMeasurementSchema
>;

export const productDesignCanvasMeasurementSchemaRow = z.object({
  id: z.string(),
  created_at: z.date(),
  canvas_id: z.string(),
  created_by: z.string(),
  deleted_at: z.date().nullable(),
  label: z.string(),
  measurement: z.string(),
  name: z.string().nullable(),
  starting_x: z.number(),
  starting_y: z.number(),
  ending_x: z.number(),
  ending_y: z.number(),
});

export type ProductDesignCanvasMeasurementRow = z.infer<
  typeof productDesignCanvasMeasurementSchemaRow
>;
