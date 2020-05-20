import Knex from "knex";
import uuid from "node-uuid";

import ImageAttribute, {
  dataAdapter,
  ImageAttributeRow,
  isImageAttributeRow,
} from "./domain-objects";
import db from "../../../services/db";
import first from "../../../services/first";
import { validate, validateEvery } from "../../../services/validate-from-db";
import ImageAttributeWithAsset, {
  dataAdapter as dataAdapterWithAsset,
  ImageAttributeWithAssetRow,
  isImageAttributeWithAssetRow,
} from "./domain-objects/with-asset";

const TABLE_NAME = "image_attributes";

/**
 * Creates a Image Attribute.
 */
export async function create(
  image: MaybeUnsaved<ImageAttribute>,
  trx: Knex.Transaction
): Promise<ImageAttribute> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...image,
    deletedAt: null,
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .modify((query: Knex.QueryBuilder) => query.transacting(trx))
    .then((rows: ImageAttributeRow[]) => first<ImageAttributeRow>(rows));

  if (!created) {
    throw new Error("Failed to create a Image Attribute!");
  }

  return validate<ImageAttributeRow, ImageAttribute>(
    TABLE_NAME,
    isImageAttributeRow,
    dataAdapter,
    created
  );
}

/**
 * Returns an attribute with a matching id.
 */
export async function findById(
  imageId: string,
  trx?: Knex.Transaction
): Promise<ImageAttribute | null> {
  const image: ImageAttributeRow | undefined = await db(TABLE_NAME)
    .select("*")
    .where({ deleted_at: null, id: imageId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: ImageAttributeRow[]) => first(rows));

  if (!image) {
    return null;
  }

  return validate<ImageAttributeRow, ImageAttribute>(
    TABLE_NAME,
    isImageAttributeRow,
    dataAdapter,
    image
  );
}

/**
 * Find all image attributes by a list of node ids.
 */
export async function findAllByNodes(
  nodeIds: string[],
  trx?: Knex.Transaction
): Promise<ImageAttributeWithAsset[]> {
  const images: ImageAttributeWithAssetRow[] = await db(TABLE_NAME)
    .select("image_attributes.*", db.raw("row_to_json(assets.*) as asset"))
    .leftJoin("assets", "assets.id", "image_attributes.asset_id")
    .whereIn("image_attributes.node_id", nodeIds)
    .andWhere({ "image_attributes.deleted_at": null })
    .orderBy("image_attributes.created_at", "DESC")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<ImageAttributeWithAssetRow, ImageAttributeWithAsset>(
    TABLE_NAME,
    isImageAttributeWithAssetRow,
    dataAdapterWithAsset,
    images
  );
}
