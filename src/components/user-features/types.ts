import { z } from "zod";

export const userFeatureSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type UserFeature = z.infer<typeof userFeatureSchema>;

export const userFeatureRowSchema = z.object({
  id: userFeatureSchema.shape.id,
  user_id: userFeatureSchema.shape.userId,
  name: userFeatureSchema.shape.name,
  created_at: userFeatureSchema.shape.createdAt,
  deleted_at: userFeatureSchema.shape.deletedAt,
});

export type UserFeatureRow = z.infer<typeof userFeatureRowSchema>;
