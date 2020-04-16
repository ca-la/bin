import tape from 'tape';
import { authHeader, get, post } from '../../test-helpers/http';
import createUser from '../../test-helpers/create-user';
import ApprovalStep, {
  ApprovalStepState
} from '../approval-steps/domain-object';
import uuid from 'node-uuid';
import ProductDesignsDAO from '../product-designs/dao';
import { staticProductDesign } from '../../test-helpers/factories/product-design';
import Knex from 'knex';
import ProductDesign from '../product-designs/domain-objects/product-design';
import db from '../../services/db';
import * as ApprovalStepsDAO from '../approval-steps/dao';
import * as ApprovalStepCommentDAO from '../approval-step-comments/dao';
import { sandbox, test } from '../../test-helpers/fresh';
import generateComment from '../../test-helpers/factories/comment';
import * as CreateNotifications from '../../services/create-notifications';
import * as AnnounceCommentService from '../iris/messages/approval-step-comment';

import generateCollaborator from '../../test-helpers/factories/collaborator';

test('GET /design-approval-step-comments/:stepId returns comments', async (t: tape.Test) => {
  const { session, user } = await createUser({});

  const design: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: design.id,
    reason: null
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const { comment } = await generateComment({ userId: user.id });

  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepCommentDAO.create(trx, {
      commentId: comment.id,
      approvalStepId: approvalStep.id
    })
  );

  const [response, body] = await get(
    `/design-approval-step-comments/${approvalStep.id}`,
    {
      headers: authHeader(session.id)
    }
  );

  t.equal(response.status, 200, 'Successfully returns');
  t.equal(body.length, 1);
  t.equal(body[0].userId, user.id);
});

test('POST /design-approval-step-comments/:stepId creates a comment', async (t: tape.Test) => {
  sandbox()
    .stub(CreateNotifications, 'sendApprovalStepCommentMentionNotification')
    .resolves();
  sandbox()
    .stub(AnnounceCommentService, 'announceApprovalStepCommentCreation')
    .resolves({});
  const { session, user } = await createUser({});

  const design: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: design.id,
    reason: null
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const comment = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'test comment',
    userId: user.id
  };

  const [response, body] = await post(
    `/design-approval-step-comments/${approvalStep.id}`,
    {
      headers: authHeader(session.id),
      body: comment
    }
  );
  t.equal(response.status, 201, 'Successfully returns');
  t.equal(body.userId, user.id);
});

test('POST /design-approval-step-comments/:stepId sends @mention notifications', async (t: tape.Test) => {
  const mentionStub = sandbox()
    .stub(CreateNotifications, 'sendApprovalStepCommentMentionNotification')
    .resolves();
  sandbox()
    .stub(AnnounceCommentService, 'announceApprovalStepCommentCreation')
    .resolves({});

  const { session, user } = await createUser({});
  const { user: collaboratorUser } = await createUser();

  const design: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const { collaborator } = await generateCollaborator({
    designId: design.id,
    userId: collaboratorUser.id
  });

  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: design.id,
    reason: null
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const comment = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `@<${collaborator.id}|collaborator> Hey`,
    userId: user.id
  };

  await post(`/design-approval-step-comments/${approvalStep.id}`, {
    headers: authHeader(session.id),
    body: comment
  });

  t.equal(mentionStub.callCount, 1);

  t.deepEqual(mentionStub.firstCall.args[1], {
    approvalStepId: approvalStep.id,
    commentId: comment.id,
    actorId: user.id,
    recipientId: collaborator.user!.id
  });
});
