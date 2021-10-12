import { z } from "zod";

import {
  dateStringToDate,
  nullableDateStringToNullableDate,
} from "../../services/zod-helpers";
import { permissionsSchema } from "../permissions/types";
import { designImageAssetSchema } from "../../components/assets/types";
import { cartSubtotalSchema } from "../../components/design-quotes/types";

export const designMetaDbRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: dateStringToDate,
  image_assets: z.array(designImageAssetSchema),
});

export const designMetaDbSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: dateStringToDate,
  imageAssets: z.array(designImageAssetSchema),
});

export const designMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: dateStringToDate,
  previewImageUrls: z.array(z.string()),
});

export type CollectionDesignMetaDbRow = z.infer<typeof designMetaDbRowSchema>;
export type CollectionDesignMetaDb = z.infer<typeof designMetaDbSchema>;
export type CollectionDesignMeta = z.infer<typeof designMetaSchema>;

export const collectionDbSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  createdBy: z.string(),
  description: z.string().nullable(),
  title: z.string().nullable(),
  teamId: z.string().nullable(),
  designs: z.array(designMetaDbSchema).optional(),
});

export type CollectionDb = z.infer<typeof collectionDbSchema>;

export const collectionDbForTests: CollectionDb = {
  id: "d1",
  createdAt: new Date(),
  createdBy: "user-one",
  deletedAt: null,
  description: null,
  teamId: null,
  title: "New collection",
};

export const collectionDbRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  deleted_at: z.date().nullable(),
  created_by: z.string(),
  description: z.string().nullable(),
  title: z.string().nullable(),
  team_id: z.string().nullable(),
  designs: z.array(designMetaDbRowSchema).optional(),
});

export type CollectionDbRow = z.infer<typeof collectionDbRowSchema>;

export const collectionSchema = collectionDbSchema.extend({
  permissions: permissionsSchema,
  designs: z.array(designMetaSchema),
});

export type Collection = z.infer<typeof collectionSchema>;

export const collectionSubmissionStatus = z.object({
  collectionId: z.string(),
  isSubmitted: z.boolean(),
  isCosted: z.boolean(),
  isQuoted: z.boolean(),
  isPaired: z.boolean(),
  pricingExpiresAt: z.date().nullable(),
});

export const serializedCollectionSubmissionStatus = collectionSubmissionStatus.extend(
  {
    pricingExpiresAt: nullableDateStringToNullableDate,
  }
);

export type CollectionSubmissionStatus = z.infer<
  typeof collectionSubmissionStatus
>;

export const collectionUpdateSchema = z
  .object({
    description: z.string().nullable(),
    title: z.string().min(1).nullable(),
    teamId: z.string(),
  })
  .partial();

export type CollectionUpdate = z.infer<typeof collectionUpdateSchema>;

const costedCollectionCartDetailSchema = collectionSchema.extend({
  cartStatus: z.literal("COSTED"),
  cartSubtotal: cartSubtotalSchema,
});
export type CostedCollectionCartDetail = z.infer<
  typeof costedCollectionCartDetailSchema
>;

const submittedCollectionCartDetailSchema = collectionSchema.extend({
  cartStatus: z.literal("SUBMITTED"),
});
export type SubmittedCollectionCartDetail = z.infer<
  typeof submittedCollectionCartDetailSchema
>;

const cartDetailsCollectionSchema = z.union([
  submittedCollectionCartDetailSchema,
  costedCollectionCartDetailSchema,
]);

export type CartDetailsCollection = z.infer<typeof cartDetailsCollectionSchema>;
