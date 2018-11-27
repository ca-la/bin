import * as uuid from 'node-uuid';
import CollaboratorsDAO = require('../../dao/collaborators');
import Collection from '../../domain-objects/collection';
import * as CollectionsDAO from '../../dao/collections';
import createUser = require('../../test-helpers/create-user');
import findCollaboratorsByRole from './index';
import ProductDesign = require('../../domain-objects/product-design');
import ProductDesignsDAO = require('../../dao/product-designs');
import User from '../../domain-objects/user';
import { CALA_ADMIN_USER_ID } from '../../config';
import { sandbox, test, Test } from '../../test-helpers/fresh';

async function createResources(): Promise<{
  collection: Collection,
  user: User,
  design: ProductDesign
}> {
  const { user } = await createUser({ withSession: false });
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'We out here',
    id: uuid.v4(),
    title: 'Season 1'
  });

  const design = await ProductDesignsDAO.create({
    description: 'Shirt',
    productType: 'Teeshirt',
    title: 'Tee',
    userId: user.id
  });

  await CollectionsDAO.moveDesign(collection.id, design.id);

  return {
    collection,
    design,
    user
  };
}

test('findCollaboratorsByRole finds the designer', async (t: Test) => {
  const { design, user } = await createResources();
  const ownerCollaborator = await CollaboratorsDAO.create({
    designId: design.id,
    userId: user.id
  });

  const collaborators = await findCollaboratorsByRole(design.id, 'DESIGNER');

  t.equal(collaborators.length, 1);
  t.equal(collaborators[0].id, ownerCollaborator.id);
});

test('findCollaboratorsByRole finds partners', async (t: Test) => {
  const { design } = await createResources();

  const { user: partnerUser } = await createUser({ withSession: false, role: 'PARTNER' });

  const partnerCollaborator = await CollaboratorsDAO.create({
    designId: design.id,
    userId: partnerUser.id
  });

  const collaborators = await findCollaboratorsByRole(design.id, 'PARTNER');

  t.equal(collaborators.length, 1);
  t.equal(collaborators[0].id, partnerCollaborator.id);
});

test('findCollaboratorsByRole finds the CALA admin user', async (t: Test) => {
  const { collection, design } = await createResources();

  const { user: calaUser } = await createUser({ withSession: false });

  const calaCollaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    userId: calaUser.id
  });

  sandbox()
    .stub(CollaboratorsDAO, 'findByCollectionAndUser')
    .withArgs(collection.id, CALA_ADMIN_USER_ID)
    .resolves([calaCollaborator]);

  const collaborators = await findCollaboratorsByRole(design.id, 'CALA');

  t.equal(collaborators.length, 1);
  t.equal(collaborators[0].id, calaCollaborator.id);
});
