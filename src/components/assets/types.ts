export interface AssetLinks {
  assetLink: string | null;
  downloadLink: string;
  fileType: string;
  thumbnail2xLink: string | null;
  thumbnailLink: string | null;
}
export interface Asset {
  assetLinks?: AssetLinks | null;
  createdAt: Date;
  description: string | null;
  id: string;
  mimeType: string;
  originalHeightPx: number;
  originalWidthPx: number;
  title: string | null;
  uploadCompletedAt: Date | null;
  userId: string | null;
}

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
 * A mapping of { mimeType: extension } that we support that does not reside in mime-db.
 */
export const SUPPORTED_MIME_TYPES = {
  "application/x-photoshop": "psd",
};

/**
 * TODO: adjust the following columns
 * - Drop `description`.
 * - Drop `deleted_at`.
 * - Change `user_id` to `created_by` and make it required.
 * - Pull out `original_height_px` and `original_width_px` into an Image Metadata table.
 */
export interface AssetRow {
  created_at: string;
  description: string | null;
  id: string;
  mime_type: string;
  original_height_px: string;
  original_width_px: string;
  title: string | null;
  upload_completed_at: string | null;
  user_id: string | null;
}

export default Asset;
