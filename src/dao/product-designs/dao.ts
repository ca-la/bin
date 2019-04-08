import db = require('../../services/db');
import ProductDesign = require('../../domain-objects/product-design');

/**
 * Find all designs that the user is a collaborator on.
 */
export async function findAllDesignsThroughCollaborator(userId: string): Promise<ProductDesign[]> {
  const result = await db.raw(`
SELECT * FROM product_designs_with_metadata
WHERE id in (
  SELECT product_designs.id
		FROM product_designs
		JOIN collaborators AS c ON c.design_id = product_designs.id
		WHERE c.user_id = ?
      AND c.deleted_at IS NULL
      AND product_designs.deleted_at IS NULL
	UNION
	SELECT product_designs.id
		FROM collaborators AS c
		JOIN collections AS co ON co.id = c.collection_id
		JOIN collection_designs AS cd ON cd.collection_id = co.id
		JOIN product_designs ON product_designs.id = cd.design_id
		WHERE c.user_id = ?
      AND c.deleted_at IS NULL
			AND co.deleted_at IS NULL
      AND product_designs.deleted_at IS NULL
);
    `, [userId, userId]);

  return result.rows.map((row: any): ProductDesign => new ProductDesign(row));
}

export async function findAllDesignIdsThroughCollaborator(
  userId: string
): Promise<string[]> {
  const result = await db.raw(`
SELECT product_designs.id
	FROM product_designs
	JOIN collaborators AS c ON c.design_id = product_designs.id
	WHERE c.user_id = ?
		AND c.deleted_at IS NULL
		AND product_designs.deleted_at IS NULL
UNION
SELECT product_designs.id
	FROM collaborators AS c
	JOIN collections AS co ON co.id = c.collection_id
	JOIN collection_designs AS cd ON cd.collection_id = co.id
	JOIN product_designs ON product_designs.id = cd.design_id
	WHERE c.user_id = ?
		AND c.deleted_at IS NULL
		AND co.deleted_at IS NULL
		AND product_designs.deleted_at IS NULL
    `, [userId, userId]);

  return result.rows.map((row: any) => row.id);
}

module.exports = {
  findAllDesignIdsThroughCollaborator,
  findAllDesignsThroughCollaborator
};
