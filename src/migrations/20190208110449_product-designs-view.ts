import Knex from 'knex';

export const PRODUCT_DESIGNS_WITH_METADATA_UP = `
CREATE VIEW product_designs_with_metadata AS
SELECT
  product_designs.*,
  array_to_json(array_remove(
      array[
        CASE
          WHEN collection_designs.collection_id IS NOT null
          THEN jsonb_build_object(
            'id',
            collection_designs.collection_id,
            'title',
            collections.title
          )
        END
      ],
      null
  )) as collections,
  array_remove(array_agg(pdi.id), null) AS image_ids
FROM product_designs
LEFT JOIN collection_designs ON collection_designs.design_id = product_designs.id
LEFT JOIN collections ON collections.id = collection_designs.collection_id
LEFT JOIN (SELECT * FROM product_design_canvases AS c WHERE c.deleted_at IS null) AS c
  ON c.design_id = product_designs.id
LEFT JOIN (SELECT * FROM components AS co WHERE co.deleted_at IS null) AS co
  ON co.id = c.component_id
LEFT JOIN (SELECT * FROM product_design_images AS pdi WHERE pdi.deleted_at IS null) AS pdi
  ON pdi.id = co.sketch_id
GROUP BY product_designs.id, collection_designs.collection_id, collections.title
ORDER BY product_designs.created_at DESC;
`;

export function up(knex: Knex): Knex.Raw {
  return knex.raw(PRODUCT_DESIGNS_WITH_METADATA_UP);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW product_designs_with_metadata;
  `);
}
