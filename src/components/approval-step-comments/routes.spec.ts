import tape from "tape";
import { authHeader, post } from "../../test-helpers/http";
import createUser from "../../test-helpers/create-user";
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
} from "../approval-steps/domain-object";
import uuid from "node-uuid";
import { generateDesign } from "../../test-helpers/factories/product-design";
import Knex from "knex";
import ProductDesign from "../product-designs/domain-objects/product-design";
import db from "../../services/db";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import { sandbox, test } from "../../test-helpers/fresh";
import * as CreateNotifications from "../../services/create-notifications";
import * as AnnounceCommentService from "../iris/messages/approval-step-comment";

import generateCollaborator from "../../test-helpers/factories/collaborator";
import { SerializedCreateCommentWithAttachments } from "../comments/types";

test("POST /design-approval-step-comments/:stepId can create a comment by team member or non-PREVIEW collaborator or admin admin", async (t: tape.Test) => {
  sandbox()
    .stub(CreateNotifications, "sendApprovalStepCommentMentionNotification")
    .resolves();
  sandbox()
    .stub(AnnounceCommentService, "announceApprovalStepCommentCreation")
    .resolves({});

  const { session, user } = await createUser({});
  const { session: previewerSession, user: previewer } = await createUser({});
  const { session: editorSession, user: editor } = await createUser({});
  const { session: anotherSession } = await createUser({});
  const { session: adminSession } = await createUser({
    role: "ADMIN",
  });

  const design: ProductDesign = await generateDesign({
    userId: user.id,
  });
  generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: null,
    role: "PREVIEW",
    userEmail: null,
    userId: previewer.id,
  });
  generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: editor.id,
  });

  const [approvalStep] = await ApprovalStepsDAO.findByDesign(db, design.id);

  const comment: SerializedCreateCommentWithAttachments = {
    createdAt: new Date().toISOString(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "test comment",
    userId: user.id,
    attachments: [],
  };

  const [response, body] = await post(
    `/design-approval-step-comments/${approvalStep.id}`,
    {
      headers: authHeader(session.id),
      body: { ...comment, id: uuid.v4() },
    }
  );
  t.equal(response.status, 201, "Works for user created design");
  t.equal(body.userId, user.id);

  const [adminResponse] = await post(
    `/design-approval-step-comments/${approvalStep.id}`,
    {
      headers: authHeader(adminSession.id),
      body: { ...comment, id: uuid.v4() },
    }
  );
  t.equal(adminResponse.status, 201, "Works for CALA admins");

  const [editorResponse] = await post(
    `/design-approval-step-comments/${approvalStep.id}`,
    {
      headers: authHeader(editorSession.id),
      body: { ...comment, id: uuid.v4() },
    }
  );
  t.equal(editorResponse.status, 201, "Works for EDIT collaborators");

  const [previewerResponse] = await post(
    `/design-approval-step-comments/${approvalStep.id}`,
    {
      headers: authHeader(previewerSession.id),
      body: { ...comment, id: uuid.v4() },
    }
  );
  t.equal(previewerResponse.status, 403, "Fails for PREVIEW collaborators");

  const [forbiddenResponse] = await post(
    `/design-approval-step-comments/${approvalStep.id}`,
    {
      headers: authHeader(anotherSession.id),
      body: comment,
    }
  );
  t.equal(forbiddenResponse.status, 403, "Fails for arbitrary users");
});

test("POST /design-approval-step-comments/:stepId sends @mention notifications", async (t: tape.Test) => {
  const mentionStub = sandbox()
    .stub(CreateNotifications, "sendApprovalStepCommentMentionNotification")
    .resolves();
  sandbox()
    .stub(AnnounceCommentService, "announceApprovalStepCommentCreation")
    .resolves({});

  const { session, user } = await createUser({});
  const { user: collaboratorUser } = await createUser();

  const design: ProductDesign = await generateDesign({
    userId: user.id,
  });
  const { collaborator } = await generateCollaborator({
    designId: design.id,
    userId: collaboratorUser.id,
  });

  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Checkout",
    ordering: 0,
    designId: design.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const comment: SerializedCreateCommentWithAttachments = {
    createdAt: new Date().toISOString(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `@<${collaborator.id}|collaborator> Hey`,
    userId: user.id,
    attachments: [],
  };

  await post(`/design-approval-step-comments/${approvalStep.id}`, {
    headers: authHeader(session.id),
    body: comment,
  });

  t.equal(mentionStub.callCount, 1);

  t.deepEqual(mentionStub.firstCall.args[1], {
    approvalStepId: approvalStep.id,
    commentId: comment.id,
    actorId: user.id,
    recipientId: collaborator.user!.id,
  });
});
