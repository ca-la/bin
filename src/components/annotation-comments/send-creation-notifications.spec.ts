import uuid from 'node-uuid';
import { Role } from '@cala/ts-lib/dist/users';

import * as AnnotationsDAO from '../../components/product-design-canvas-annotations/dao';
import Annotation from '../../components/product-design-canvas-annotations/domain-object';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import Collection from '../../components/collections/domain-object';
import sendCreationNotifications from './send-creation-notifications';
import User from '../../components/users/domain-object';
import createUser from '../../test-helpers/create-user';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import { create as createDesign } from '../product-designs/dao';
import * as CreateNotifications from '../../services/create-notifications';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import generateCollection from '../../test-helpers/factories/collection';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import { addDesign } from '../../test-helpers/collections';

async function setup(): Promise<{
  annotation: Annotation;
  collection: Collection;
  collaborator: Collaborator;
  collaboratorUser: User;
  mentionStub: any;
  ownerStub: any;
  ownerUser: User;
}> {
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
  await addDesign(collection.id, design.id);

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

  return {
    annotation,
    collaborator,
    collaboratorUser,
    collection,
    mentionStub,
    ownerStub,
    ownerUser
  };
}

test('sendCreationNotifications loops through mentions and sends notifications', async (t: Test) => {
  const {
    collaboratorUser,
    annotation,
    collaborator,
    ownerUser,
    ownerStub,
    mentionStub
  } = await setup();

  const comment = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    mentions: {},
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator>`,
    userEmail: 'cool@me.me',
    userId: 'purposefully incorrect',
    userName: 'Somebody cool',
    userRole: 'USER' as Role
  };

  await sendCreationNotifications({
    actorUserId: ownerUser.id,
    annotationId: annotation.id,
    comment
  });

  t.equal(ownerStub.callCount, 1);

  t.deepEqual(ownerStub.firstCall.args.slice(0, 5), [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    [collaboratorUser.id]
  ]);

  t.equal(mentionStub.callCount, 1);

  t.deepEqual(mentionStub.firstCall.args.slice(0, 5), [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    collaboratorUser.id
  ]);
});

test('sendCreationNotifications continues processing notifications once it hits an unregistered collaborator', async (t: Test) => {
  const {
    collaboratorUser,
    collection,
    annotation,
    collaborator,
    ownerUser,
    mentionStub
  } = await setup();

  // Adding a collaborator who does not have a full user account
  const { collaborator: collaborator2 } = await generateCollaborator({
    collectionId: collection.id,
    userEmail: 'foo@example.com'
  });

  // And a third collaborator who does have an account
  const { user: collaborator3User } = await createUser();

  const { collaborator: collaborator3 } = await generateCollaborator({
    collectionId: collection.id,
    userId: collaborator3User.id
  });

  const comment = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    mentions: {},
    parentCommentId: null,
    text: `Hi @<${collaborator.id}|collaborator> @<${
      collaborator2.id
    }|collaborator> @<${collaborator3.id}|collaborator> how's it going`,
    userEmail: 'cool@example.com',
    userId: '123',
    userName: 'Somebody cool',
    userRole: 'USER' as Role
  };

  await sendCreationNotifications({
    actorUserId: ownerUser.id,
    annotationId: annotation.id,
    comment
  });

  t.equal(mentionStub.callCount, 2);

  t.deepEqual(mentionStub.firstCall.args.slice(0, 5), [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    collaboratorUser.id
  ]);

  t.deepEqual(mentionStub.args[1].slice(0, 5), [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    collaborator3User.id
  ]);
});
