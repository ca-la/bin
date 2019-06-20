import DataAdapter from '../../services/data-adapter';
import {
  hasProperties,
  hasSomeProperties
} from '../../services/require-properties';

/**
 * TODO: adjust the following columns
 * - Drop `description`.
 * - Drop `deleted_at`.
 * - Change `user_id` to `created_by` and make it required.
 * - Pull out `original_height_px` and `original_width_px` into an Image Metadata table.
 */

export default interface Asset {
  createdAt: Date;
  deletedAt: Date | null;
  description: string | null;
  id: string;
  mimeType: string;
  originalHeightPx: number;
  originalWidthPx: number;
  title: string | null;
  uploadCompletedAt: Date | null;
  userId: string | null;
}

export interface AssetRow {
  created_at: string;
  deleted_at: string | null;
  description: string | null;
  id: string;
  mime_type: string;
  original_height_px: string;
  original_width_px: string;
  title: string | null;
  upload_completed_at: string | null;
  user_id: string | null;
}

export const dataAdapter = new DataAdapter<AssetRow, Asset>(
  toData,
  toInsertion
);

export function toInsertion(data: Asset): AssetRow {
  return {
    created_at: data.createdAt.toISOString(),
    deleted_at: data.deletedAt ? data.deletedAt.toISOString() : null,
    description: data.description,
    id: data.id,
    mime_type: data.mimeType,
    original_height_px: String(data.originalHeightPx),
    original_width_px: String(data.originalWidthPx),
    title: data.title,
    upload_completed_at: data.uploadCompletedAt
      ? data.uploadCompletedAt.toISOString()
      : null,
    user_id: data.userId
  };
}

export function toPartialInsertion(data: Partial<Asset>): Partial<AssetRow> {
  return {
    created_at: data.createdAt ? data.createdAt.toISOString() : undefined,
    deleted_at: data.deletedAt ? data.deletedAt.toISOString() : undefined,
    description: data.description,
    id: data.id,
    mime_type: data.mimeType,
    original_height_px: data.originalHeightPx
      ? String(data.originalHeightPx)
      : undefined,
    original_width_px: data.originalWidthPx
      ? String(data.originalWidthPx)
      : undefined,
    title: data.title,
    upload_completed_at: data.uploadCompletedAt
      ? data.uploadCompletedAt.toISOString()
      : undefined,
    user_id: data.userId
  };
}

export function toData(row: AssetRow): Asset {
  return {
    createdAt: new Date(row.created_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    description: row.description,
    id: row.id,
    mimeType: row.mime_type,
    originalHeightPx: Number(row.original_height_px),
    originalWidthPx: Number(row.original_width_px),
    title: row.title,
    uploadCompletedAt: row.upload_completed_at
      ? new Date(row.upload_completed_at)
      : null,
    userId: row.user_id
  };
}

export function isAssetRow(row: any): row is AssetRow {
  return hasProperties(
    row,
    'created_at',
    'deleted_at',
    'description',
    'id',
    'mime_type',
    'original_height_px',
    'original_width_px',
    'title',
    'upload_completed_at',
    'user_id'
  );
}

export function isAsset(data: any): data is Asset {
  return hasProperties(
    data,
    'createdAt',
    'deletedAt',
    'description',
    'id',
    'mimeType',
    'originalHeightPx',
    'originalWidthPx',
    'title',
    'uploadCompletedAt',
    'userId'
  );
}

export function isPartialAsset(data: any): data is Partial<Asset> {
  return hasSomeProperties(
    data,
    'createdAt',
    'deletedAt',
    'description',
    'id',
    'mimeType',
    'originalHeightPx',
    'originalWidthPx',
    'title',
    'uploadCompletedAt',
    'userId'
  );
}