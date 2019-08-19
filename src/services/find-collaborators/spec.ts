import * as uuid from 'node-uuid';
import CollaboratorsDAO = require('../../components/collaborators/dao');
import Collection from '../../components/collections/domain-object';
import * as CollectionsDAO from '../../components/collections/dao';
import createUser = require('../../test-helpers/create-user');
import findCollaboratorsByRole from './index';
import ProductDesign = require('../../components/product-designs/domain-objects/product-design');
import ProductDesignsDAO = require('../../components/product-designs/dao');
import User from '../../components/users/domain-object';
import { CALA_OPS_USER_ID } from '../../config';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import generateCollaborator from '../../test-helpers/factories/collaborator';

async function createResources(): Promise<{
  collection: Collection;
  user: User;
  design: ProductDesign;
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
  const { collaborator: ownerCollaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const collaborators = await findCollaboratorsByRole(design.id, 'DESIGNER');

  t.equal(collaborators.length, 1);
  t.equal(collaborators[0].id, ownerCollaborator.id);
});

test('findCollaboratorsByRole finds partners', async (t: Test) => {
  const { design } = await createResources();

  const { user: partnerUser } = await createUser({
    withSession: false,
    role: 'PARTNER'
  });

  const { collaborator: partnerCollaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'PARTNER',
    userEmail: null,
    userId: partnerUser.id
  });

  // Add a 3rd-party collaborator; we had a previous failure case where we
  // weren't handling filtering out collaborators without users
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: 'Cmon check it out',
    role: 'EDIT',
    userEmail: 'friend@ca.la',
    userId: null
  });

  const collaborators = await findCollaboratorsByRole(design.id, 'PARTNER');

  t.equal(collaborators.length, 1);
  t.equal(collaborators[0].id, partnerCollaborator.id);
});

test('findCollaboratorsByRole finds the CALA admin user', async (t: Test) => {
  const { collection, design } = await createResources();

  const { user: calaUser } = await createUser({ withSession: false });

  const { collaborator: calaCollaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: calaUser.id
  });

  sandbox()
    .stub(CollaboratorsDAO, 'findByCollectionAndUser')
    .withArgs(collection.id, CALA_OPS_USER_ID)
    .resolves([calaCollaborator]);

  const collaborators = await findCollaboratorsByRole(design.id, 'CALA');

  t.equal(collaborators.length, 1);
  t.equal(collaborators[0].id, calaCollaborator.id);
});
