import Knex from 'knex';

import { deleteByIds } from '../dao/dao';
import db from '../../../services/db';

export function* deleteDesign(this: AuthedContext): Iterator<any, any, any> {
  const { designId } = this.params;

  yield db.transaction(async (trx: Knex.Transaction) => {
    await deleteByIds({ designIds: [designId], trx });
  });

  this.status = 204;
}

export function* deleteDesigns(this: AuthedContext): Iterator<any, any, any> {
  const { designIds } = this.query;

  if (!designIds) {
    this.throw(400, `designIds are required in the query parameters!`);
  }

  yield db.transaction(async (trx: Knex.Transaction) => {
    await deleteByIds({ designIds: designIds.split(','), trx });
  });

  this.status = 204;
}
