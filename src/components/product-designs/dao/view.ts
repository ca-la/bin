import db from "../../../services/db";
import Knex from "knex";

const TABLE_NAME = "product_designs";

export function queryWithCollectionMeta(
  dbInstance: Knex,
  trx?: Knex.Transaction
): Knex.QueryBuilder {
  return dbInstance(TABLE_NAME)
    .select(
      db.raw(`
        product_designs.*,
        array_to_json(array_remove(
            array[case when collections.id is not null
                then jsonb_build_object('id', collections.id, 'title', collections.title)
            end],
            null
        )) as collections
      `),
      db.raw(`
        to_jsonb(
          ARRAY (
            SELECT
              jsonb_build_object(
                'id', assets.id, 'page', co.asset_page_number
              )
            FROM
              canvases AS c
              JOIN components as co on co.id = c.component_id
              and co.deleted_at is null
              JOIN assets on assets.id = co.sketch_id
              and assets.deleted_at IS NULL
              and assets.upload_completed_at IS NOT NULL
            WHERE
              c.design_id = product_designs.id
              and c.archived_at is null
              and c.deleted_at is null
            GROUP BY
              assets.id,
              co.asset_page_number,
              c.ordering
            ORDER BY
              c.ordering
            LIMIT
              2
          )
        ) AS image_assets
      `)
    )
    .leftJoin(
      "collection_designs",
      "product_designs.id",
      "collection_designs.design_id"
    )
    .leftJoin("collections", (join: Knex.JoinClause) =>
      join
        .on("collections.id", "=", "collection_designs.collection_id")
        .andOnNull("collections.deleted_at")
    )
    .groupBy(["product_designs.id", "collections.id", "collections.title"])
    .orderBy("product_designs.created_at", "desc")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
}
