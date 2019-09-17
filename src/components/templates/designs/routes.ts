import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as Knex from 'knex';

import * as db from '../../../services/db';
import { create, getAll, remove } from './dao';
import requireAdmin = require('../../../middleware/require-admin');
import InvalidDataError = require('../../../errors/invalid-data');
import requireAuth = require('../../../middleware/require-auth');

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

function* removeTemplate(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { designId } = this.params;

  yield db.transaction(async (trx: Knex.Transaction) => {
    await remove(designId, trx).catch((error: Error) => {
      if (error instanceof InvalidDataError) {
        return this.throw(404, error.message);
      }
      return this.throw(500, error.message);
    });
    this.status = 204;
  });
}

function* listTemplates(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  yield db.transaction(async (trx: Knex.Transaction) => {
    const templates = await getAll(trx);
    this.status = 200;
    this.body = templates;
  });
}

router.put('/:designId', requireAdmin, createTemplate);
router.del('/:designId', requireAdmin, removeTemplate);
router.get('/', requireAuth, listTemplates);

export default router.routes();
