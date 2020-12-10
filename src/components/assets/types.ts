export interface AssetLinks {
  assetId: string | null;
  assetLink: string | null;
  asset3xLink: string | null;
  downloadLink: string;
  fileType: string;
  thumbnail2xLink: string | null;
  thumbnailLink: string | null;
  originalWidthPx: number | null;
  originalHeightPx: number | null;
}

export interface Asset {
  createdAt: Date;
  description: string | null;
  id: string;
  mimeType: string;
  originalHeightPx: number | null;
  originalWidthPx: number | null;
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
];

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
  original_height_px: number | null;
  original_width_px: number | null;
  title: string | null;
  upload_completed_at: string | null;
  user_id: string | null;
}

export default Asset;
