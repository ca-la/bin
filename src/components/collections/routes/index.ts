import Router from 'koa-router';

import { CALA_OPS_USER_ID } from '../../../config';
import filterError = require('../../../services/filter-error');
import InvalidDataError from '../../../errors/invalid-data';

import {
  canAccessCollectionInParam,
  canDeleteCollection,
  canEditCollection,
  canSubmitCollection
} from '../../../middleware/can-access-collection';
import canAccessUserResource = require('../../../middleware/can-access-user-resource');
import requireAuth = require('../../../middleware/require-auth');
import requireAdmin = require('../../../middleware/require-admin');

import * as CollectionsDAO from '../dao';
import * as CollaboratorsDAO from '../../collaborators/dao';
import Collection, {
  isCollection,
  isPartialCollection
} from '../domain-object';
import { createSubmission, getSubmissionStatus } from './submissions';
import {
  deleteDesign,
  deleteDesigns,
  getCollectionDesigns,
  putDesign,
  putDesigns
} from './designs';
import {
  getCollectionPermissions,
  Permissions
} from '../../../services/get-permissions';
import { commitCostInputs, createPartnerPairing } from './admin';
import { fetchUncostedWithLabels } from '../services/fetch-with-labels';
import requireSubscription from '../../../middleware/require-subscription';

const router = new Router();

interface CollectionWithPermissions extends Collection {
  permissions: Permissions;
}

function* createCollection(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;
  const { role, userId } = this.state;
  const data = { ...body, deletedAt: null, createdBy: userId };

  if (data && isCollection(data)) {
    const collection = yield CollectionsDAO.create(data).catch(
      filterError(InvalidDataError, (err: InvalidDataError) =>
        this.throw(400, err)
      )
    );

    if (!CALA_OPS_USER_ID) {
      throw new Error('Cala Ops user not set!');
    }

    yield CollaboratorsDAO.create({
      cancelledAt: null,
      collectionId: collection.id,
      designId: null,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: null,
      userId
    });
    yield CollaboratorsDAO.create({
      cancelledAt: null,
      collectionId: collection.id,
      designId: null,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: null,
      userId: CALA_OPS_USER_ID
    });
    const permissions = yield getCollectionPermissions(
      collection,
      role,
      userId
    );

    this.body = { ...collection, permissions };
    this.status = 201;
  } else {
    this.throw(400, 'Request does not match Collection');
  }
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const { userId, isCosted, isSubmitted, limit, offset, search } = this.query;
  const { role, userId: currentUserId } = this.state;
  const userIdToQuery =
    role === 'ADMIN' ? userId : currentUserId === userId ? currentUserId : null;

  if (userIdToQuery) {
    const collections = yield CollectionsDAO.findByCollaboratorAndUserId({
      userId: userIdToQuery,
      limit: Number(limit),
      offset: Number(offset),
      search
    });
    const collectionsWithPermissions = yield Promise.all(
      collections.map(
        async (collection: Collection): Promise<CollectionWithPermissions> => {
          const permissions = await getCollectionPermissions(
            collection,
            role,
            userIdToQuery
          );
          return { ...collection, permissions };
        }
      )
    );
    this.body = collectionsWithPermissions;
    this.status = 200;
  } else if (
    role === 'ADMIN' &&
    isCosted === 'false' &&
    isSubmitted === 'true'
  ) {
    this.body = yield fetchUncostedWithLabels();
    this.status = 200;
  } else {
    this.throw(403, 'Unable to match query');
  }
}

function* deleteCollection(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const targetCollection = yield CollectionsDAO.findById(collectionId);
  canAccessUserResource.call(this, targetCollection.createdBy);

  yield CollectionsDAO.deleteById(collectionId);
  this.status = 204;
}

function* getCollection(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { role, userId } = this.state;

  if (collectionId) {
    const collection = yield CollectionsDAO.findById(collectionId);
    const permissions = yield getCollectionPermissions(
      collection,
      role,
      userId
    );
    this.body = { ...collection, permissions };
    this.status = 200;
  } else {
    this.throw(400, 'CollectionId is required!');
  }
}

function* updateCollection(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { body } = this.request;
  const { role, userId } = this.state;

  if (body && isPartialCollection(body)) {
    const collection = yield CollectionsDAO.update(collectionId, body).catch(
      filterError(InvalidDataError, (err: InvalidDataError) =>
        this.throw(400, err)
      )
    );
    const permissions = yield getCollectionPermissions(
      collection,
      role,
      userId
    );

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
  requireSubscription,
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

// Moving Designs

router.get(
  '/:collectionId/designs',
  requireAuth,
  canAccessCollectionInParam,
  getCollectionDesigns
);
router.put(
  '/:collectionId/designs',
  requireAuth,
  canAccessCollectionInParam,
  putDesigns
);
router.del(
  '/:collectionId/designs',
  requireAuth,
  canAccessCollectionInParam,
  deleteDesigns
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

router.post(
  '/:collectionId/cost-inputs',
  requireAdmin,
  canAccessCollectionInParam,
  commitCostInputs
);
router.post(
  '/:collectionId/partner-pairings',
  requireAdmin,
  canAccessCollectionInParam,
  createPartnerPairing
);

export default router.routes();
