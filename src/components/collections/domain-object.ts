import { fromSchema } from "../../services/cala-component/cala-adapter";
import { defaultEncoder } from "../../services/data-adapter";
import {
  CollectionDb,
  CollectionDbRow as Row,
  collectionDbSchema,
  collectionDbRowSchema,
  CollectionDesignMetaDbRow,
  designMetaDbSchema,
} from "./types";

export default CollectionDb;
export type CollectionRow = Row;

export const INSERTABLE_PROPERTIES: (keyof CollectionRow)[] = [
  "created_by",
  "description",
  "id",
  "team_id",
  "title",
];

function encode(row: CollectionRow): CollectionDb {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    description: row.description,
    id: row.id,
    teamId: row.team_id,
    title: row.title,
    designs:
      row.designs &&
      row.designs.map((design: CollectionDesignMetaDbRow) =>
        designMetaDbSchema.parse(defaultEncoder(design))
      ),
  };
}

export const dataAdapter = fromSchema({
  modelSchema: collectionDbSchema,
  rowSchema: collectionDbRowSchema,
  encodeTransformer: encode,
});
