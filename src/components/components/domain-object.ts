import { pick } from "lodash";

import DataAdapter, { defaultEncoder } from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";

export enum ComponentType {
  Material = "Material",
  Artwork = "Artwork",
  Sketch = "Sketch",
}

export default interface Component {
  id: string;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  parentId: string | null;
  type: ComponentType;
  materialId: string | null;
  artworkId: string | null;
  sketchId: string | null;
}

const knownKeys = [
  "id",
  "createdAt",
  "createdBy",
  "deletedAt",
  "parentId",
  "type",
  "materialId",
  "artworkId",
  "sketchId",
];

export interface ComponentRow {
  id: string;
  parent_id: string | null;
  created_at: string;
  created_by: string;
  deleted_at: string | null;
  type: ComponentType;
  material_id: string | null;
  artwork_id: string | null;
  sketch_id: string | null;
}

function encode(row: ComponentRow): Component {
  const defaultEncoded = defaultEncoder<ComponentRow, Component>(row);
  return pick(defaultEncoded, knownKeys) as Component;
}

export const dataAdapter = new DataAdapter<ComponentRow, Component>(encode);

export function isUnsavedComponent(data: object): data is Component {
  return hasProperties(
    data,
    "id",
    "parentId",
    "createdAt",
    "createdBy",
    "deletedAt",
    "type",
    "materialId",
    "artworkId",
    "sketchId"
  );
}

export function isComponentRow(row: object): row is ComponentRow {
  return hasProperties(
    row,
    "id",
    "parent_id",
    "created_at",
    "created_by",
    "deleted_at",
    "type",
    "material_id",
    "artwork_id",
    "sketch_id"
  );
}
