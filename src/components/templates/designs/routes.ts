import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as Knex from 'knex';

import requireAdmin = require('../../../middleware/require-admin');
import * as db from '../../../services/db';
import { create } from './dao';
import InvalidDataError = require('../../../errors/invalid-data');

const router = new Router();

function* createTemplate(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { designId } = this.params;

  yield db.transaction(async (trx: Knex.Transaction) => {
    const templateDesign = await create({ designId }, trx).catch(
      (error: Error) => {
        if (error instanceof InvalidDataError) {
          return this.throw(400, error.message);
        }
        return this.throw(500, error.message);
      }
    );
    this.status = 201;
    this.body = templateDesign;
  });
}

router.put('/:designId', requireAdmin, createTemplate);

export default router.routes();
