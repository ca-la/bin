import { z } from "zod";
import {
  dateStringToDate,
  nullableDateStringToNullableDate,
} from "../../services/zod-helpers";

export enum ComponentType {
  Material = "Material",
  Artwork = "Artwork",
  Sketch = "Sketch",
}

export const componentTypeSchema = z.nativeEnum(ComponentType);

export const baseComponentSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  createdBy: z.string(),
  deletedAt: z.date().nullable(),
  parentId: z.string().nullable(),
  type: componentTypeSchema,
  materialId: z.string().nullable(),
  artworkId: z.string().nullable(),
  sketchId: z.string().nullable(),
  assetPageNumber: z.number().nullable(),
});

export type BaseComponent = z.infer<typeof baseComponentSchema>;

export const materialComponentSchema = baseComponentSchema.extend({
  type: z.literal(ComponentType.Material),
  materialId: z.string(),
  artworkId: z.null(),
  sketchId: z.null(),
});

export type MaterialComponent = z.infer<typeof materialComponentSchema>;

export const artworkComponentSchema = baseComponentSchema.extend({
  type: z.literal(ComponentType.Artwork),
  materialId: z.null(),
  artworkId: z.string(),
  sketchId: z.null(),
});

export type ArtworkComponent = z.infer<typeof artworkComponentSchema>;

export const sketchComponentSchema = baseComponentSchema.extend({
  type: z.literal(ComponentType.Sketch),
  materialId: z.null(),
  artworkId: z.null(),
  sketchId: z.string(),
});

export type SketchComponent = z.infer<typeof sketchComponentSchema>;

export const componentSchema = z.union([
  materialComponentSchema,
  artworkComponentSchema,
  sketchComponentSchema,
]);

export type Component = z.infer<typeof componentSchema>;

const serialized = {
  createdAt: dateStringToDate,
  deletedAt: nullableDateStringToNullableDate,
} as const;

export const serializedComponentSchema = z.union([
  materialComponentSchema.extend(serialized),
  artworkComponentSchema.extend(serialized),
  sketchComponentSchema.extend(serialized),
]);

export const serializedComponentArraySchema = z.array(
  serializedComponentSchema
);

export type SerializedComponent = z.infer<typeof serializedComponentSchema>;
export const componentRowSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  created_at: z.date(),
  created_by: z.string(),
  deleted_at: z.date().nullable(),
  type: componentTypeSchema,
  material_id: z.string().nullable(),
  artwork_id: z.string().nullable(),
  sketch_id: z.string().nullable(),
  asset_page_number: z.number().nullable(),
});

export type ComponentRow = z.infer<typeof componentRowSchema>;

export const SPLITTABLE_MIME_TYPES = [
  "application/pdf",
  "application/postscript",
];

export const componentTestBlank: Component = {
  id: "a-component",
  createdAt: new Date(),
  parentId: null,
  createdBy: "a-user",
  deletedAt: null,
  type: ComponentType.Sketch,
  materialId: null,
  artworkId: null,
  sketchId: "an-asset",
  assetPageNumber: null,
} as const;
