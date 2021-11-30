import * as z from "zod";

import { dateStringToDate } from "../../services/zod-helpers";

export const productDesignOptionSchema = z.object({
  id: z.string(),

  // true if this is a fabric/trim we're offering ourselves, false if
  // user-created. if false then user_id must be present
  isBuiltinOption: z.boolean().nullable(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  type: z.string(),
  userId: z.string().nullable(),
  title: z.string(),
  previewImageId: z.string().nullable(),
  patternImageId: z.string().nullable(),
});
export type ProductDesignOption = z.infer<typeof productDesignOptionSchema>;

export const productDesignOptionRowSchema = z.object({
  id: z.string(),
  is_builtin_option: z.boolean().nullable(),
  created_at: z.date(),
  deleted_at: z.date().nullable(),
  type: z.string(),
  user_id: z.string().nullable(),
  title: z.string(),
  preview_image_id: z.string().nullable(),
  pattern_image_id: z.string().nullable(),
});
export type ProductDesignOptionRow = z.infer<
  typeof productDesignOptionRowSchema
>;

export const createProductDesignOptionSchema = z.object({
  createdAt: dateStringToDate,
  id: z.string(),
  previewImageId: z.string(),
  title: z.string(),
  type: z.string(),
  userId: z.string(),
});
export type CreateProductDesignOption = z.infer<
  typeof createProductDesignOptionSchema
>;
