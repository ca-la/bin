import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

export default interface ProductDesignCanvasAnnotation {
  canvasId: string;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  id: string;
  x: number;
  y: number;
}

export interface ProductDesignCanvasAnnotationRow {
  canvas_id: string;
  created_at: Date;
  created_by: string;
  deleted_at: Date | null;
  id: string;
  x: number;
  y: number;
}

export const dataAdapter = new DataAdapter<
  ProductDesignCanvasAnnotationRow,
  ProductDesignCanvasAnnotation
>();

export function isProductDesignCanvasAnnotationRow(row: object):
  row is ProductDesignCanvasAnnotationRow {
  return hasProperties(
    row,
    'canvas_id',
    'created_at',
    'created_by',
    'deleted_at',
    'id',
    'x',
    'y'
  );
}