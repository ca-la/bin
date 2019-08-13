import * as Knex from 'knex';
import db = require('../../services/db');
import ProductDesign = require('../../domain-objects/product-design');
import limitOrOffset from '../../services/limit-or-offset';
import {
  dataAdapter,
  isProductDesignRow,
  ProductDesignData,
  ProductDesignRow
} from '../../domain-objects/product-designs-new';
import first from '../../services/first';
import { validate } from '../../services/validate-from-db';
import { queryWithCollectionMeta } from './index';

export const TABLE_NAME = 'product_designs';

/**
 * Find all designs that the user is a collaborator on.
 */
export async function findAllDesignsThroughCollaborator(options: {
  userId: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<ProductDesign[]> {
  const result = await queryWithCollectionMeta(db)
    .whereRaw(
      `
product_designs.id in (
  SELECT product_designs.id
		FROM product_designs
		JOIN collaborators AS c ON c.design_id = product_designs.id
		WHERE c.user_id = ?
			AND (c.cancelled_at IS NULL	OR c.cancelled_at > now())
      AND product_designs.deleted_at IS NULL
	UNION
	SELECT product_designs.id
		FROM collaborators AS c
		JOIN collections AS co ON co.id = c.collection_id
		JOIN collection_designs AS cd ON cd.collection_id = co.id
		JOIN product_designs ON product_designs.id = cd.design_id
		WHERE c.user_id = ?
			AND (c.cancelled_at IS NULL	OR c.cancelled_at > now())
			AND co.deleted_at IS NULL
      AND product_designs.deleted_at IS NULL
)
    `,
      [options.userId, options.userId]
    )
    .modify(
      (query: Knex.QueryBuilder): void => {
        if (options.search) {
          query.andWhere(
            db.raw('(product_designs.title ~* :search)', {
              search: options.search
            })
          );
        }
      }
    )
    .modify(limitOrOffset(options.limit, options.offset));

  return result.map((row: any): ProductDesign => new ProductDesign(row));
}

export async function findAllDesignIdsThroughCollaborator(
  userId: string
): Promise<string[]> {
  const result = await db.raw(
    `
SELECT d1.id
	FROM product_designs as d1
	JOIN collaborators AS c1 ON c1.design_id = d1.id
	WHERE c1.user_id = ?
		AND (c1.cancelled_at IS NULL OR c1.cancelled_at > now())
		AND d1.deleted_at IS NULL
UNION
SELECT d2.id
	FROM collaborators AS c2
	JOIN collections AS co ON co.id = c2.collection_id
	JOIN collection_designs AS cd ON cd.collection_id = co.id
	JOIN product_designs as d2 ON d2.id = cd.design_id
	WHERE c2.user_id = ?
		AND (c2.cancelled_at IS NULL OR c2.cancelled_at > now())
		AND co.deleted_at IS NULL
		AND d2.deleted_at IS NULL
    `,
    [userId, userId]
  );

  return result.rows.map((row: any) => row.id);
}

export async function findDesignByAnnotationId(
  annotationId: string
): Promise<ProductDesignData | null> {
  const result = await db.raw(
    `
SELECT designs.* FROM ${TABLE_NAME} AS designs
INNER JOIN product_design_canvases AS canvases ON canvases.design_id = designs.id
INNER JOIN product_design_canvas_annotations AS annotations ON annotations.canvas_id = canvases.id
WHERE annotations.id = ?
AND annotations.deleted_at IS null
AND designs.deleted_at IS null
ORDER BY canvases.ordering ASC
  `,
    [annotationId]
  );
  const row = first<ProductDesignRow>(result.rows);

  if (!row) {
    return null;
  }

  return validate<ProductDesignRow, ProductDesignData>(
    TABLE_NAME,
    isProductDesignRow,
    dataAdapter,
    row
  );
}

export async function findDesignByTaskId(
  taskId: string
): Promise<ProductDesignData | null> {
  const result = await db.raw(
    `
SELECT designs.* FROM ${TABLE_NAME} AS designs
INNER JOIN product_design_stages AS stages ON stages.design_id = designs.id
INNER JOIN product_design_stage_tasks AS tasks ON tasks.design_stage_id = stages.id
WHERE tasks.task_id = ?
AND designs.deleted_at IS null
  `,
    [taskId]
  );
  const row = first<ProductDesignRow>(result.rows);

  if (!row) {
    return null;
  }

  return validate<ProductDesignRow, ProductDesignData>(
    TABLE_NAME,
    isProductDesignRow,
    dataAdapter,
    row
  );
}

module.exports = {
  findAllDesignIdsThroughCollaborator,
  findAllDesignsThroughCollaborator,
  findDesignByAnnotationId,
  findDesignByTaskId
};
