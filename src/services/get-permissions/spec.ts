import * as uuid from 'node-uuid';
import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');

import * as CollectionsDAO from '../../dao/collections';
import * as CollaboratorsDAO from '../../dao/collaborators';
import * as DesignsDAO from '../../dao/product-designs';
import * as PermissionsService from './index';

test('#getDesignPermissions', async (t: tape.Test) => {
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

  const design1 = await DesignsDAO.create({
    productType: 'TEE',
    title: 'My Tee',
    userId: user.id
  });
  await CollectionsDAO.moveDesign(collection1.id, design1.id);

  const design2 = await DesignsDAO.create({
    productType: 'PANT',
    title: 'My Pant',
    userId: user2.id
  });
  const design3 = await DesignsDAO.create({
    productType: 'JACKET',
    title: 'Bomber Jacket',
    userId: user2.id
  });
  const design4 = await DesignsDAO.create({
    productType: 'WOVENS',
    title: 'Oversize Hoodie',
    userId: user2.id
  });
  await CollectionsDAO.moveDesign(collection2.id, design4.id);

  await CollaboratorsDAO.create({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: null,
    designId: design2.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: '',
    role: 'COMMENT',
    userEmail: null,
    userId: user2.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: '',
    role: 'VIEW',
    userEmail: null,
    userId: user.id
  });

  t.deepEqual(
    await PermissionsService.getDesignPermissions(design1, session, user.id),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canSubmit: true,
      canView: true
    },
    'Returns all access permissions for the design the user created.'
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions(design1, session2, user2.id),
    {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canSubmit: false,
      canView: true
    },
    'Returns comment permissions for the design the user is a collection-level commenter on.'
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions(design2, session, user.id),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canSubmit: false,
      canView: true
    },
    'Returns edit access permissions for the design the user is an edit collaborator on.'
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions(design4, session, user.id),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canSubmit: false,
      canView: true
    },
    'Returns view access permissions for the design the user is a view collaborator on.'
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions(design3, session, user.id),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canSubmit: false,
      canView: false
    },
    'Returns no access permissions for the collection the user does not have access to.'
  );
});

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
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: '',
    role: 'COMMENT',
    userEmail: null,
    userId: user2.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: '',
    role: 'VIEW',
    userEmail: null,
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection4.id,
    designId: null,
    invitationMessage: '',
    role: 'VIEW',
    userEmail: null,
    userId: user.id
  });

  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection1, session, user.id),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canSubmit: true,
      canView: true
    },
    'Returns all access permissions for the collection the user created.'
  );
  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection1, session2, user2.id),
    {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canSubmit: false,
      canView: true
    },
    'Returns comment permissions for the collection the user is a commenter on.'
  );
  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection2, session, user.id),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canSubmit: false,
      canView: true
    },
    'Returns edit access permissions for the collection the user is a edit collaborator on.'
  );
  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection4, session, user.id),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canSubmit: false,
      canView: true
    },
    'Returns view access permissions for the collection the user is a view collaborator on.'
  );
  t.deepEqual(
    await PermissionsService.getCollectionPermissions(collection3, session, user.id),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canSubmit: false,
      canView: false
    },
    'Returns no access permissions for the collection the user does not have access to.'
  );
});

test('#getCollectionPermissions', async (t: tape.Test) => {
  t.equal(
    PermissionsService.findMostPermissiveRole(
      ['VIEW', 'PREVIEW', 'VIEW', 'EDIT', 'EDIT', 'PARTNER']
    ),
    'EDIT',
    'Finds the most permissive role in the list'
  );
  t.equal(
    PermissionsService.findMostPermissiveRole(
      ['VIEW', 'VIEW', 'VIEW', 'COMMENT', 'VIEW', 'COMMENT']
    ),
    'COMMENT',
    'Finds the most permissive role in the list'
  );
  t.equal(
    PermissionsService.findMostPermissiveRole(['ADFFD', 'DDD', 'FOO', 'BAR']),
    undefined,
    'Returns undefined if the list is malformed'
  );
  t.equal(
    PermissionsService.findMostPermissiveRole([]),
    undefined,
    'Returns undefined if the list is empty'
  );
});
