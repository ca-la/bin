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
 * @property {number} ordering The order of the canvas in the design space
 */

export default interface ProductDesignCanvas {
  id: string;
  designId: string;
  createdAt: Date;
  createdBy: string;
  componentId: string | null;
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  deletedAt: Date | null;
  ordering?: number;
}

export interface ProductDesignCanvasRow {
  id: string;
  design_id: string;
  created_at: Date;
  created_by: Date;
  component_id: string | null;
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  deleted_at: Date | null;
  ordering?: number;
}

export const dataAdapter = new DataAdapter<
  ProductDesignCanvasRow,
  ProductDesignCanvas
>();
export const partialDataAdapter = new DataAdapter<
  Partial<ProductDesignCanvasRow>,
  Partial<ProductDesignCanvas>
>();

export function isUnsavedProductDesignCanvas(
  obj: object
): obj is Unsaved<ProductDesignCanvas> {
  return hasProperties(
    obj,
    'createdBy',
    'designId',
    'componentId',
    'title',
    'width',
    'height',
    'ordering',
    'x',
    'y'
  );
}

export function isProductDesignCanvas(obj: object): obj is ProductDesignCanvas {
  return hasProperties(
    obj,
    'id',
    'createdAt',
    'createdBy',
    'designId',
    'componentId',
    'title',
    'width',
    'height',
    'x',
    'y',
    'deletedAt'
  );
}

export function isProductDesignCanvasRow(
  row: object
): row is ProductDesignCanvasRow {
  return hasProperties(
    row,
    'id',
    'design_id',
    'created_at',
    'created_by',
    'component_id',
    'title',
    'width',
    'height',
    'x',
    'y',
    'deleted_at'
  );
}
