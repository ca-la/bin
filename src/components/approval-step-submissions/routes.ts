import Knex from "knex";
import Router from "koa-router";
import uuid from "node-uuid";
import convert from "koa-convert";
import { z } from "zod";

import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../middleware/type-guard";
import * as ApprovalStepCommentDAO from "../approval-step-comments/dao";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import * as ApprovalSubmissionsDAO from "./dao";
import DesignEventsDAO from "../design-events/dao";
import ApprovalStepSubmission, {
  ApprovalStepSubmissionState,
  approvalStepSubmissionDomain,
  ApprovalStepSubmissionUpdate,
  approvalStepSubmissionUpdateSchema,
  ApprovalStepSubmissionArtifactType,
} from "./types";
import db from "../../services/db";
import DesignEvent, {
  DesignEventWithMeta,
  templateDesignEvent,
} from "../design-events/types";
import requireAuth from "../../middleware/require-auth";
import {
  canAccessDesignInState,
  requireDesignIdBy,
} from "../../middleware/can-access-design";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import addAtMentionDetails, {
  getCollaboratorsFromCommentMentions,
} from "../../services/add-at-mention-details";
import notifications from "./notifications";
import { NotificationType } from "../notifications/domain-object";
import DesignsDAO from "../product-designs/dao";
import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";
import * as IrisService from "../../components/iris/send-message";
import { realtimeApprovalSubmissionRevisionRequest } from "./realtime";
import { emit } from "../../services/pubsub";
import * as NotificationsService from "../../services/create-notifications";
import { CommentWithResources } from "../comments/types";
import { RouteUpdated, RouteDeleted } from "../../services/pubsub/cala-events";
import filterError from "../../services/filter-error";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { StrictContext } from "../../router-context";
import { addAttachmentLinks } from "../../services/add-attachments-links";
import * as SubmissionCommentsDAO from "../submission-comments/dao";
import { getDesignPermissions } from "../../services/get-permissions";
import { dateStringToDate } from "../../services/zod-helpers";
import { parseContext } from "../../services/parse-context";
import { getRecipientsByStepSubmissionAndDesign } from "./service";
import {
  CreateRevisionRequest,
  createRevisionRequestSchema,
} from "../approval-step-comments/types";

const router = new Router();

const getSubmissionQuerySchema = z.union([
  z.object({ stepId: z.string() }),
  z.object({ designId: z.string() }),
]);

interface GetSubmissionsContext
  extends StrictContext<ApprovalStepSubmission[]> {
  state: AuthedState;
}

async function getSubmissions(ctx: GetSubmissionsContext) {
  const queryResult = getSubmissionQuerySchema.safeParse(ctx.query);

  ctx.assert(
    queryResult.success,
    400,
    "Must provide either a stepId or designId in query"
  );

  const { data } = queryResult;

  if ("stepId" in data) {
    return getSubmissionsByStepId(ctx, data.stepId);
  }

  return getSubmissionsByDesignId(ctx, data.designId);
}

async function getSubmissionsByStepId(
  ctx: GetSubmissionsContext,
  stepId: string
) {
  const approvalStep = await ApprovalStepsDAO.findById(db, stepId);
  ctx.assert(approvalStep, 404, `Could not find step with ID ${stepId}`);
  ctx.assert(
    (
      await getDesignPermissions({
        designId: approvalStep.designId,
        sessionRole: ctx.state.role,
        sessionUserId: ctx.state.userId,
      })
    ).canView,
    403,
    "You do not have permission to view submissions for this step"
  );

  ctx.body = await ApprovalSubmissionsDAO.findByStep(db, stepId);
  ctx.status = 200;
}

async function getSubmissionsByDesignId(
  ctx: GetSubmissionsContext,
  designId: string
) {
  ctx.assert(
    (
      await getDesignPermissions({
        designId,
        sessionRole: ctx.state.role,
        sessionUserId: ctx.state.userId,
      })
    ).canView,
    403,
    "You do not have permission to view submissions for this design"
  );

  ctx.body = await ApprovalSubmissionsDAO.findByDesign(db, designId);
  ctx.status = 200;
}

interface SubmissionState {
  submission: ApprovalStepSubmission;
}

interface DesignIdState {
  designId: string;
}
type SubmissionStateContext = AuthedContext<{}, SubmissionState>;

function* createApproval(
  this: TrxContext<
    AuthedContext<{}, PermittedState & { designId: string; stepId: string }>
  >
): Iterator<any, any, any> {
  const { submissionId } = this.params;
  const { trx } = this.state;

  const submission = yield ApprovalSubmissionsDAO.findById(trx, submissionId);
  if (!submission) {
    this.throw(404, `Submission not found with ID: ${submissionId}`);
  }

  if (submission.state === ApprovalStepSubmissionState.APPROVED) {
    this.throw(409, `Submission is already approved ${submissionId}`);
  }

  yield ApprovalSubmissionsDAO.update(trx, submissionId, {
    state: ApprovalStepSubmissionState.APPROVED,
  });

  const designEvent: DesignEvent = yield DesignEventsDAO.create(trx, {
    ...templateDesignEvent,
    actorId: this.state.userId,
    approvalStepId: this.state.stepId,
    approvalSubmissionId: submissionId,
    createdAt: new Date(),
    designId: this.state.designId,
    id: uuid.v4(),
    type: "STEP_SUBMISSION_APPROVAL",
  });

  const designEventWithMeta = yield DesignEventsDAO.findById(
    trx,
    designEvent.id
  );
  if (!designEventWithMeta) {
    throw new Error("Failed to create approval event");
  }
  const design = yield DesignsDAO.findById(this.state.designId);
  if (!design) {
    throw new Error(`Could not find a design with id: ${this.state.designId}`);
  }

  const recipients = yield getRecipientsByStepSubmissionAndDesign(
    trx,
    submission,
    design
  );

  for (const recipient of recipients) {
    yield notifications[
      NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL
    ].send(trx, this.state.userId, recipient, {
      approvalStepId: submission.stepId,
      approvalSubmissionId: submission.id,
      designId: this.state.designId,
      collectionId: design.collectionIds[0] || null,
    });
  }

  this.body = designEventWithMeta;
  this.status = 200;
}

function* createReReviewRequest(
  this: TrxContext<
    AuthedContext<{}, PermittedState & { designId: string; stepId: string }>
  >
): Iterator<any, any, any> {
  const { submissionId } = this.params;
  const { trx } = this.state;

  const submission = yield ApprovalSubmissionsDAO.findById(trx, submissionId);
  if (!submission) {
    this.throw(404, `Submission not found with ID: ${submissionId}`);
  }

  if (submission.state !== ApprovalStepSubmissionState.REVISION_REQUESTED) {
    this.throw(
      409,
      `Submission #${submissionId} should have REVISION_REQUESTED state`
    );
  }

  yield ApprovalSubmissionsDAO.update(trx, submissionId, {
    state: ApprovalStepSubmissionState.SUBMITTED,
  });

  const designEvent: DesignEvent = yield DesignEventsDAO.create(trx, {
    ...templateDesignEvent,
    actorId: this.state.userId,
    approvalStepId: this.state.stepId,
    approvalSubmissionId: submissionId,
    createdAt: new Date(),
    designId: this.state.designId,
    id: uuid.v4(),
    type: "STEP_SUBMISSION_RE_REVIEW_REQUEST",
  });

  const designEventWithMeta = yield DesignEventsDAO.findById(
    trx,
    designEvent.id
  );
  if (!designEventWithMeta) {
    throw new Error("Failed to create re-review request event");
  }
  const design = yield DesignsDAO.findById(this.state.designId);
  if (!design) {
    throw new Error(`Could not find a design with id: ${this.state.designId}`);
  }

  yield notifications[
    NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST
  ].send(
    trx,
    this.state.userId,
    {
      recipientUserId: design.userId,
      recipientCollaboratorId: null,
      recipientTeamUserId: null,
    },
    {
      approvalStepId: submission.stepId,
      approvalSubmissionId: submission.id,
      designId: this.state.designId,
      collectionId: design.collectionIds[0] || null,
    }
  );

  this.body = designEventWithMeta;
  this.status = 200;
}

const createSubmissionContextSchema = z.object({
  request: z.object({
    body: z.object({
      id: z.string(),
      createdAt: dateStringToDate,
      stepId: z.string(),
      state: z.nativeEnum(ApprovalStepSubmissionState),
      title: z.string(),
      collaboratorId: z.string().nullable(),
      teamUserId: z.string().nullable(),
      artifactType: z.nativeEnum(ApprovalStepSubmissionArtifactType),
    }),
  }),
  state: z.object({
    userId: z.string(),
  }),
});

interface CreateSubmissionContext
  extends StrictContext<ApprovalStepSubmission> {
  state: AuthedState;
}

async function createApprovalSubmission(ctx: CreateSubmissionContext) {
  const {
    request: { body },
    state: { userId },
  } = parseContext(ctx, createSubmissionContextSchema);

  const approvalStep = await ApprovalStepsDAO.findById(db, body.stepId);
  ctx.assert(approvalStep, 404, `Could not find step with ID ${body.stepId}`);
  ctx.assert(
    (
      await getDesignPermissions({
        designId: approvalStep.designId,
        sessionRole: ctx.state.role,
        sessionUserId: ctx.state.userId,
      })
    ).canView,
    403,
    "You do not have permission to create submissions for this step"
  );

  return db.transaction(async (trx: Knex.Transaction) => {
    ctx.body = await ApprovalSubmissionsDAO.create(trx, {
      ...body,
      createdBy: userId,
      deletedAt: null,
    });
    ctx.status = 200;
  });
}

export function* deleteApprovalSubmission(
  this: TrxContext<
    AuthedContext<
      { collaboratorId?: string | null; teamUserId?: string | null },
      PermittedState & SubmissionState & DesignIdState
    >
  >
): Iterator<any, any, any> {
  const { submission, permissions, role, trx } = this.state;

  const isAdmin = role === "ADMIN";
  const isCreator = submission.createdBy === this.state.userId;
  this.assert(
    isAdmin || isCreator || permissions.canDelete,
    403,
    "To delete the submission the user should be a creator of submission, collaborator of the design with edit permissions or an admin"
  );

  if (submission.state !== ApprovalStepSubmissionState.UNSUBMITTED) {
    this.throw(
      400,
      `Submission deleting is allowed only for submission with ${ApprovalStepSubmissionState.UNSUBMITTED} state`
    );
  }

  if (submission.collaboratorId !== null || submission.teamUserId !== null) {
    this.throw(
      400,
      "Submission deleting is allowed only for submission without assignee"
    );
  }

  const deleted = yield ApprovalSubmissionsDAO.deleteById(
    trx,
    submission.id
  ).catch(
    filterError(ResourceNotFoundError, () => {
      this.throw(404, `Submission not found with id ${submission.id}`);
    })
  );

  yield emit<
    ApprovalStepSubmission,
    RouteDeleted<ApprovalStepSubmission, typeof approvalStepSubmissionDomain>
  >({
    type: "route.deleted",
    domain: approvalStepSubmissionDomain,
    actorId: this.state.userId,
    trx,
    deleted,
  });

  this.status = 204;
}

interface GetSubmissionByIdContext
  extends StrictContext<ApprovalStepSubmission> {
  state: SubmissionState;
}

async function getSubmissionById(ctx: GetSubmissionByIdContext) {
  const { submission } = ctx.state;
  ctx.body = submission;
  ctx.status = 200;
}

interface UpdateApprovalStepSubmissionContext
  extends StrictContext<ApprovalStepSubmission> {
  state: AuthedState &
    TransactionState &
    PermittedState &
    SubmissionState &
    DesignIdState &
    SafeBodyState<ApprovalStepSubmissionUpdate>;
}

async function updateApprovalSubmission(
  ctx: UpdateApprovalStepSubmissionContext
) {
  const { submission, trx } = ctx.state;

  if (!ctx.state.permissions.canView) {
    ctx.throw(403, `Cannot view design for step ${submission.stepId}`);
  }

  const { collaboratorId, teamUserId, state } = ctx.state.safeBody;

  if (
    (collaboratorId || teamUserId) &&
    submission.state === ApprovalStepSubmissionState.APPROVED
  ) {
    ctx.throw(
      400,
      "Changing assignee is not allowed after submission has been approved"
    );
  }

  if (
    (collaboratorId && submission.collaboratorId === collaboratorId) ||
    (teamUserId && submission.teamUserId === teamUserId) ||
    submission.state === state
  ) {
    ctx.body = submission;
    ctx.status = 200;
    return;
  }

  const { before, updated } = await ApprovalSubmissionsDAO.update(
    trx,
    submission.id,
    {
      collaboratorId: teamUserId ? null : collaboratorId,
      teamUserId: collaboratorId ? null : teamUserId,
      state,
    }
  );

  await emit<
    ApprovalStepSubmission,
    RouteUpdated<ApprovalStepSubmission, typeof approvalStepSubmissionDomain>
  >({
    type: "route.updated",
    domain: approvalStepSubmissionDomain,
    actorId: ctx.state.userId,
    trx,
    before,
    updated,
  });

  ctx.status = 200;
  ctx.body = updated;
}

type StringGetter<State> = (this: AuthedContext<{}, State>) => string;
type AsyncStringGetter<State> = (
  this: AuthedContext<{}, State>
) => Promise<string>;

function getDesignIdFromStep<State = {}>(
  getStep: StringGetter<State>
): AsyncStringGetter<State> {
  return async function (this: AuthedContext<{}, State>): Promise<string> {
    const stepId = getStep.apply(this);
    const step = await db.transaction((trx: Knex.Transaction) =>
      ApprovalStepsDAO.findById(trx, stepId)
    );

    if (!step) {
      this.throw(404, `Step not found with ID: ${stepId}`);
    }

    return step.designId;
  };
}

function* injectSubmission(
  this: SubmissionStateContext,
  next: () => any
): Generator<any, any, any> {
  const { submissionId } = this.params;

  const submission = yield db.transaction((trx: Knex.Transaction) =>
    ApprovalSubmissionsDAO.findById(trx, submissionId)
  );
  if (!submission) {
    this.throw(404, `Submission not found with ID: ${submissionId}`);
  }

  this.state.submission = submission;

  yield next;
}

async function getDesignIdFromSubmission(
  this: AuthedContext<{}, { stepId?: string }>
): Promise<string> {
  const { submissionId } = this.params;

  const step = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findBySubmissionId(trx, submissionId)
  );

  if (!step) {
    this.throw(404, `Step not found with ID: ${submissionId}`);
  }
  this.state.stepId = step.id;
  return step.designId;
}

interface CreateRevisionRequestContext extends StrictContext {
  state: AuthedState &
    TransactionState &
    SafeBodyState<CreateRevisionRequest> & {
      stepId: string;
      designId: string;
    };
  params: { submissionId: string };
}

async function createRevisionRequest(ctx: CreateRevisionRequestContext) {
  const { trx, userId } = ctx.state;

  const { submissionId } = ctx.params;

  const submission = await ApprovalSubmissionsDAO.findById(trx, submissionId);

  if (!submission) {
    ctx.throw(404, "Submission not found");
  }

  if (submission.state === ApprovalStepSubmissionState.REVISION_REQUESTED) {
    ctx.throw(409, "Submission already has requested revisions");
  }

  const { updated } = await ApprovalSubmissionsDAO.update(trx, submissionId, {
    state: ApprovalStepSubmissionState.REVISION_REQUESTED,
  });

  const comment = await createCommentWithAttachments(trx, {
    comment: ctx.state.safeBody.comment,
    attachments: ctx.state.safeBody.comment.attachments,
    userId,
  });

  await ApprovalStepCommentDAO.create(trx, {
    approvalStepId: ctx.state.stepId,
    commentId: comment.id,
  });

  const {
    mentionedUserIds,
    idNameMap,
  } = await getCollaboratorsFromCommentMentions(trx, comment.text);

  for (const mentionedUserId of mentionedUserIds) {
    await NotificationsService.sendApprovalStepCommentMentionNotification(trx, {
      approvalStepId: ctx.state.stepId,
      commentId: comment.id,
      actorId: userId,
      recipientId: mentionedUserId,
    });
  }

  const commentWithMentions = { ...comment, mentions: idNameMap };

  const event = await DesignEventsDAO.create(trx, {
    ...templateDesignEvent,
    actorId: ctx.state.userId,
    approvalStepId: ctx.state.stepId,
    approvalSubmissionId: submissionId,
    commentId: comment.id,
    createdAt: new Date(),
    designId: ctx.state.designId,
    id: uuid.v4(),
    type: "REVISION_REQUEST",
  });

  const eventWithMeta = await DesignEventsDAO.findById(trx, event.id);

  if (!eventWithMeta) {
    throw new Error(`Could not re-fetch new design event ${event.id}`);
  }

  IrisService.sendMessage(
    realtimeApprovalSubmissionRevisionRequest({
      comment: commentWithMentions,
      event: eventWithMeta,
      approvalStepId: updated.stepId,
    })
  );

  const design = await DesignsDAO.findById(ctx.state.designId);
  if (!design) {
    throw new Error(`Could not find a design with id: ${ctx.state.designId}`);
  }

  const recipients = await getRecipientsByStepSubmissionAndDesign(
    trx,
    submission,
    design
  );

  for (const recipient of recipients) {
    await notifications[
      NotificationType.APPROVAL_STEP_SUBMISSION_REVISION_REQUEST
    ].send(trx, ctx.state.userId, recipient, {
      approvalStepId: submission.stepId,
      approvalSubmissionId: submission.id,
      designId: ctx.state.designId,
      collectionId: design.collectionIds[0] || null,
    });
  }

  ctx.status = 204;
}

type StreamItem = CommentWithResources | DesignEventWithMeta;

interface ListSubmissionStreamItemsContext extends StrictContext<StreamItem[]> {
  state: AuthedState;
  params: { submissionId: string };
}

async function listSubmissionStreamItems(
  ctx: ListSubmissionStreamItemsContext
) {
  const { submissionId } = ctx.params;

  const comments = await SubmissionCommentsDAO.findBySubmissionId(db, {
    submissionId,
  });
  const commentsWithResources = (await addAtMentionDetails(db, comments)).map(
    addAttachmentLinks
  );

  const events: DesignEventWithMeta[] = await DesignEventsDAO.findSubmissionEvents(
    db,
    submissionId
  );

  const streamItems: StreamItem[] = [...commentsWithResources, ...events].sort(
    (a: StreamItem, b: StreamItem) =>
      a.createdAt.getTime() - b.createdAt.getTime()
  );
  ctx.body = streamItems;
  ctx.status = 200;
}

router.get("/", requireAuth, convert.back(getSubmissions));

router.post(
  "/:submissionId/revision-requests",
  requireAuth,
  typeGuardFromSchema<CreateRevisionRequest>(createRevisionRequestSchema),
  requireDesignIdBy(getDesignIdFromSubmission),
  canAccessDesignInState,
  useTransaction,
  convert.back(createRevisionRequest)
);

router.post(
  "/:submissionId/approvals",
  requireAuth,
  requireDesignIdBy(getDesignIdFromSubmission),
  canAccessDesignInState,
  useTransaction,
  createApproval
);

router.post(
  "/:submissionId/re-review-requests",
  requireAuth,
  requireDesignIdBy(getDesignIdFromSubmission),
  canAccessDesignInState,
  useTransaction,
  createReReviewRequest
);

router.get(
  "/:submissionId",
  requireAuth,
  injectSubmission,
  requireDesignIdBy<{}, SubmissionState>(
    getDesignIdFromStep<SubmissionState>(function (
      this: SubmissionStateContext
    ): string {
      return this.state.submission.stepId;
    })
  ),
  canAccessDesignInState,
  convert.back(getSubmissionById)
);

router.patch(
  "/:submissionId",
  requireAuth,
  typeGuardFromSchema(approvalStepSubmissionUpdateSchema),
  injectSubmission,
  requireDesignIdBy<{}, SubmissionState>(
    getDesignIdFromStep<SubmissionState>(function (
      this: SubmissionStateContext
    ): string {
      return this.state.submission.stepId;
    })
  ),
  canAccessDesignInState,
  useTransaction,
  convert.back(updateApprovalSubmission)
);

router.post("/", requireAuth, convert.back(createApprovalSubmission));

router.del(
  "/:submissionId",
  requireAuth,
  injectSubmission,
  requireDesignIdBy<{}, SubmissionState>(
    getDesignIdFromStep<SubmissionState>(function (
      this: SubmissionStateContext
    ): string {
      return this.state.submission.stepId;
    })
  ),
  canAccessDesignInState,
  useTransaction,
  deleteApprovalSubmission
);

router.get(
  "/:submissionId/stream-items",
  requireAuth,
  injectSubmission,
  requireDesignIdBy(getDesignIdFromSubmission),
  canAccessDesignInState,
  convert.back(listSubmissionStreamItems)
);

export default router.routes();
