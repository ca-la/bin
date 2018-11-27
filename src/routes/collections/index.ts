import * as Router from 'koa-router';
import * as Koa from 'koa';
import { uniqBy } from 'lodash';

import { CALA_ADMIN_USER_ID } from '../../config';

import filterError = require('../../services/filter-error');

import InvalidDataError = require('../../errors/invalid-data');

import {
  canAccessCollectionId,
  canModifyCollectionId
} from '../../middleware/can-access-collection';
import canAccessUserResource = require('../../middleware/can-access-user-resource');
import requireAuth = require('../../middleware/require-auth');

import * as CollectionsDAO from '../../dao/collections';
import * as CollaboratorsDAO from '../../dao/collaborators';
import Collection, { isCollection, isPartialCollection } from '../../domain-objects/collection';
import { createSubmission, getSubmissionStatus } from './submissions';
import { deleteDesign, getCollectionDesigns, putDesign } from './designs';

const router = new Router();

function* createCollection(this: Koa.Application.Context): AsyncIterableIterator<Collection> {
  const { body } = this.request;
  const data = { ...body, deletedAt: null, createdBy: this.state.userId };

  if (data && isCollection(data)) {
    const collection = yield CollectionsDAO
      .create(data)
      .catch(filterError(InvalidDataError, (err: InvalidDataError) => this.throw(400, err)));

    yield CollaboratorsDAO.create({
      collectionId: collection.id,
      role: 'EDIT',
      userId: this.state.userId
    });
    yield CollaboratorsDAO.create({
      collectionId: collection.id,
      role: 'EDIT',
      userId: CALA_ADMIN_USER_ID
    });

    this.body = collection;
    this.status = 201;
  } else {
    this.throw(400, 'Request does not match Collection');
  }
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<Collection[]> {
  const { userId } = this.query;

  if (userId) {
    const ownCollections = yield CollectionsDAO.findByUserId(userId);
    const sharedCollections = yield CollectionsDAO.findByCollaboratorUserId(userId);
    const collections = [...ownCollections, ...sharedCollections];

    this.body = uniqBy(collections, 'id')
      .sort((collectionA: Collection, collectionB: Collection): number => {
        const dateA = new Date(collectionA.createdAt);
        const dateB = new Date(collectionB.createdAt);
        if (dateA < dateB) { return 1; }
        if (dateA > dateB) { return -1; }
        return 0;
      });

    this.status = 200;
  } else {
    this.throw(403, 'UserId is required!');
  }
}

function* deleteCollection(this: Koa.Application.Context): AsyncIterableIterator<void> {
  const { collectionId } = this.params;
  const targetCollection = yield CollectionsDAO.findById(collectionId);
  canAccessUserResource.call(this, targetCollection.createdBy);

  yield CollectionsDAO.deleteById(collectionId);
  this.status = 204;
}

function* getCollection(this: Koa.Application.Context): AsyncIterableIterator<Collection> {
  const { collectionId } = this.params;

  if (collectionId) {
    yield canAccessCollectionId.bind(this, collectionId);
    const collection = yield CollectionsDAO.findById(collectionId);

    this.body = collection;
    this.status = 200;
  } else {
    this.throw(400, 'CollectionId is required!');
  }
}

function* updateCollection(this: Koa.Application.Context): AsyncIterableIterator<Collection> {
  const { collectionId } = this.params;
  const { body } = this.request;
  this.assert(this.state.userId, 403);
  canModifyCollectionId.call(this, collectionId);

  if (body && isPartialCollection(body)) {
    const collection = yield CollectionsDAO
      .update(collectionId, body)
      .catch(filterError(InvalidDataError, (err: InvalidDataError) => this.throw(400, err)));
    this.body = collection;
    this.status = 200;
  } else {
    this.throw(400, 'Request to update does not match Collection');
  }
}

router.post('/', requireAuth, createCollection);
router.get('/', requireAuth, getList);

router.del('/:collectionId', requireAuth, deleteCollection);
router.get('/:collectionId', requireAuth, getCollection);
router.patch('/:collectionId', requireAuth, updateCollection);

router.post('/:collectionId/submissions', requireAuth, createSubmission);
router.get('/:collectionId/submissions', requireAuth, getSubmissionStatus);

router.get('/:collectionId/designs', requireAuth, getCollectionDesigns);
router.del('/:collectionId/designs/:designId', requireAuth, deleteDesign);
router.put('/:collectionId/designs/:designId', requireAuth, putDesign);

export = router.routes();
