import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} ProductDesignCanvas A canvas in a design space holding a view to a design
 *
 * @property {string} id The primary id
 * @property {string} designId The id of the design this canvas belongs to
 * @property {Date} createdAt The date the row was created
 * @property {string} createdBy The date the row was created
 * @property {string} title The title of the canvas
 * @property {number} width The width of the canvas
 * @property {number} height The height of the canvas
 * @property {number} x The x position of the canvas in the design space
 * @property {number} y The y position of the canvas in the design space
 * @property {Date | null} deletedAt The date the row was deleted or null
 */

export default interface ProductDesignCanvas {
  id: string;
  designId: string;
  createdAt: Date;
  createdBy: string;
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  deletedAt: Date | null;
}

export interface ProductDesignCanvasRow {
  id: string;
  design_id: string;
  created_at: Date;
  created_by: Date;
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  deleted_at: Date | null;
}

export const dataAdapter = new DataAdapter<ProductDesignCanvasRow, ProductDesignCanvas>();

export function isUnsavedProductDesignCanvas(obj: object): obj is Unsaved<ProductDesignCanvas> {
  return hasProperties(
    obj,
    'createdBy',
    'designId',
    'title',
    'width',
    'height',
    'x',
    'y'
  );
}

export function isProductDesignCanvasRow(row: object): row is ProductDesignCanvasRow {
  return hasProperties(
    row,
    'id',
    'design_id',
    'created_at',
    'created_by',
    'title',
    'width',
    'height',
    'x',
    'y',
    'deleted_at'
  );
}