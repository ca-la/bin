import findUserDesigns = require('./index');
import CollaboratorsDAO = require('../../dao/collaborators');
import * as CollectionsDAO from '../../dao/collections';
import createUser = require('../../test-helpers/create-user');
import { test, Test } from '../../test-helpers/fresh';
import createDesign from '../create-design';
import generateCollection from '../../test-helpers/factories/collection';

test('findUserDesigns finds the designs by user including collaborations', async (t: Test) => {
  const { user } = await createUser();
  const { user: notUser } = await createUser();

  const ownDesign = await createDesign({ productType: 'test', title: 'design', userId: user.id });

  const designSharedDesign = await createDesign(
    { productType: 'test', title: 'design', userId: notUser.id });
  await CollaboratorsDAO.create({
    collectionId: null,
    designId: designSharedDesign.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const collectionSharedDesign = await createDesign(
    { productType: 'test', title: 'design', userId: notUser.id });
  const { collection } = await generateCollection({ createdBy: notUser.id });
  await CollectionsDAO.addDesign(collection.id, collectionSharedDesign.id);
  await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const designs = await findUserDesigns(user.id);
  t.equal(designs.length, 3, 'should be 3 designs');
  t.deepEqual(designs[0].id, collectionSharedDesign.id, 'should match ids');
  t.deepEqual(designs[1].id, designSharedDesign.id, 'should match ids');
  t.deepEqual(designs[2].id, ownDesign.id, 'should match ids');
});
