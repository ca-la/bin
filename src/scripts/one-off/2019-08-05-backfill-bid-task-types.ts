import * as Knex from 'knex';
import * as pg from 'pg';
import * as uuid from 'node-uuid';
import * as process from 'process';

import * as db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';
import { taskTypes } from '../../components/tasks/templates/tasks';
import { BidTaskTypeRow } from '../../components/bid-task-types/domain-object';

backfillBidTaskTypes()
  .then(() => {
    log(`${green}Successfully created `);
    process.exit();
  })
  .catch(
    (error: any): void => {
      log(`${red}ERROR:\n${reset}`, error);
      process.exit(1);
    }
  );

/**
 * Adds a BidTaskType for any bids that do not current have one
 */

interface Row {
  id: string;
}

async function backfillBidTaskTypes(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const bidsWithoutTaskTypes: Row[] = await trx
      .select('pricing_bids.id')
      .from('pricing_bids')
      .leftJoin(
        'bid_task_types',
        'bid_task_types.pricing_bid_id',
        'pricing_bids.id'
      )
      .where({
        'bid_task_types.id': null
      });

    if (bidsWithoutTaskTypes.length === 0) {
      throw new Error('All bids have a matching BidTaskType');
    }

    log(
      `Found ${
        bidsWithoutTaskTypes.length
      } bids without corresponding BidTaskTypes`
    );

    /* tslint:disable:variable-name */
    const technicalDesignTaskTypes: pg.QueryResult = await trx
      .insert(
        bidsWithoutTaskTypes.map(
          ({ id: pricing_bid_id }: Row): BidTaskTypeRow => ({
            id: uuid.v4(),
            pricing_bid_id,
            task_type_id: taskTypes.TECHNICAL_DESIGN.id
          })
        )
      )
      .into('bid_task_types');

    if (technicalDesignTaskTypes.rowCount !== bidsWithoutTaskTypes.length) {
      throw new Error(
        'Inserted row count does not match number of bids missing task types'
      );
    }

    const productionTaskTypes: pg.QueryResult = await trx
      .insert(
        bidsWithoutTaskTypes.map(
          ({ id: pricing_bid_id }: Row): BidTaskTypeRow => ({
            id: uuid.v4(),
            pricing_bid_id,
            task_type_id: taskTypes.PRODUCTION.id
          })
        )
      )
      .into('bid_task_types');
    /* tslint:enable:variable-name */

    if (productionTaskTypes.rowCount !== bidsWithoutTaskTypes.length) {
      throw new Error(
        'Inserted row count does not match number of bids missing task types'
      );
    }
  });
}
