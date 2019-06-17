import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';
import { hasSomeProperties } from '../../services/require-properties';

export interface FileRow {
  id: string;
  created_at: string;
  created_by: string;
  mime_type: string;
  name: string | null;
  upload_completed_at: string | null;
}

export interface FileData {
  id: string;
  createdAt: Date;
  createdBy: string;
  mimeType: string;
  name: string | null;
  uploadCompletedAt: Date | null;
}

export const dataAdapter = new DataAdapter<FileRow, FileData>(
  toData,
  toInsertion
);

export function toPartialInsertion(data: Partial<FileData>): Partial<FileRow> {
  return {
    id: data.id,
    created_at: data.createdAt ? data.createdAt.toISOString() : undefined,
    created_by: data.createdBy,
    mime_type: data.mimeType,
    name: data.name,
    upload_completed_at: data.uploadCompletedAt
      ? data.uploadCompletedAt.toISOString()
      : null
  };
}

export function toInsertion(data: FileData): FileRow {
  return {
    id: data.id,
    created_at: data.createdAt.toISOString(),
    created_by: data.createdBy,
    mime_type: data.mimeType,
    name: data.name,
    upload_completed_at: data.uploadCompletedAt
      ? data.uploadCompletedAt.toISOString()
      : null
  };
}

export function toData(row: FileRow): FileData {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    mimeType: row.mime_type,
    name: row.name,
    uploadCompletedAt: row.upload_completed_at
      ? new Date(row.upload_completed_at)
      : null
  };
}

export function isFileRow(row: any): row is FileRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'created_by',
    'mime_type',
    'name',
    'upload_completed_at'
  );
}

export function isFileData(data: any): data is FileData {
  return hasProperties(
    data,
    'id',
    'createdAt',
    'createdBy',
    'mimeType',
    'name',
    'uploadCompletedAt'
  );
}

export function isPartialFileData(data: any): data is Partial<FileData> {
  return hasSomeProperties(
    data,
    'id',
    'createdAt',
    'createdBy',
    'mimeType',
    'name',
    'uploadCompletedAt'
  );
}
