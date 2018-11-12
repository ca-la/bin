import * as Router from 'koa-router';
import * as Koa from 'koa';

import CollectionService from '../../domain-objects/collection-service';
import {
  create,
  deleteById,
  findAllByCollectionId,
  update
} from '../../dao/collection-services';
import { hasOnlyProperties } from '../../services/require-properties';

import requireAuth = require('../../middleware/require-auth');

const router = new Router();

interface GetListQuery {
  collectionId?: string;
}

function isCollectionService(candidate: object): candidate is CollectionService {
  return hasOnlyProperties(
    candidate,
    'collectionId',
    'createdAt',
    'createdBy',
    'deletedAt',
    'id',
    'needsDesignConsulting',
    'needsFulfillment',
    'needsPackaging'
  );
}

const collectionServiceFromIO = (
  request: CollectionService,
  userId: string
): CollectionService => {
  return {
    ...request,
    createdBy: userId
  };
};

function* createService(this: Koa.Application.Context): AsyncIterableIterator<CollectionService> {
  const body = this.request.body;
  if (body && isCollectionService(body)) {
    const collectionService = yield create(collectionServiceFromIO(body, this.state.userId));
    this.status = 201;
    this.body = collectionService;
  } else {
    this.throw(400, 'Request does not match collection service');
  }
}

function* updateService(this: Koa.Application.Context): AsyncIterableIterator<CollectionService> {
  const body = this.request.body;
  if (body && isCollectionService(body)) {
    const collectionService = yield update(this.params.collectionServiceId, body);
    this.status = 200;
    this.body = collectionService;
  } else {
    this.throw(400, 'Request does not match collection service');
  }
}

function* deleteService(this: Koa.Application.Context): AsyncIterableIterator<CollectionService> {
  const collectionService = yield deleteById(this.params.collectionServiceId);
  if (!collectionService) { this.throw(400, 'Failed to delete the collection service'); }
  this.status = 204;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<CollectionService> {
  const query: GetListQuery = this.query;
  if (!query.collectionId) {
    return this.throw(400, 'Missing collectionId');
  }

  const collectionServices = yield findAllByCollectionId(query.collectionId);
  this.status = 200;
  this.body = collectionServices;
}

router.get('/', requireAuth, getList);
router.put('/:collectionServiceId', requireAuth, createService);
router.patch('/:collectionServiceId', requireAuth, updateService);
router.del('/:collectionServiceId', requireAuth, deleteService);

export = router.routes();
