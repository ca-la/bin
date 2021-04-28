import { z } from "zod";

import { permissionsSchema } from "../permissions/types";

export const collectionDbSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  createdBy: z.string(),
  description: z.string().nullable(),
  title: z.string().nullable(),
  teamId: z.string().nullable(),
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
});

export type CollectionDbRow = z.infer<typeof collectionDbRowSchema>;

export const collectionSchema = collectionDbSchema.extend({
  permissions: permissionsSchema,
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

export type CollectionSubmissionStatus = z.infer<
  typeof collectionSubmissionStatus
>;

export const collectionUpdateSchema = z
  .object({
    description: z.string().nullable(),
    title: z.string().nullable(),
    teamId: z.string(),
  })
  .partial();

export type CollectionUpdate = z.infer<typeof collectionUpdateSchema>;
