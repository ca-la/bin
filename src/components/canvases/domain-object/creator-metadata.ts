import DataAdapter from '../../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';

export interface CreatorMetadata {
  canvasId: string;
  createdAt: Date;
  createdByName: string;
}

export interface CreatorMetadataRow {
  canvas_id: string;
  created_at: string;
  created_by_name: string;
}

function encode(row: CreatorMetadataRow): CreatorMetadata {
  return {
    canvasId: row.canvas_id,
    createdAt: new Date(row.created_at),
    createdByName: row.created_by_name
  };
}

function decode(data: CreatorMetadata): CreatorMetadataRow {
  return {
    canvas_id: data.canvasId,
    created_at: data.createdAt.toISOString(),
    created_by_name: data.createdByName
  };
}

export const creatorDataAdapter = new DataAdapter<
  CreatorMetadataRow,
  CreatorMetadata
>(encode, decode);

export function isCreatorMetadataRow(row: object): row is CreatorMetadataRow {
  return hasProperties(row, 'canvas_id', 'created_at', 'created_by_name');
}
