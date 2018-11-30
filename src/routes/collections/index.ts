import * as Router from 'koa-router';
import * as Koa from 'koa';

import { CALA_ADMIN_USER_ID } from '../../config';

import filterError = require('../../services/filter-error');

import InvalidDataError = require('../../errors/invalid-data');

import {
  canAccessCollectionInParam,
  canDeleteCollection,
  canEditCollection,
  canSubmitCollection
} from '../../middleware/can-access-collection';
import canAccessUserResource = require('../../middleware/can-access-user-resource');
import requireAuth = require('../../middleware/require-auth');

import * as CollectionsDAO from '../../dao/collections';
import * as CollaboratorsDAO from '../../dao/collaborators';
import Collection, { isCollection, isPartialCollection } from '../../domain-objects/collection';
import { createSubmission, getSubmissionStatus } from './submissions';
import { deleteDesign, getCollectionDesigns, putDesign } from './designs';
import { getCollectionPermissions, Permissions } from '../../services/get-permissions';

const router = new Router();

interface CollectionWithPermissions extends Collection {
  permissions: Permissions;
}

function* createCollection(
  this: Koa.Application.Context
): AsyncIterableIterator<CollectionWithPermissions> {
  const { body } = this.request;
  const { role, userId } = this.state;
  const data = { ...body, deletedAt: null, createdBy: userId };

  if (data && isCollection(data)) {
    const collection = yield CollectionsDAO
      .create(data)
      .catch(filterError(InvalidDataError, (err: InvalidDataError) => this.throw(400, err)));

    if (!CALA_ADMIN_USER_ID) { throw new Error('Cala Admin user not set'); }

    yield CollaboratorsDAO.create({
      collectionId: collection.id,
      designId: null,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: null,
      userId
    });
    yield CollaboratorsDAO.create({
      collectionId: collection.id,
      designId: null,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: null,
      userId: CALA_ADMIN_USER_ID
    });
    const permissions = yield getCollectionPermissions(collection, role, userId);

    this.body = { ...collection, permissions };
    this.status = 201;
  } else {
    this.throw(400, 'Request does not match Collection');
  }
}

function* getList(
  this: Koa.Application.Context
): AsyncIterableIterator<CollectionWithPermissions[]> {
  const { userId } = this.query;
  const { role, userId: currentUserId } = this.state;

  const userIdToQuery = role === 'ADMIN'
    ? userId
    : currentUserId === userId
      ? currentUserId
      : null;

  if (userIdToQuery) {
    const collections = yield CollectionsDAO.findByCollaboratorAndUserId(userIdToQuery);
    const collectionsWithPermissions = yield Promise.all(collections.map(
      async (collection: Collection): Promise<CollectionWithPermissions> => {
        const permissions = await getCollectionPermissions(collection, role, userIdToQuery);
        return { ...collection, permissions };
      }
    ));
    this.body = collectionsWithPermissions;
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

function* getCollection(
  this: Koa.Application.Context
): AsyncIterableIterator<CollectionWithPermissions> {
  const { collectionId } = this.params;
  const { role, userId } = this.state;

  if (collectionId) {
    const collection = yield CollectionsDAO.findById(collectionId);
    const permissions = yield getCollectionPermissions(collection, role, userId);
    this.body = { ...collection, permissions };
    this.status = 200;
  } else {
    this.throw(400, 'CollectionId is required!');
  }
}

function* updateCollection(this: Koa.Application.Context): AsyncIterableIterator<Collection> {
  const { collectionId } = this.params;
  const { body } = this.request;
  const { role, userId } = this.state;

  if (body && isPartialCollection(body)) {
    const collection = yield CollectionsDAO
      .update(collectionId, body)
      .catch(filterError(InvalidDataError, (err: InvalidDataError) => this.throw(400, err)));
    const permissions = yield getCollectionPermissions(collection, role, userId);

    this.body = { ...collection, permissions };
    this.status = 200;
  } else {
    this.throw(400, 'Request to update does not match Collection');
  }
}

router.post('/', requireAuth, createCollection);
router.get('/', requireAuth, getList);

router.del(
  '/:collectionId',
  requireAuth,
  canAccessCollectionInParam,
  canDeleteCollection,
  deleteCollection
);
router.get(
  '/:collectionId',
  requireAuth,
  canAccessCollectionInParam,
  getCollection
);
router.patch(
  '/:collectionId',
  requireAuth,
  canAccessCollectionInParam,
  canEditCollection,
  updateCollection
);

router.post(
  '/:collectionId/submissions',
  requireAuth,
  canAccessCollectionInParam,
  canSubmitCollection,
  createSubmission
);
router.get(
  '/:collectionId/submissions',
  requireAuth,
  canAccessCollectionInParam,
  getSubmissionStatus
);

router.get(
  '/:collectionId/designs',
  requireAuth,
  canAccessCollectionInParam,
  getCollectionDesigns
);
router.del(
  '/:collectionId/designs/:designId',
  requireAuth,
  canAccessCollectionInParam,
  canEditCollection,
  deleteDesign
);
router.put(
  '/:collectionId/designs/:designId',
  requireAuth,
  canAccessCollectionInParam,
  canEditCollection,
  putDesign
);

export = router.routes();
