import * as Knex from 'knex';
import * as rethrow from 'pg-rethrow';

const TABLE_COLLECTION_DESIGNS = 'collection_designs';

/**
 * Adds all supplied designs to the given collection.
 */
export async function addDesigns(options: {
  collectionId: string;
  designIds: string[];
  trx: Knex.Transaction;
}): Promise<number> {
  const { collectionId, designIds, trx } = options;

  const dataRows = designIds.map((designId: string) => {
    return {
      collection_id: collectionId,
      design_id: designId
    };
  });

  const rows = await trx(TABLE_COLLECTION_DESIGNS)
    .insert(dataRows, '*')
    .catch(rethrow);

  if (rows.length !== designIds.length) {
    throw new Error(
      `Failed to insert the following designs into collection '${collectionId}': ${designIds}`
    );
  }

  return rows.length;
}

/**
 * Moves the supplied designs into the current collection.
 */
export async function moveDesigns(options: {
  collectionId: string;
  designIds: string[];
  trx: Knex.Transaction;
}): Promise<number> {
  const { collectionId, designIds, trx } = options;

  await trx(TABLE_COLLECTION_DESIGNS)
    .whereIn('design_id', designIds)
    .del()
    .catch(rethrow);
  const insertedCount = await addDesigns(options);

  if (designIds.length !== insertedCount) {
    throw new Error(
      `Failed to move the following designs into collection '${collectionId}': ${designIds}`
    );
  }

  return insertedCount;
}

/**
 * Removes all the supplied designs from the given collection.
 */
export async function removeDesigns(options: {
  collectionId: string;
  designIds: string[];
  trx: Knex.Transaction;
}): Promise<number> {
  const { collectionId, designIds, trx } = options;

  const rowCount = await trx(TABLE_COLLECTION_DESIGNS)
    .whereIn('design_id', designIds)
    .andWhere({ collection_id: collectionId })
    .del()
    .catch(rethrow);

  if (rowCount !== designIds.length) {
    throw new Error(
      `Failed to remove the following designs from collection '${collectionId}': ${designIds}`
    );
  }

  return rowCount;
}
