import * as uuid from 'node-uuid';

import sendCreationNotifications from './send-creation-notifications';
import * as AnnotationsDAO from '../../components/product-design-canvas-annotations/dao';
import createUser = require('../../test-helpers/create-user');
import { sandbox, test, Test } from '../../test-helpers/fresh';
import * as CollectionsDAO from '../collections/dao';
import { create as createDesign } from '../product-designs/dao';
import * as CreateNotifications from '../../services/create-notifications';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import generateCollection from '../../test-helpers/factories/collection';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';

test('sendCreationNotifications loops through mentions and sends notifications', async (t: Test) => {
  const ownerStub = sandbox()
    .stub(
      CreateNotifications,
      'sendDesignOwnerAnnotationCommentCreateNotification'
    )
    .resolves();

  const mentionStub = sandbox()
    .stub(CreateNotifications, 'sendAnnotationCommentMentionNotification')
    .resolves();

  const { user: ownerUser } = await createUser();
  const { user: collaboratorUser } = await createUser();

  const { collection } = await generateCollection({ createdBy: ownerUser.id });
  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: collaboratorUser.id
  });

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: ownerUser.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);

  const { canvas: designCanvas } = await generateCanvas({
    componentId: null,
    createdBy: ownerUser.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: 'My Green Tee',
    width: 200,
    x: 0,
    y: 0
  });

  const annotation = await AnnotationsDAO.create({
    canvasId: designCanvas.id,
    createdBy: ownerUser.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 1,
    y: 1
  });

  const comment = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    mentions: {
      [collaborator.id]: collaborator.userEmail
    },
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator>`,
    userEmail: 'cool@me.me',
    userId: 'purposefully incorrect',
    userName: 'Somebody cool'
  };

  await sendCreationNotifications({
    actorUserId: ownerUser.id,
    annotationId: annotation.id,
    comment
  });

  t.equal(ownerStub.callCount, 1);

  t.deepEqual(ownerStub.firstCall.args, [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    [collaboratorUser.id]
  ]);

  t.equal(mentionStub.callCount, 1);

  t.deepEqual(mentionStub.firstCall.args, [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    collaboratorUser.id
  ]);
});
