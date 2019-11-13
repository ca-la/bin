import * as Router from 'koa-router';
import * as Koa from 'koa';

import { hasProperties } from '../../services/require-properties';
import requireAuth = require('../../middleware/require-auth');

import ComponentRelationship from './domain-object';
import * as ComponentRelationshipsDAO from './dao';
import { typeGuard } from '../../middleware/type-guard';
import {
  canEditComponentsInBody,
  canEditComponentsInRelationshipParam,
  canViewComponentInQueryParam
} from '../../middleware/can-access-component';

const router = new Router();

function isComponentRelationship(data: object): data is ComponentRelationship {
  return hasProperties(
    data,
    'createdAt',
    'createdBy',
    'deletedAt',
    'id',
    'processId',
    'relativeX',
    'relativeY',
    'sourceComponentId',
    'targetComponentId'
  );
}

function* getList(this: Koa.Application.Context): IterableIterator<any> {
  const { componentId } = this.query;

  if (componentId) {
    const relationships = yield ComponentRelationshipsDAO.findAllByComponent(
      componentId
    );
    this.status = 200;
    this.body = relationships;
  } else {
    this.throw(400, 'A componentId must be passed into the query parameters!');
  }
}

function* getById(this: Koa.Application.Context): IterableIterator<any> {
  const relationship = yield ComponentRelationshipsDAO.findById(
    this.params.relationshipId
  );

  this.assert(
    relationship,
    404,
    `Component with id ${this.params.relationshipId} not found`
  );

  this.status = 200;
  this.body = relationship;
}

function* create(
  this: Koa.Application.Context<ComponentRelationship>
): IterableIterator<any> {
  const { body } = this.request;

  const componentRelationship = yield ComponentRelationshipsDAO.create(body);
  this.status = 200;
  this.body = componentRelationship;
}

function* update(
  this: Koa.Application.Context<ComponentRelationship>
): IterableIterator<any> {
  const { body } = this.request;
  const relationship = yield ComponentRelationshipsDAO.update(
    this.params.relationshipId,
    body
  );
  this.status = 200;
  this.body = relationship;
}

function* del(this: Koa.Application.Context): IterableIterator<any> {
  yield ComponentRelationshipsDAO.del(this.params.relationshipId);
  this.status = 204;
}

router.get('/', requireAuth, canViewComponentInQueryParam, getList);
router.get('/:relationshipId', requireAuth, getById);
router.put(
  '/:relationshipId',
  requireAuth,
  typeGuard<ComponentRelationship>(isComponentRelationship),
  canEditComponentsInBody,
  create
);
router.patch(
  '/:relationshipId',
  requireAuth,
  typeGuard<ComponentRelationship>(isComponentRelationship),
  canEditComponentsInRelationshipParam,
  update
);
router.del(
  '/:relationshipId',
  requireAuth,
  canEditComponentsInRelationshipParam,
  del
);

export default router.routes();
