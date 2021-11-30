import { z } from "zod";
import { tolerantComponentSchema } from "../../components/components/types";
import { productDesignOptionSchema } from "../../components/product-design-options/types";
import { assetLinksSchema } from "../assets/types";

/**
 * @typedef {object} Canvas A canvas in a design space holding a view to a design
 *
 * @property {string} id The primary id
 * @property {string} designId The id of the design this canvas belongs to
 * @property {Date} createdAt The date the row was created
 * @property {string} createdBy The date the row was created
 * @property {string} title The title of the canvas
 * @property {number} width The width of the canvas
 * @property {number} height The height of the canvas
 * @property {number} x The x position of the canvas in the design space
 * @property {number} y The y position of the canvas in the design space
 * @property {Date | null} deletedAt The date the row was deleted or null
 * @property {number} ordering The order of the canvas in the design space
 */
export const canvasSchema = z.object({
  id: z.string(),
  designId: z.string(),
  createdAt: z.date(),
  createdBy: z.string(),
  componentId: z.string().nullable(),
  title: z.string(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  x: z.number(),
  y: z.number(),
  deletedAt: z.date().nullable(),
  ordering: z.number().int().optional(),
  archivedAt: z.date().nullable(),
});

export type Canvas = z.infer<typeof canvasSchema>;

export const componentWithAssetLinksSchema = tolerantComponentSchema
  .merge(assetLinksSchema)
  .extend({ mimeType: z.string() });

export type ComponentWithAssetLinks = z.infer<
  typeof componentWithAssetLinksSchema
>;

export const enrichedComponentSchema = componentWithAssetLinksSchema.extend({
  option: productDesignOptionSchema.nullable(),
});
export type EnrichedComponent = z.infer<typeof enrichedComponentSchema>;

export const canvasWithEnrichedComponentsSchema = canvasSchema.extend({
  components: z.array(enrichedComponentSchema),
});

export type CanvasWithEnrichedComponents = z.infer<
  typeof canvasWithEnrichedComponentsSchema
>;

export const unsavedCanvasSchema = canvasSchema.omit({
  id: true,
  createdAt: true,
  deletedAt: true,
  archivedAt: true,
});

export const canvasRowSchema = z.object({
  id: z.string(),
  design_id: z.string(),
  created_at: z.string(),
  created_by: z.string(),
  component_id: z.string().nullable(),
  title: z.string(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  x: z.number(),
  y: z.number(),
  deleted_at: z.string().nullable(),
  ordering: z.number().int().optional(),
  archived_at: z.string().nullable(),
});

export type CanvasRow = z.infer<typeof canvasRowSchema>;
