import db from '../../../services/db';
import Knex from 'knex';

const TABLE_NAME = 'product_designs';

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
)) as collections,
array_remove(array_agg(pdi.id ORDER BY c.ordering ASC, c.created_at), null) AS image_ids
    `)
    )
    .leftJoin(
      'collection_designs',
      'product_designs.id',
      'collection_designs.design_id'
    )
    .leftJoin('collections', (join: Knex.JoinClause) =>
      join
        .on('collections.id', '=', 'collection_designs.collection_id')
        .andOnNull('collections.deleted_at')
    )
    .joinRaw(
      `
LEFT JOIN (SELECT * FROM canvases AS c WHERE c.deleted_at IS null AND archived_at IS null) AS c
ON c.design_id = product_designs.id
    `
    )
    .joinRaw(
      `
LEFT JOIN (SELECT * FROM components AS co WHERE co.deleted_at IS null) AS co
ON co.id = c.component_id
    `
    )
    .joinRaw(
      `
LEFT JOIN (
  SELECT * FROM product_design_images AS pdi
   WHERE pdi.deleted_at IS NULL
     AND pdi.upload_completed_at IS NOT NULL
) AS pdi
ON pdi.id in (
  co.sketch_id,
  (
    SELECT preview_image_id FROM product_design_options
     WHERE product_design_options.id = co.material_id LIMIT 1
  ),
  co.artwork_id
)
    `
    )
    .groupBy(['product_designs.id', 'collections.id', 'collections.title'])
    .orderBy('product_designs.created_at', 'desc')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
}
