import Knex from "knex";
import uuid from "node-uuid";

import MaterialAttribute, {
  dataAdapter,
  isMaterialAttributeRow,
  MaterialAttributeRow,
} from "./domain-objects";
import db from "../../../services/db";
import first from "../../../services/first";
import { validate, validateEvery } from "../../../services/validate-from-db";
import MaterialAttributeWithAsset, {
  dataAdapter as dataAdapterWithAsset,
  isMaterialAttributeWithAssetRow,
  MaterialAttributeWithAssetRow,
} from "./domain-objects/with-asset";

const TABLE_NAME = "material_attributes";

/**
 * Creates a Material Attribute.
 */
export async function create(
  material: MaybeUnsaved<MaterialAttribute>,
  trx: Knex.Transaction
): Promise<MaterialAttribute> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...material,
    deletedAt: null,
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .modify((query: Knex.QueryBuilder) => query.transacting(trx))
    .then((rows: MaterialAttributeRow[]) => first<MaterialAttributeRow>(rows));

  if (!created) {
    throw new Error("Failed to create a Material Attribute!");
  }

  return validate<MaterialAttributeRow, MaterialAttribute>(
    TABLE_NAME,
    isMaterialAttributeRow,
    dataAdapter,
    created
  );
}

/**
 * Returns an attribute with a matching id.
 */
export async function findById(
  materialId: string,
  trx?: Knex.Transaction
): Promise<MaterialAttribute | null> {
  const material: MaterialAttributeRow | undefined = await db(TABLE_NAME)
    .select("*")
    .where({ deleted_at: null, id: materialId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: MaterialAttributeRow[]) => first(rows));

  if (!material) {
    return null;
  }

  return validate<MaterialAttributeRow, MaterialAttribute>(
    TABLE_NAME,
    isMaterialAttributeRow,
    dataAdapter,
    material
  );
}

/**
 * Find all material attributes by a list of node ids.
 */
export async function findAllByNodes(
  nodeIds: string[],
  trx?: Knex.Transaction
): Promise<MaterialAttributeWithAsset[]> {
  const materials: MaterialAttributeWithAssetRow[] = await db(TABLE_NAME)
    .select("material_attributes.*", db.raw("row_to_json(assets.*) as asset"))
    .leftJoin("assets", "assets.id", "material_attributes.asset_id")
    .whereIn("material_attributes.node_id", nodeIds)
    .andWhere({ "material_attributes.deleted_at": null })
    .orderBy("material_attributes.created_at", "DESC")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<
    MaterialAttributeWithAssetRow,
    MaterialAttributeWithAsset
  >(
    TABLE_NAME,
    isMaterialAttributeWithAssetRow,
    dataAdapterWithAsset,
    materials
  );
}
