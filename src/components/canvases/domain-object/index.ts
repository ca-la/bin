import DataAdapter from '../../../services/data-adapter';
import { hasProperties } from '../../../services/require-properties';

/**
 * @typedef {object} Canvas A canvas in a design space holding a view to a design
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

export default interface Canvas {
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
  archivedAt: Date | null;
}

export interface CanvasRow {
  id: string;
  design_id: string;
  created_at: Date;
  created_by: string;
  component_id: string | null;
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  deleted_at: Date | null;
  ordering?: number;
  archived_at: Date | null;
}

function encodeCanvasRow(row: CanvasRow): Canvas {
  return {
    id: row.id,
    designId: row.design_id,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    componentId: row.component_id,
    title: row.title,
    width: Number(row.width),
    height: Number(row.height),
    x: Number(row.x),
    y: Number(row.y),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    ordering: row.ordering,
    archivedAt: row.archived_at ? new Date(row.archived_at) : null
  };
}

function decodeCanvas(data: Canvas): CanvasRow {
  return {
    id: data.id,
    design_id: data.designId,
    created_at: data.createdAt,
    created_by: data.createdBy,
    component_id: data.componentId,
    title: data.title,
    width: data.width,
    height: data.height,
    x: data.x,
    y: data.y,
    deleted_at: data.deletedAt,
    ordering: data.ordering,
    archived_at: data.archivedAt
  };
}

export const dataAdapter = new DataAdapter<CanvasRow, Canvas>(
  encodeCanvasRow,
  decodeCanvas
);
export const partialDataAdapter = new DataAdapter<
  Partial<CanvasRow>,
  Partial<Canvas>
>();

export function isUnsavedCanvas(obj: object): obj is Unsaved<Canvas> {
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

export function isCanvas(obj: object): obj is Canvas {
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
    'deletedAt',
    'archivedAt'
  );
}

export function isCanvasRow(row: object): row is CanvasRow {
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
    'deleted_at',
    'archived_at'
  );
}
