import Knex from "knex";

import { pick } from "lodash";
import { authHeader, get, patch } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import {
  generateDesign,
  staticProductDesign,
} from "../../test-helpers/factories/product-design";
import * as ApprovalStepCommentDAO from "../approval-step-comments/dao";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import DesignEventsDAO from "../design-events/dao";
import * as PricingProductTypesDAO from "../../components/pricing-product-types/dao";
import * as PricingQuotesDAO from "../../dao/pricing-quotes";
import db from "../../services/db";
import generateComment from "../../test-helpers/factories/comment";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
} from "./domain-object";
import DesignEvent from "../design-events/types";
import ProductDesign from "../product-designs/domain-objects/product-design";
import createDesign from "../../services/create-design";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import * as uuid from "node-uuid";
import * as NotificationsDAO from "../notifications/dao";
import { taskTypes } from "../tasks/templates";
import { generateTeam } from "../../test-helpers/factories/team";

// Making sure we always have listeners and notification layers included
// This makes sense only for separate tests running, since in other cases listeners are included anyway
import "./listeners";

test("GET /design-approval-steps?designId=:designId", async (t: Test) => {
  const designer = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const other = await createUser();

  const d1 = await generateDesign({ userId: designer.user.id });

  const [response, body] = await get(
    `/design-approval-steps?designId=${d1.id}`,
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.is(response.status, 200);
  t.is(body.length, 4);

  const adminRes = await get(`/design-approval-steps?designId=${d1.id}`, {
    headers: authHeader(admin.session.id),
  });

  t.is(adminRes[0].status, 200);
  t.is(adminRes[1].length, 4);

  const otherRes = await get(`/design-approval-steps?designId=${d1.id}`, {
    headers: authHeader(other.session.id),
  });

  t.is(otherRes[0].status, 403);
});

test("GET /design-approval-steps/:stepId/stream-items", async (t: Test) => {
  const designer = await createUser();
  const d1 = await generateDesign({ userId: designer.user.id });
  let approvalStepId = null;
  let finalCompleteEventId = null;
  await db.transaction(async (trx: Knex.Transaction) => {
    approvalStepId = (await ApprovalStepsDAO.findByDesign(trx, d1.id))[0].id;
    const { comment: comment1 } = await generateComment({
      text: "Going to submit",
      userId: designer.user.id,
    });
    await ApprovalStepCommentDAO.create(trx, {
      approvalStepId,
      commentId: comment1.id,
    });

    await generateDesignEvent({
      actorId: designer.user.id,
      approvalStepId,
      designId: d1.id,
      type: "SUBMIT_DESIGN",
      createdAt: new Date(),
    });

    const { comment: comment2 } = await generateComment({
      text: "Going to checkout",
      userId: designer.user.id,
    });
    await ApprovalStepCommentDAO.create(trx, {
      approvalStepId,
      commentId: comment2.id,
    });

    await generateDesignEvent({
      actorId: designer.user.id,
      approvalStepId,
      designId: d1.id,
      type: "COMMIT_QUOTE",
      createdAt: new Date(),
    });

    await generateDesignEvent({
      actorId: designer.user.id,
      approvalStepId,
      designId: d1.id,
      type: "STEP_COMPLETE",
      createdAt: new Date(),
    });

    await generateDesignEvent({
      actorId: designer.user.id,
      approvalStepId,
      designId: d1.id,
      type: "STEP_REOPEN",
      createdAt: new Date(),
    });

    await generateDesignEvent({
      actorId: designer.user.id,
      approvalStepId,
      designId: d1.id,
      type: "STEP_PARTNER_PAIRING",
      taskTypeId: taskTypes["PRODUCTION"].id,
      createdAt: new Date(),
    });

    const { designEvent: finalCompleteEvent } = await generateDesignEvent({
      actorId: designer.user.id,
      approvalStepId,
      designId: d1.id,
      type: "STEP_COMPLETE",
      createdAt: new Date(),
    });
    finalCompleteEventId = finalCompleteEvent.id;
  });
  const [res, body] = await get(
    `/design-approval-steps/${approvalStepId}/stream-items`,
    {
      headers: authHeader(designer.session.id),
    }
  );
  t.equal(res.status, 200, "Returns successfully");

  t.equal(body.length, 6, "Returns 6 results");
  t.equal(body[0].text, "Going to submit");
  t.deepEqual(
    {
      type: body[1].type,
      actorId: body[1].actorId,
      actorName: body[1].actorName,
      actorRole: body[1].actorRole,
      actorEmail: body[1].actorEmail,
    },
    {
      type: "SUBMIT_DESIGN",
      actorId: designer.user.id,
      actorName: "Q User",
      actorRole: "USER",
      actorEmail: designer.user.email,
    },
    "Submit event returns required information"
  );
  t.equal(body[2].text, "Going to checkout");
  t.deepEqual(
    {
      type: body[3].type,
      actorId: body[3].actorId,
      actorName: body[3].actorName,
      actorRole: body[3].actorRole,
      actorEmail: body[3].actorEmail,
    },
    {
      type: "COMMIT_QUOTE",
      actorId: designer.user.id,
      actorName: "Q User",
      actorRole: "USER",
      actorEmail: designer.user.email,
    },
    "Checkout event returns required information"
  );
  t.deepEqual(
    {
      taskTypeTitle: body[4].taskTypeTitle,
      type: body[4].type,
      actorId: body[4].actorId,
      actorName: body[4].actorName,
      actorRole: body[4].actorRole,
      actorEmail: body[4].actorEmail,
    },
    {
      taskTypeTitle: taskTypes["PRODUCTION"].title,
      type: "STEP_PARTNER_PAIRING",
      actorId: designer.user.id,
      actorName: "Q User",
      actorRole: "USER",
      actorEmail: designer.user.email,
    },
    "Partner pairing displays the correct title"
  );

  t.deepEqual(
    {
      type: body[5].type,
      actorId: body[5].actorId,
      actorName: body[5].actorName,
      actorRole: body[5].actorRole,
      actorEmail: body[5].actorEmail,
      id: body[5].id,
    },
    {
      type: "STEP_COMPLETE",
      actorId: designer.user.id,
      actorName: "Q User",
      actorRole: "USER",
      actorEmail: designer.user.email,
      id: finalCompleteEventId,
    },
    "Step completion event returns required information"
  );

  const other = await createUser();
  const [unauthRes] = await get(
    `/design-approval-steps/${approvalStepId}/stream-items`,
    {
      headers: authHeader(other.session.id),
    }
  );
  t.equal(unauthRes.status, 403);
});

test("PATCH /design-approval-steps/:stepId updates step state", async (t: Test) => {
  sandbox().stub(PricingProductTypesDAO, "findByDesignId").resolves({
    complexity: "BLANK",
  });
  sandbox()
    .stub(PricingQuotesDAO, "findByDesignId")
    .resolves([
      {
        processes: [],
      },
    ]);

  const designer = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const other = await createUser();

  const d1 = await generateDesign({ userId: designer.user.id });
  const steps = await db.transaction(async (trx: Knex.Transaction) => {
    const currentStepState = await ApprovalStepsDAO.findByDesign(trx, d1.id);
    await ApprovalStepsDAO.update(trx, currentStepState[1].id, {
      reason: null,
      state: ApprovalStepState.UNSTARTED,
    });
    await ApprovalStepsDAO.update(trx, currentStepState[2].id, {
      reason: null,
      state: ApprovalStepState.UNSTARTED,
    });
    return ApprovalStepsDAO.find(trx, { designId: d1.id });
  });

  const [response] = await patch(`/design-approval-steps/${steps[0].id}`, {
    headers: authHeader(designer.session.id),
    body: {
      state: ApprovalStepState.COMPLETED,
    },
  });
  t.is(response.status, 200);

  await db.transaction(async (trx: Knex.Transaction) => {
    const afterCompletionSteps = await ApprovalStepsDAO.findByDesign(
      trx,
      d1.id
    );
    t.is(afterCompletionSteps[0].state, ApprovalStepState.COMPLETED);
    t.is(afterCompletionSteps[1].state, ApprovalStepState.CURRENT);
    t.is(afterCompletionSteps[2].state, ApprovalStepState.UNSTARTED);
    t.is(afterCompletionSteps[3].state, ApprovalStepState.UNSTARTED);

    t.true(
      afterCompletionSteps[0].completedAt,
      "sets completed at date for completed step"
    );
    t.true(
      afterCompletionSteps[0].startedAt,
      "sets started at date for completed step"
    );
    t.true(
      afterCompletionSteps[1].startedAt,
      "sets started at date for current step"
    );

    const afterCompletionEvents = await DesignEventsDAO.findApprovalStepEvents(
      trx,
      d1.id,
      steps[0].id
    );
    t.true(
      afterCompletionEvents.some(
        (de: DesignEvent): boolean => de.type === "STEP_COMPLETE"
      )
    );
  });

  const adminRes = await patch(`/design-approval-steps/${steps[0].id}`, {
    headers: authHeader(admin.session.id),
    body: {
      state: ApprovalStepState.COMPLETED,
    },
  });
  t.is(adminRes[0].status, 200);

  const otherRes = await patch(`/design-approval-steps/${steps[0].id}`, {
    headers: authHeader(other.session.id),
    body: {
      state: ApprovalStepState.COMPLETED,
    },
  });
  t.is(otherRes[0].status, 403);

  const [reopenResponse] = await patch(
    `/design-approval-steps/${steps[0].id}`,
    {
      headers: authHeader(designer.session.id),
      body: {
        state: ApprovalStepState.CURRENT,
      },
    }
  );
  t.is(reopenResponse.status, 200);

  await db.transaction(async (trx: Knex.Transaction) => {
    const afterReopenSteps = await ApprovalStepsDAO.findByDesign(trx, d1.id);
    t.is(afterReopenSteps[0].state, ApprovalStepState.CURRENT);
    t.is(afterReopenSteps[1].state, ApprovalStepState.UNSTARTED);
    t.is(afterReopenSteps[2].state, ApprovalStepState.UNSTARTED);

    t.is(
      afterReopenSteps[0].completedAt,
      null,
      "resets completed at date for completed step"
    );
    t.is(
      afterReopenSteps[1].startedAt,
      null,
      "resets started at date for current step"
    );

    const afterCompletionEvents = await DesignEventsDAO.findApprovalStepEvents(
      trx,
      d1.id,
      steps[0].id
    );
    t.true(
      afterCompletionEvents.some(
        (de: DesignEvent): boolean => de.type === "STEP_REOPEN"
      )
    );
  });
});

test("PATCH /design-approval-steps/:stepId updates collaboratorId", async (t: Test) => {
  const { user: actor, session } = await createUser({ withSession: true });
  const { user: assignee } = await createUser({ withSession: false });

  const d1: ProductDesign = await createDesign(
    staticProductDesign({ userId: actor.id })
  );

  const { collaborator } = await generateCollaborator({
    userId: assignee.id,
    designId: d1.id,
  });

  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Checkout",
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    teamUserId: null,
    completedAt: null,
    startedAt: null,
    createdAt: new Date(),
    dueAt: null,
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await ApprovalStepsDAO.createAll(trx, [as1]);
  });

  const [response, body] = await patch(`/design-approval-steps/${as1.id}`, {
    headers: authHeader(session.id),
    body: {
      collaboratorId: collaborator.id,
    },
  });
  t.is(response.status, 200, "responds with 200");
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify({ ...as1, collaboratorId: collaborator.id })),
    "returns updated step"
  );

  await db.transaction(async (trx: Knex.Transaction) => {
    const designEvents = await DesignEventsDAO.findApprovalStepEvents(
      trx,
      as1.designId,
      as1.id
    );
    t.is(designEvents.length, 1, "design event is created");
    t.deepEqual(
      pick(
        designEvents[0],
        "actorId",
        "targetId",
        "designId",
        "type",
        "approvalStepId",
        "stepTitle"
      ),
      {
        actorId: actor.id,
        targetId: assignee.id,
        designId: d1.id,
        type: "STEP_ASSIGNMENT",
        approvalStepId: as1.id,
        stepTitle: as1.title,
      },
      "design event has proper values"
    );

    const notifications = await NotificationsDAO.findByUserId(
      trx,
      assignee.id,
      { limit: 10, offset: 0 }
    );
    t.is(notifications.length, 1, "notification is created");

    t.deepEqual(
      pick(
        notifications[0],
        "actorUserId",
        "approvalStepId",
        "approvalStepTitle",
        "collaboratorId",
        "designId",
        "type"
      ),
      {
        actorUserId: actor.id,
        approvalStepId: as1.id,
        approvalStepTitle: as1.title,
        collaboratorId: collaborator.id,
        designId: d1.id,
        type: "APPROVAL_STEP_ASSIGNMENT",
      },
      "notification has proper values"
    );
  });
});

test("PATCH /design-approval-steps/:stepId updates teamUserId", async (t: Test) => {
  const { user: actor, session } = await createUser({ withSession: true });
  const { user: assignee } = await createUser({ withSession: false });

  const d1: ProductDesign = await createDesign(
    staticProductDesign({ userId: actor.id })
  );

  const { teamUser } = await generateTeam(assignee.id);

  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Checkout",
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    completedAt: null,
    startedAt: null,
    dueAt: null,
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await ApprovalStepsDAO.createAll(trx, [as1]);
  });

  const [response, body] = await patch(`/design-approval-steps/${as1.id}`, {
    headers: authHeader(session.id),
    body: {
      teamUserId: teamUser.id,
    },
  });
  t.is(response.status, 200, "responds with 200");
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify({ ...as1, teamUserId: teamUser.id })),
    "returns updated step"
  );

  await db.transaction(async (trx: Knex.Transaction) => {
    const designEvents = await DesignEventsDAO.findApprovalStepEvents(
      trx,
      as1.designId,
      as1.id
    );
    t.is(designEvents.length, 1, "design event is created");
    t.deepEqual(
      pick(
        designEvents[0],
        "actorId",
        "targetId",
        "designId",
        "type",
        "approvalStepId",
        "stepTitle"
      ),
      {
        actorId: actor.id,
        targetId: assignee.id,
        designId: d1.id,
        type: "STEP_ASSIGNMENT",
        approvalStepId: as1.id,
        stepTitle: as1.title,
      },
      "design event has proper values"
    );

    const notifications = await NotificationsDAO.findByUserId(
      trx,
      assignee.id,
      { limit: 10, offset: 0 }
    );
    t.is(notifications.length, 1, "notification is created");

    t.deepEqual(
      pick(
        notifications[0],
        "actorUserId",
        "approvalStepId",
        "approvalStepTitle",
        "recipientTeamUserId",
        "designId",
        "type"
      ),
      {
        actorUserId: actor.id,
        approvalStepId: as1.id,
        approvalStepTitle: as1.title,
        recipientTeamUserId: teamUser.id,
        designId: d1.id,
        type: "APPROVAL_STEP_ASSIGNMENT",
      },
      "notification has proper values"
    );
  });
});

test("PATCH /design-approval-steps/:stepId updates due date", async (t: Test) => {
  sandbox().stub(PricingProductTypesDAO, "findByDesignId").resolves({
    complexity: "BLANK",
  });
  sandbox()
    .stub(PricingQuotesDAO, "findByDesignId")
    .resolves([
      {
        processes: [],
      },
    ]);

  const admin = await createUser({ role: "ADMIN" });
  const { user: actor, session } = await createUser({ withSession: true });

  const d1: ProductDesign = await createDesign(
    staticProductDesign({ userId: actor.id })
  );

  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Checkout",
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    completedAt: null,
    startedAt: null,
    dueAt: null,
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await ApprovalStepsDAO.createAll(trx, [as1]);
  });

  const dueDate = new Date();
  const [regularUserResponse] = await patch(
    `/design-approval-steps/${as1.id}`,
    {
      headers: authHeader(session.id),
      body: {
        dueAt: dueDate,
      },
    }
  );
  t.is(
    regularUserResponse.status,
    403,
    "responds with 403, only admin can update the dueAt"
  );

  const [adminUserResponse, body] = await patch(
    `/design-approval-steps/${as1.id}`,
    {
      headers: authHeader(admin.session.id),
      body: {
        dueAt: dueDate,
      },
    }
  );
  t.is(adminUserResponse.status, 200);
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify({ ...as1, dueAt: dueDate })),
    "returns updated step"
  );

  const [adminUserResponseWithNullDueDate, bodyWithNullDueDate] = await patch(
    `/design-approval-steps/${as1.id}`,
    {
      headers: authHeader(admin.session.id),
      body: {
        dueAt: null,
      },
    }
  );
  t.is(adminUserResponseWithNullDueDate.status, 200);
  t.deepEqual(
    bodyWithNullDueDate,
    JSON.parse(JSON.stringify({ ...as1, dueAt: null })),
    "returns updated step"
  );
});
