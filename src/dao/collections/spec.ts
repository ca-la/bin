import * as uuid from 'node-uuid';
import * as tape from 'tape';
import * as CollectionsDAO from './index';
import * as DesignEventsDAO from '../design-events';
import * as ProductDesignsDAO from '../product-designs';
import * as CollaboratorsDAO from '../collaborators';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import ProductDesign = require('../../domain-objects/product-design');

test('CollectionsDAO#create creates a collection', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const one = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });

  t.equal(one.title, 'Drop 001/The Early Years');
  t.equal(one.description, 'Initial commit');
  t.equal(one.createdBy, user.id);
  t.equal(one.deletedAt, null);
});

test('CollectionsDAO#update updates a collection', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const createdCollection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });

  const updatedCollection = await CollectionsDAO.update(
    createdCollection.id,
    { ...createdCollection, description: 'A New Hope' }
  );

  t.deepEqual(updatedCollection.description, 'A New Hope');
});

test('CollectionsDAO#findById does not find deleted collections', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const createdCollection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  await CollectionsDAO.deleteById(createdCollection.id);
  const retrievedCollection = await CollectionsDAO.findById(createdCollection.id);
  t.equal(retrievedCollection, null, 'deleted collection is not returned');
});

test('CollectionsDAO#findByUserId includes referenced user collections', async (t: tape.Test) => {
  const { user: user1 } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });

  const id1 = uuid.v4();
  const id2 = uuid.v4();

  await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user1.id,
    deletedAt: null,
    description: 'Initial commit',
    id: id1,
    title: 'Drop 001/The Early Years'
  });
  await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: 'Another collection',
    id: id2,
    title: 'Drop 002'
  });
  const retrievedCollection = await CollectionsDAO.findByUserId(user1.id);

  t.deepEqual(retrievedCollection[0].id, id1, 'only my collection is returned');
});

test('CollectionsDAO#findByCollaboratorAndUserId finds all collections', async (t: tape.Test) => {
  const { user: user1 } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });

  const id1 = uuid.v4();
  const id2 = uuid.v4();

  const collection1 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user1.id,
    deletedAt: null,
    description: 'Initial commit',
    id: id1,
    title: 'Drop 001/The Early Years'
  });
  const collection2 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: 'Another collection',
    id: id2,
    title: 'Drop 002'
  });
  await CollaboratorsDAO.create({
    collectionId: collection1.id,
    role: 'EDIT',
    userId: user1.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection2.id,
    role: 'VIEW',
    userId: user1.id
  });

  const collections = await CollectionsDAO.findByCollaboratorAndUserId(user1.id);

  t.deepEqual(collections, [collection2, collection1], 'all collections I can access are returned');
});

test('CollectionsDAO#addDesign adds a design to a collection', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const createdCollection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  const createdDesigns = await Promise.all([
    ProductDesignsDAO.create({
      productType: 'HELMET',
      title: 'Vader Mask',
      userId: user.id
    }),
    ProductDesignsDAO.create({
      productType: 'HELMET',
      title: 'Stormtrooper Helmet',
      userId: user.id
    }),
    ProductDesignsDAO.create({
      productType: 'TEESHIRT',
      title: 'Cat T-shirt',
      userId: user.id
    })
  ]);
  await CollectionsDAO
    .addDesign(createdCollection.id, createdDesigns[0].id);
  const collectionDesigns = await CollectionsDAO
    .addDesign(createdCollection.id, createdDesigns[1].id);

  t.deepEqual(
    collectionDesigns.map((design: ProductDesign) => design.id).sort(),
    createdDesigns
      .slice(0, 2)
      .map((design: ProductDesign) => design.id)
      .sort(),
    'returns only designs added to this collection'
  );
});

test('CollectionsDAO#moveDesign moves designs to different collections', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const createdCollectionOne = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'Raf Raf Raf'
  });
  const createdCollectionTwo = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: '2CoolForSkool',
    id: uuid.v4(),
    title: 'Hypebeast'
  });
  const createdDesign = await ProductDesignsDAO.create({
    description: 'Blade Runner x Raf',
    productType: 'PARKA',
    title: 'Raf Simons Replicant Parka',
    userId: user.id
  });

  const collectionDesigns = await CollectionsDAO.moveDesign(
    createdCollectionOne.id,
    createdDesign.id
  );

  t.deepEqual(
    collectionDesigns.map((design: ProductDesign) => design.id).sort(),
    [createdDesign.id],
    'ensure that the design was added to the collection'
  );

  const collectionDesignsTwo = await CollectionsDAO
    .moveDesign(createdCollectionTwo.id, createdDesign.id);

  t.deepEqual(
    collectionDesignsTwo.map((design: ProductDesign) => design.id).sort(),
    [createdDesign.id],
    'ensure that the design was moved to a new collection'
  );
});

test('CollectionsDAO#removeDesign removes a design from a collection', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const createdCollection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'Raf Raf Raf'
  });
  const createdDesign = await ProductDesignsDAO.create({
    description: 'Black, bold, beautiful',
    productType: 'HELMET',
    title: 'Vader Mask',
    userId: user.id
  });
  const collectionDesigns = await CollectionsDAO.addDesign(
    createdCollection.id,
    createdDesign.id
  );
  const afterRemoveCollectionDesigns = await CollectionsDAO.removeDesign(
    createdCollection.id,
    createdDesign.id
  );

  t.deepEqual(
    collectionDesigns,
    [{ ...createdDesign, collectionIds: [createdCollection.id] }],
    '#add successfully adds the design'
  );
  t.deepEqual(
    afterRemoveCollectionDesigns,
    [],
    '#remove successfully removes the design'
  );
});

test('CollectionsDAO.getStatusById', async (t: tape.Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { user: admin } = await createUser({ withSession: false });

  const createdCollection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  const createdDesigns = await Promise.all([
    ProductDesignsDAO.create({
      productType: 'HELMET',
      title: 'Vader Mask',
      userId: designer.id
    }),
    ProductDesignsDAO.create({
      productType: 'HELMET',
      title: 'Stormtrooper Helmet',
      userId: designer.id
    })
  ]);
  await CollectionsDAO
    .addDesign(createdCollection.id, createdDesigns[0].id);
  await CollectionsDAO
    .addDesign(createdCollection.id, createdDesigns[1].id);
  await ProductDesignsDAO.deleteById(createdDesigns[1].id);

  await DesignEventsDAO.create({
    actorId: designer.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: createdDesigns[0].id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    type: 'SUBMIT_DESIGN'
  });

  const submittedStatus = await CollectionsDAO.getStatusById(createdCollection.id);

  t.deepEqual(submittedStatus, {
    collectionId: createdCollection.id,
    isCosted: false,
    isPaired: false,
    isQuoted: false,
    isSubmitted: true
  });

  await DesignEventsDAO.create({
    actorId: admin.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: createdDesigns[0].id,
    id: uuid.v4(),
    quoteId: null,
    targetId: designer.id,
    type: 'COMMIT_COST_INPUTS'
  });

  const costedStatus = await CollectionsDAO.getStatusById(createdCollection.id);

  t.deepEqual(costedStatus, {
    collectionId: createdCollection.id,
    isCosted: true,
    isPaired: false,
    isQuoted: false,
    isSubmitted: true
  });

  await DesignEventsDAO.create({
    actorId: designer.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: createdDesigns[0].id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    type: 'COMMIT_QUOTE'
  });

  const quotedStatus = await CollectionsDAO.getStatusById(createdCollection.id);

  t.deepEqual(quotedStatus, {
    collectionId: createdCollection.id,
    isCosted: true,
    isPaired: false,
    isQuoted: true,
    isSubmitted: true
  });
});
