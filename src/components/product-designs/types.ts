import { z } from "zod";
import { approvalStepSchema } from "../../published-types";

export const baseProductDesignSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  title: z.string(),
  productType: z.string().nullable(),
  userId: z.string(),
  description: z.string().nullable(),
  previewImageUrls: z.array(z.string()),
});
export type BaseProductDesign = z.infer<typeof baseProductDesignSchema>;

export const baseProductDesignForTests: BaseProductDesign = {
  id: "d1",
  createdAt: new Date(),
  deletedAt: null,
  title: "My Shirt",
  productType: "SHIRT",
  userId: "user-one",
  description: null,
  previewImageUrls: [],
};

export const baseProductDesignRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  deleted_at: z.date().nullable(),
  title: z.string(),
  product_type: z.string().nullable(),
  user_id: z.string(),
  description: z.string().nullable(),
  preview_image_urls: z.array(z.string()),
});

export type BaseProductDesignRow = z.infer<typeof baseProductDesignRowSchema>;

export const productDesignSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  title: z.string(),
  productType: z.string().nullable(),
  userId: z.string(),
  description: z.string().nullable(),
  previewImageUrls: z.array(z.string()),
  imageLinks: z.array(z.string()),
  collections: z
    .array(z.object({ id: z.string(), title: z.string().nullable() }))
    .optional(),
  collectionIds: z.array(z.string()).optional(),
  approvalSteps: z.array(approvalStepSchema).optional(),
});
