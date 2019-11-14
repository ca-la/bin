import Knex from 'knex';
import { map } from 'lodash';

import db from '../../../services/db';
import Logger = require('../../../services/logger');

interface WithIds {
  id: string;
}

function isRowsOfIds(candidate: any): candidate is WithIds[] {
  return (
    candidate !== null &&
    Array.isArray(candidate) &&
    candidate.every((data: { id?: any }) => typeof data.id === 'string') &&
    candidate.length > 0
  );
}

/**
 * Rolls back a collection that was submitted to a pre-submission state.
 */
export async function reverseSubmissionRecords(
  collectionId?: string
): Promise<void> {
  if (!collectionId) {
    throw new Error('Usage: reverse-collection-submission.ts [collection ID]');
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    const designEvents = await db
      .select('id')
      .from('design_events')
      .whereIn('design_id', (query: Knex.QueryBuilder) => {
        query
          .select('design_id')
          .from('collection_designs')
          .where({ collection_id: collectionId });
      })
      .andWhereRaw(
        "(design_events.type = 'SUBMIT_DESIGN' OR design_events.type = 'COMMIT_COST_INPUTS')"
      )
      .transacting(trx);

    if (!isRowsOfIds(designEvents)) {
      throw new Error(`No design events found for collection ${collectionId}`);
    }

    const designEventsDeleted: number = await db
      .del()
      .from('design_events')
      .whereIn('id', map(designEvents, 'id'))
      .transacting(trx);
    Logger.log(`Deleted ${designEventsDeleted} design events`);

    if (designEventsDeleted !== designEvents.length) {
      throw new Error(
        'Removed a different number of design events than expected. Rolling back transaction!'
      );
    }

    Logger.log('Success!');
  });
}
