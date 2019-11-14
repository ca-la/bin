import Router from 'koa-router';
import Koa from 'koa';
import Knex from 'knex';

import db from '../../../services/db';
import { getAll, remove, removeList } from './dao';
import requireAdmin = require('../../../middleware/require-admin');
import InvalidDataError = require('../../../errors/invalid-data');
import requireAuth = require('../../../middleware/require-auth');
import { createDesignTemplates } from '../services/create-design-template';
import ResourceNotFoundError from '../../../errors/resource-not-found';
import ProductDesign = require('../../product-designs/domain-objects/product-design');

const router = new Router();

function* createTemplates(
  this: Koa.Application.Context
): Iterator<any, any, any> {
  const { designIds } = this.query;

  if (!designIds) {
    return this.throw(400, 'designIds not defined');
  }

  const templatedDesigns: ProductDesign[] = yield createDesignTemplates(
    designIds.split(',')
  ).catch((error: Error) => {
    if (error instanceof InvalidDataError) {
      return this.throw(400, error.message);
    }

    if (error instanceof ResourceNotFoundError) {
      return this.throw(404, error.message);
    }

    return this.throw(500, error.message);
  });

  this.status = 201;
  this.body = templatedDesigns;
}

function* createTemplate(
  this: Koa.Application.Context
): Iterator<any, any, any> {
  const { designId } = this.params;

  const designs = yield createDesignTemplates([designId]).catch(
    (error: Error) => {
      if (error instanceof InvalidDataError) {
        return this.throw(400, error.message);
      }

      if (error instanceof ResourceNotFoundError) {
        return this.throw(404, error.message);
      }

      return this.throw(500, error.message);
    }
  );

  this.status = 201;
  this.body = designs[0];
}

function* removeTemplates(
  this: Koa.Application.Context
): Iterator<any, any, any> {
  const { designIds } = this.query;

  if (!designIds) {
    return this.throw(400, 'designIds not defined');
  }

  yield db.transaction(async (trx: Knex.Transaction) => {
    await removeList(designIds.split(','), trx).catch((error: Error) => {
      if (error instanceof InvalidDataError) {
        return this.throw(404, error.message);
      }
      return this.throw(500, error.message);
    });

    this.status = 204;
  });
}

function* removeTemplate(
  this: Koa.Application.Context
): Iterator<any, any, any> {
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

interface ListQueryParameters {
  limit?: number;
  offset?: number;
}

function* listTemplates(
  this: Koa.Application.Context
): Iterator<any, any, any> {
  const { limit, offset }: ListQueryParameters = this.query;

  yield db.transaction(async (trx: Knex.Transaction) => {
    const templates = await getAll(trx, {
      limit: Number(limit) || 20,
      offset: Number(offset) || 0
    });
    this.status = 200;
    this.body = templates;
  });
}

router.put('/', requireAdmin, createTemplates);
router.del('/', requireAdmin, removeTemplates);
router.put('/:designId', requireAdmin, createTemplate);
router.del('/:designId', requireAdmin, removeTemplate);
router.get('/', requireAuth, listTemplates);

export default router.routes();
