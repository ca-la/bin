import * as Router from 'koa-router';
import * as Koa from 'koa';

import requireAuth = require('../../middleware/require-auth');

import ComponentRelationship from './domain-object';
import * as ComponentRelationshipsDAO from './dao';

const router = new Router();

function* getById(this: Koa.Application.Context): AsyncIterableIterator<ComponentRelationship> {
  const relationship = yield ComponentRelationshipsDAO.findById(this.params.relationshipId);

  this.assert(relationship, 404, `Component with id ${this.params.relationshipId} not found`);

  this.status = 200;
  this.body = relationship;
}

router.get(
  '/:relationshipId',
  requireAuth,
  getById
);

export default router.routes();
