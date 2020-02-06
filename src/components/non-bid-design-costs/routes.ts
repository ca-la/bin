import Router from 'koa-router';
import Knex from 'knex';

import db from '../../services/db';
import requireAdmin = require('../../middleware/require-admin');
import * as NonBidDesignCostsDAO from './dao';
import { NonBidDesignCost } from './domain-object';
import { hasProperties } from '@cala/ts-lib';

const router = new Router();

function isCreateBody(
  candidate: object | undefined
): candidate is Unsaved<NonBidDesignCost> {
  return candidate
    ? hasProperties(candidate, 'designId', 'cents', 'note', 'category')
    : false;
}

function* createCost(
  this: AuthedContext<Unsaved<NonBidDesignCost>>
): Iterator<any, any, any> {
  if (!isCreateBody(this.request.body)) {
    this.throw(400, 'Request does not match NonBidDesignCost');
  }

  const { userId } = this.state;

  const created = yield db.transaction(async (trx: Knex.Transaction) =>
    NonBidDesignCostsDAO.create(trx, {
      ...this.request.body,
      createdBy: userId
    })
  );

  this.body = created;
  this.status = 201;
}

interface GetListQuery {
  designId?: string;
}

function* listCosts(this: AuthedContext): Iterator<any, any, any> {
  const { designId }: GetListQuery = this.query;

  if (!designId) {
    this.throw(400, 'You must specifiy a design ID');
  }

  const byDesign = yield db.transaction(async (trx: Knex.Transaction) =>
    NonBidDesignCostsDAO.findByDesign(trx, designId)
  );

  this.body = byDesign;
  this.status = 200;
}

router.post('/', requireAdmin, createCost);
router.get('/', requireAdmin, listCosts);

export default router.routes();
