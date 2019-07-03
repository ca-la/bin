import * as uuid from 'node-uuid';

import * as CollaboratorsDAO from './dao';
import * as CollectionsDAO from '../../dao/collections';
import ProductDesignsDAO = require('../../dao/product-designs');

import createUser = require('../../test-helpers/create-user');
import { test, Test } from '../../test-helpers/fresh';
import createDesign from '../../services/create-design';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import generateCollection from '../../test-helpers/factories/collection';
import Collaborator from './domain-objects/collaborator';

test('Collaborators DAO can find all collaborators with a list of ids', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: 'BOMBER',
    title: 'RAF RAF RAF PARKA',
    userId: user.id
  });

  const { collaborator: c1 } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: 'Come see my cool bomber',
    role: 'EDIT',
    userEmail: null,
    userId: user2.id
  });
  const { collaborator: c2 } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: 'Come see my cool bomber',
    role: 'EDIT',
    userEmail: 'rick@rickowens.eu',
    userId: null
  });
  await CollaboratorsDAO.deleteById(c2.id);

  t.deepEqual(
    await CollaboratorsDAO.findAllByIds([c1.id, c2.id]),
    [c1],
    'Returns all non-deleted collaborators'
  );
});

test('CollaboratorsDAO.findByDesign returns design and collection collaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });
  const { user: user3 } = await createUser({ withSession: false });
  const { user: user4 } = await createUser({ withSession: false });
  const { user: user5 } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: 'BOMBER',
    title: 'AW19',
    userId: user.id
  });
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: '',
    id: uuid.v4(),
    title: 'AW19'
  });

  await CollectionsDAO.addDesign(collection.id, design.id);

  const { collaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user2.id
  });
  const { collaborator: collectionCollaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user3.id
  });
  const {
    collaborator: cancelledCollectionCollaborator
  } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    cancelledAt: new Date(),
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user4.id
  });
  const {
    collaborator: cancelledDesignCollaborator
  } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    cancelledAt: new Date(),
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user5.id
  });

  const list = await CollaboratorsDAO.findByDesign(design.id);
  const ids = list.map((c: Collaborator) => c.id);
  t.equal(list.length, 3);
  t.true(ids.includes(collaborator.id), 'includes design collabortor');
  t.true(
    ids.includes(collectionCollaborator.id),
    'includes collection collaborator'
  );
  t.false(
    ids.includes(cancelledCollectionCollaborator.id),
    'does not include cancelled collection collaborator'
  );
  t.false(
    ids.includes(cancelledDesignCollaborator.id),
    'does not include cancelled design collaborator'
  );
});

test('CollaboratorsDAO.create throws invalid data error', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const invalidId = uuid.v4();
  const design = await createDesign({
    productType: 'BOMBER',
    title: 'AW19',
    userId: user.id
  });

  await generateCollaborator({
    collectionId: null,
    designId: invalidId,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  })
    .then(() => t.fail('Expected error'))
    .catch((err: Error) => {
      t.equal(err.message, `Invalid design ID: ${invalidId}`);
    });
  await generateCollaborator({
    collectionId: invalidId,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  })
    .then(() => t.fail('Expected error'))
    .catch((err: Error) => {
      t.equal(err.message, `Invalid collection ID: ${invalidId}`);
    });
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: invalidId
  })
    .then(() => t.fail('Expected error'))
    .catch((err: Error) => {
      t.equal(err.message, `Invalid user ID: ${invalidId}`);
    });
});

test('CollaboratorsDAO.findByDesign returns collection collaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const data = await createUser({ withSession: false });
  const user2 = data.user;

  const design = await createDesign({
    productType: 'BOMBER',
    title: 'AW19',
    userId: user.id
  });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: '',
    id: uuid.v4(),
    title: 'AW19'
  });

  await CollectionsDAO.addDesign(collection.id, design.id);

  const { collaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user2.id
  });

  const list = await CollaboratorsDAO.findByDesign(design.id);
  t.equal(list.length, 2);
  t.equal(list[1].id, collaborator.id);
});

test('CollaboratorsDAO.findByCollection returns collaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });

  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const list = await CollaboratorsDAO.findByCollection(collection.id);
  t.equal(list.length, 1);
  t.equal(list[0].id, collaborator.id);
});

test('CollaboratorsDAO.findByDesigns', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });
  const { user: userThree } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: 'BOMBER',
    title: 'AW19',
    userId: user.id
  });
  const dOneCollaborators = await CollaboratorsDAO.findByDesign(design.id);

  const expectedInitialCollaborator = {
    ...dOneCollaborators[0],
    user: { id: user.id, name: user.name, email: user.email }
  };

  const results = await CollaboratorsDAO.findByDesigns([design.id]);
  t.deepEqual(
    results,
    [
      {
        collaborators: [expectedInitialCollaborator],
        designId: design.id
      }
    ],
    'Returns the only collaborator for the design'
  );

  const { collaborator } = await generateCollaborator({
    designId: design.id,
    userEmail: 'foo@example.com'
  });
  const expectedSecondCollaborator = {
    ...collaborator,
    user: null
  };

  const resultsTwo = await CollaboratorsDAO.findByDesigns([design.id]);
  t.deepEqual(
    resultsTwo,
    [
      {
        collaborators: [
          expectedSecondCollaborator,
          expectedInitialCollaborator
        ],
        designId: design.id
      }
    ],
    'Returns both collaborators for the design'
  );

  // create a collection.
  const { collection, createdBy } = await generateCollection();

  // add initial design to the new collection.
  await CollectionsDAO.addDesign(collection.id, design.id);

  // create another design by the main test user for the new collection.
  const designTwo = await createDesign({
    productType: 'PANTS',
    title: 'AW19',
    userId: user.id
  });
  await CollectionsDAO.addDesign(collection.id, designTwo.id);
  const dTwoCollaborators = await CollaboratorsDAO.findByDesign(designTwo.id);

  // create a third design by a secondary user for the main collection.
  const designThree = await createDesign({
    productType: 'BOOTS',
    title: 'Studded Military Boots',
    userId: userTwo.id
  });
  await CollectionsDAO.addDesign(collection.id, designThree.id);
  // add in a random collaborator on the third design.
  await generateCollaborator({
    designId: designThree.id,
    userId: userThree.id
  });

  // make the creator of the collection a collaborator.
  const { collaborator: collectionCollaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: createdBy.id
  });

  const expectedDTwoCollaboratorOne = {
    ...dTwoCollaborators[0],
    user: { id: user.id, name: user.name, email: user.email }
  };
  const expectedDTwoCollaboratorTwo = {
    ...collectionCollaborator,
    user: { id: createdBy.id, name: createdBy.name, email: createdBy.email }
  };

  const resultsThree = await CollaboratorsDAO.findByDesigns([
    designTwo.id,
    design.id
  ]);
  t.deepEqual(
    resultsThree,
    [
      {
        collaborators: [
          expectedDTwoCollaboratorTwo,
          expectedDTwoCollaboratorOne
        ],
        designId: designTwo.id
      },
      {
        collaborators: [
          expectedDTwoCollaboratorTwo,
          expectedSecondCollaborator,
          expectedInitialCollaborator
        ],
        designId: design.id
      }
    ],
    'Returns collection and design collaborators for the designs'
  );
});

test('CollaboratorsDAO.findByCollectionAndUser returns collaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });

  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const list = await CollaboratorsDAO.findByCollectionAndUser(
    collection.id,
    user.id
  );

  t.equal(list.length, 1);
  t.equal(list[0].id, collaborator.id);
});

test('CollaboratorsDAO.deleteByDesignIdAndUserId deletes collaborator', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'A product design',
    userId: user.id
  });

  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  await CollaboratorsDAO.deleteByDesignAndUser(design.id, user.id);

  const collaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    user.id
  );

  t.deepEqual(collaborator, null);
});

test('findAllForUserThroughDesign can find all collaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const { collection } = await generateCollection();
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'A product design',
    userId: user.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);

  const { collaborator: collaboratorOne } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  const { collaborator: collaboratorTwo } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'VIEW',
    userEmail: null,
    userId: user.id
  });

  const result = await CollaboratorsDAO.findAllForUserThroughDesign(
    design.id,
    user.id
  );

  t.deepEqual(result, [collaboratorTwo, collaboratorOne]);

  await CollectionsDAO.deleteById(collection.id);

  const resultTwo = await CollaboratorsDAO.findAllForUserThroughDesign(
    design.id,
    user.id
  );

  t.deepEqual(resultTwo, [collaboratorOne]);

  await CollectionsDAO.removeDesign(collection.id, design.id);

  const resultThree = await CollaboratorsDAO.findAllForUserThroughDesign(
    design.id,
    user.id
  );

  t.deepEqual(resultThree, [collaboratorOne]);
});

test('cancelForDesignAndPartner cancels the preview role', async (t: Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({
    withSession: false,
    role: 'PARTNER'
  });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Helmut Lang Shirt',
    userId: designer.id
  });
  await generateCollaborator({
    designId: design.id,
    role: 'EDIT',
    userId: designer.id
  });
  await generateCollaborator({
    designId: design.id,
    role: 'PREVIEW',
    userId: partner.id
  });

  const updatedCollaborators = await CollaboratorsDAO.cancelForDesignAndPartner(
    design.id,
    partner.id
  );

  t.equal(
    updatedCollaborators.length,
    1,
    'Only returns one cancelled collaborator'
  );
  const cancelledCollaborator = updatedCollaborators[0];

  if (cancelledCollaborator && cancelledCollaborator.cancelledAt) {
    t.true(cancelledCollaborator.cancelledAt <= new Date());
  } else {
    t.fail('Does not have a cancelledAt date');
  }

  const notUpdatedCollaborators = await CollaboratorsDAO.cancelForDesignAndPartner(
    design.id,
    designer.id
  );
  t.deepEqual(notUpdatedCollaborators, [], 'Does not update non-partner roles');
});

test('cancelForDesignAndPartner cancels the partner role', async (t: Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({
    withSession: false,
    role: 'PARTNER'
  });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Helmut Lang Shirt',
    userId: designer.id
  });
  await generateCollaborator({
    designId: design.id,
    role: 'EDIT',
    userId: designer.id
  });
  await generateCollaborator({
    designId: design.id,
    role: 'PARTNER',
    userId: partner.id
  });

  const updatedCollaborators = await CollaboratorsDAO.cancelForDesignAndPartner(
    design.id,
    partner.id
  );

  t.equal(
    updatedCollaborators.length,
    1,
    'Only returns one cancelled collaborator'
  );
  const cancelledCollaborator = updatedCollaborators[0];

  if (cancelledCollaborator && cancelledCollaborator.cancelledAt) {
    t.true(cancelledCollaborator.cancelledAt <= new Date());
  } else {
    t.fail('Does not have a cancelledAt date');
  }

  const notUpdatedCollaborators = await CollaboratorsDAO.cancelForDesignAndPartner(
    design.id,
    designer.id
  );
  t.deepEqual(notUpdatedCollaborators, [], 'Does not update non-partner roles');
});

test('CollaboratorsDAO.update', async (t: Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { user: friend } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'A product design',
    userId: designer.id
  });
  const { collaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: friend.email,
    userId: null
  });

  const validUpdate = await CollaboratorsDAO.update(collaborator.id, {
    role: 'VIEW',
    userEmail: null,
    userId: friend.id
  });
  t.deepEqual(validUpdate, {
    ...collaborator,
    role: 'VIEW',
    user: friend,
    userEmail: null,
    userId: friend.id
  });
  CollaboratorsDAO.update(collaborator.id, {
    collectionId: 'foo',
    designId: 'bar',
    invitationMessage: 'baz'
  })
    .then(() => t.fail('Invalid update succeeded'))
    .catch(() => t.pass('Correctly rejected invalid update'));
});

test('CollaboratorsDAO.update with the cancelled_at property', async (t: Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'A product design',
    userId: designer.id
  });
  const now = new Date();
  const tomorrow = new Date(now.setDate(now.getDate() + 1));
  const { collaborator } = await generateCollaborator({
    cancelledAt: tomorrow,
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'PREVIEW',
    userId: partner.id
  });

  const validUpdate = await CollaboratorsDAO.update(collaborator.id, {
    cancelledAt: null,
    role: 'PARTNER'
  });

  t.deepEqual(validUpdate, {
    ...collaborator,
    cancelledAt: null,
    role: 'PARTNER'
  });
});

test('CollaboratorsDAO.update on a cancelled collaborator', async (t: Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'A product design',
    userId: designer.id
  });
  const { collaborator } = await generateCollaborator({
    cancelledAt: new Date('2019-02-02'),
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'PREVIEW',
    userId: partner.id
  });

  try {
    await CollaboratorsDAO.update(collaborator.id, {
      cancelledAt: null,
      role: 'PARTNER'
    });
    t.fail('Should not successfully update!');
  } catch (error) {
    t.equal(error.message, 'Failed to update rows');
  }
});

test('CollaboratorsDAO.findUnclaimedByEmail', async (t: Test) => {
  const { user: designer } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'A product design',
    userId: designer.id
  });
  const newUserEmail = 'new-user@someplace.else';
  const { collaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: newUserEmail,
    userId: null
  });

  t.deepEqual(
    await CollaboratorsDAO.findUnclaimedByEmail(newUserEmail),
    [collaborator],
    'finds the unclaimed invitation'
  );

  await CollaboratorsDAO.deleteById(collaborator.id);

  t.deepEqual(
    await CollaboratorsDAO.findUnclaimedByEmail(newUserEmail),
    [],
    'does not find the deleted invitation'
  );
});
