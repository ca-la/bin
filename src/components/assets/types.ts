import * as z from "zod";

export const assetLinksSchema = z.object({
  assetId: z.string().nullable(),
  assetLink: z.string().nullable(),
  asset3xLink: z.string().nullable(),
  downloadLink: z.string(),
  fileType: z.string(),
  thumbnail2xLink: z.string().nullable(),
  thumbnailLink: z.string().nullable(),
  originalWidthPx: z.number().nullable(),
  originalHeightPx: z.number().nullable(),
});
export type AssetLinks = z.infer<typeof assetLinksSchema>;

export const assetSchema = z.object({
  createdAt: z.date(),
  description: z.string().nullable(),
  id: z.string(),
  mimeType: z.string(),
  originalHeightPx: z.number().nullable(),
  originalWidthPx: z.number().nullable(),
  title: z.string().nullable(),
  uploadCompletedAt: z.date().nullable(),
  userId: z.string().nullable(),
});
export type Asset = z.infer<typeof assetSchema>;

export const designImageAsset = z.object({
  id: z.string(),
  page: z.number().nullable(),
});

export type DesignImageAsset = z.infer<typeof designImageAsset>;

export const attachmentSchema = assetSchema.merge(assetLinksSchema);

export const ACCEPTED_IMAGE_TYPES = [
  "heic",
  "jpg",
  "jpeg",
  "png",
  "svg",
  "pdf",
  "ai",
  "gif",
  "psd",
  "bmp",
  "ico",
  "jp2",
  "pjpeg",
  "tif",
  "tiff",
];
export const ACCEPTED_SPREADSHEET_TYPES = ["csv"];
export const ACCEPTED_FILES = ACCEPTED_IMAGE_TYPES.concat(
  ACCEPTED_SPREADSHEET_TYPES
);
export const PREVIEWABLE_FILES = ["jpg", "png", "jpeg", "gif", "svg"];

/**
 * A list of file extension & mime-type pairs to augment what the browser
 * returns as well as what's found in `mime-db`.
 */
export interface FileType {
  extension: string;
  mimeType: string;
}

export const SUPPORTED_FILE_TYPES: FileType[] = [
  { extension: "psd", mimeType: "application/x-photoshop" },
  { extension: "dxf", mimeType: "application/dxf" },
  { extension: "zip", mimeType: "application/x-zip" },
  { extension: "zip", mimeType: "application/x-zip-compressed" },
  { extension: "obj", mimeType: "model/obj" },
];

/**
 * TODO: adjust the following columns
 * - Drop `description`.
 * - Drop `deleted_at`.
 * - Change `user_id` to `created_by` and make it required.
 * - Pull out `original_height_px` and `original_width_px` into an Image Metadata table.
 */
export const assetRowSchema = z.object({
  created_at: z.string(),
  description: z.string().nullable(),
  id: z.string(),
  mime_type: z.string(),
  original_height_px: z.number().nullable(),
  original_width_px: z.number().nullable(),
  title: z.string().nullable(),
  upload_completed_at: z.string().nullable(),
  user_id: z.string().nullable(),
});
export type AssetRow = z.infer<typeof assetRowSchema>;

export default Asset;
