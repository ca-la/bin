import DataAdapter from "../../../services/data-adapter";
import { hasProperties } from "../../../services/require-properties";

import { Canvas, CanvasRow, canvasSchema, unsavedCanvasSchema } from "../types";

export default Canvas;
export { CanvasRow };

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
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
  };
}

function decodeCanvas(data: Canvas): CanvasRow {
  return {
    id: data.id,
    design_id: data.designId,
    created_at: data.createdAt.toISOString(),
    created_by: data.createdBy,
    component_id: data.componentId,
    title: data.title,
    width: data.width,
    height: data.height,
    x: data.x,
    y: data.y,
    deleted_at: data.deletedAt ? data.deletedAt.toISOString() : null,
    ordering: data.ordering,
    archived_at: data.archivedAt ? data.archivedAt.toISOString() : null,
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
  return unsavedCanvasSchema.safeParse(obj).success;
}

export function isCanvas(obj: object): obj is Canvas {
  return canvasSchema.safeParse(obj).success;
}

export function isCanvasRow(row: object): row is CanvasRow {
  return hasProperties(
    row,
    "id",
    "design_id",
    "created_at",
    "created_by",
    "component_id",
    "title",
    "width",
    "height",
    "x",
    "y",
    "deleted_at",
    "archived_at"
  );
}
