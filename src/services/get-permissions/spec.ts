import * as uuid from 'node-uuid';
import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');

import * as CollectionsDAO from '../../dao/collections';
import * as CollaboratorsDAO from '../../dao/collaborators';
import * as PermissionsService from './index';

test('#getCollectionPermissions', async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { user: user2, session: session2 } = await createUser();

  const collection1 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'C1'
  });
  const collection2 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'C2'
  });
  const collection3 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'C3'
  });
  const collection4 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'C4'
  });
  await CollaboratorsDAO.create({
    collectionId: collection1.id,
    role: 'EDIT',
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection1.id,
    role: 'COMMENT',
    userId: user2.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection2.id,
    role: 'VIEW',
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection4.id,
    role: 'VIEW',
    userId: user.id
  });

  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection1, session, user.id),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canManagePricing: true,
      canModifyServices: true,
      canSubmit: true,
      canView: true,
      canViewPricing: true
    },
    'Returns all access permissions for the collection the user created.'
  );
  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection1, session2, user2.id),
    {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canManagePricing: false,
      canModifyServices: false,
      canSubmit: false,
      canView: true,
      canViewPricing: false
    },
    'Returns comment permissions for the collection the user is a commenter on.'
  );
  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection2, session, user.id),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canManagePricing: false,
      canModifyServices: false,
      canSubmit: false,
      canView: true,
      canViewPricing: false
    },
    'Returns edit access permissions for the collection the user is a edit collaborarotor on.'
  );
  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection4, session, user.id),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canManagePricing: false,
      canModifyServices: false,
      canSubmit: false,
      canView: true,
      canViewPricing: false
    },
    'Returns view access permissions for the collection the user is a view collaborarotor on.'
  );
  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection3, session, user.id),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canManagePricing: false,
      canModifyServices: false,
      canSubmit: false,
      canView: false,
      canViewPricing: false
    },
    'Returns no access permissions for the collection the user does not have access to.'
  );
});
