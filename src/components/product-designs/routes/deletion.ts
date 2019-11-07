import * as Koa from 'koa';
import * as Knex from 'knex';

import { deleteByIds } from '../dao/dao';
import db = require('../../../services/db');

export function* deleteDesign(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { designId } = this.params;

  yield db.transaction(async (trx: Knex.Transaction) => {
    await deleteByIds({ designIds: [designId], trx });
  });

  this.status = 204;
}

export function* deleteDesigns(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { designIds } = this.query;

  if (!designIds) {
    return this.throw(400, `designIds are required in the query parameters!`);
  }

  yield db.transaction(async (trx: Knex.Transaction) => {
    await deleteByIds({ designIds: designIds.split(','), trx });
  });

  this.status = 204;
}
