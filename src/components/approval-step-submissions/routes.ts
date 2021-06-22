import Knex from "knex";
import Router from "koa-router";
import uuid from "node-uuid";
import { omit, pick } from "lodash";
import convert from "koa-convert";

import * as ApprovalStepCommentDAO from "../approval-step-comments/dao";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import * as ApprovalSubmissionsDAO from "./dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import DesignEventsDAO from "../design-events/dao";
import ApprovalStepSubmission, {
  ApprovalStepSubmissionState,
  approvalStepSubmissionDomain,
} from "./types";
import db from "../../services/db";
import DesignEvent, { templateDesignEvent } from "../design-events/types";
import requireAuth from "../../middleware/require-auth";
import {
  BASE_COMMENT_PROPERTIES,
  isBaseComment,
} from "../comments/domain-object";
import {
  canAccessDesignInState,
  requireDesignIdBy,
} from "../../middleware/can-access-design";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import addAtMentionDetails, {
  getCollaboratorsFromCommentMentions,
} from "../../services/add-at-mention-details";
import { requireQueryParam } from "../../middleware/require-query-param";
import notifications from "./notifications";
import { NotificationType } from "../notifications/domain-object";
import DesignsDAO from "../product-designs/dao";
import useTransaction from "../../middleware/use-transaction";
import * as IrisService from "../../components/iris/send-message";
import { realtimeApprovalSubmissionRevisionRequest } from "./realtime";
import { emit } from "../../services/pubsub";
import * as NotificationsService from "../../services/create-notifications";
import Comment, { CommentWithResources } from "../comments/types";
import { RouteUpdated, RouteDeleted } from "../../services/pubsub/cala-events";
import filterError from "../../services/filter-error";
import ResourceNotFoundError from "../../errors/resource-not-found";
import Asset from "../assets/types";
import { StrictContext } from "../../router-context";
import { addAttachmentLinks } from "../../services/add-attachments-links";
import * as SubmissionCommentsDAO from "../submission-comments/dao";

const router = new Router();

interface GetApprovalSubmissionsQuery {
  stepId: string;
}

interface SubmissionState {
  submission: ApprovalStepSubmission;
}
interface DesignIdState {
  designId: string;
}
type SubmissionStateContext = AuthedContext<{}, SubmissionState>;

export function* getApprovalSubmissionsForStep(
  this: AuthedContext<{}, PermittedState>
): Iterator<any, any, any> {
  const { stepId }: GetApprovalSubmissionsQuery = this.query;

  if (!this.state.permissions.canView) {
    this.throw(403, `Cannot view design for step ${stepId}`);
  }

  const found = yield db.transaction(async (trx: Knex.Transaction) => {
    return ApprovalSubmissionsDAO.findByStep(trx, stepId);
  });

  this.body = found;
  this.status = 200;
}

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

  const collaborator = submission.collaboratorId
    ? yield CollaboratorsDAO.findById(submission.collaboratorId)
    : null;

  if (collaborator) {
    yield notifications[
      NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL
    ].send(
      trx,
      this.state.userId,
      {
        recipientUserId: collaborator.userId,
        recipientCollaboratorId: collaborator.id,
        recipientTeamUserId: null,
      },
      {
        approvalStepId: submission.stepId,
        approvalSubmissionId: submission.id,
        designId: this.state.designId,
        collectionId: design.collectionIds[0] || null,
      }
    );
  }
  yield notifications[NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL].send(
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

export function* createApprovalSubmission(
  this: AuthedContext
): Iterator<any, any, any> {
  const { stepId }: GetApprovalSubmissionsQuery = this.query;
  const { userId } = this.state;

  const [approvalSubmission] = yield db.transaction(
    async (trx: Knex.Transaction) => {
      return ApprovalSubmissionsDAO.createAll(trx, [
        {
          ...((this.request.body as unknown) as ApprovalStepSubmission),
          stepId,
          createdBy: userId,
          deletedAt: null,
        },
      ]);
    }
  );
  this.body = approvalSubmission;
  this.status = 200;
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

const ALLOWED_UPDATE_KEYS = ["collaboratorId", "teamUserId"];

export function* updateApprovalSubmission(
  this: TrxContext<
    AuthedContext<
      { collaboratorId?: string | null; teamUserId?: string | null },
      PermittedState & SubmissionState & DesignIdState
    >
  >
): Iterator<any, any, any> {
  const { submission, trx } = this.state;
  if (!this.state.permissions.canView) {
    this.throw(403, `Cannot view design for step ${submission.stepId}`);
  }

  const restKeys = omit(this.request.body, ALLOWED_UPDATE_KEYS);
  if (Object.keys(restKeys).length > 0) {
    this.throw(400, `Keys ${Object.keys(restKeys).join(", ")} are not allowed`);
  }

  if (submission.state === ApprovalStepSubmissionState.APPROVED) {
    this.throw(
      400,
      "Changing assignee is not allowed after submission has been approved"
    );
  }

  const { collaboratorId = null, teamUserId = null } = this.request.body;

  if (
    submission.collaboratorId === collaboratorId &&
    submission.teamUserId === teamUserId
  ) {
    this.body = submission;
    this.status = 200;
    return;
  }

  const { before, updated } = yield ApprovalSubmissionsDAO.update(
    trx,
    submission.id,
    {
      collaboratorId,
      teamUserId,
    }
  );

  yield emit<
    ApprovalStepSubmission,
    RouteUpdated<ApprovalStepSubmission, typeof approvalStepSubmissionDomain>
  >({
    type: "route.updated",
    domain: approvalStepSubmissionDomain,
    actorId: this.state.userId,
    trx,
    before,
    updated,
  });

  this.status = 200;
  this.body = updated;
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

export function* createRevisionRequest(
  this: TrxContext<
    AuthedContext<
      { comment: Comment },
      PermittedState & { designId: string; stepId: string }
    >
  >
): Iterator<any, any, any> {
  const { trx, userId } = this.state;
  if (!this.request.body.comment) {
    this.throw(400, "Missing comment");
  }

  const commentRequest = pick(
    this.request.body.comment,
    BASE_COMMENT_PROPERTIES
  );
  const attachments: Asset[] = this.request.body.comment.attachments || [];
  const { submissionId } = this.params;

  if (!commentRequest || !isBaseComment(commentRequest)) {
    this.throw(400, "Invalid comment");
  }

  const submission = yield ApprovalSubmissionsDAO.findById(trx, submissionId);

  if (!submission) {
    this.throw(404, "Submission not found");
  }

  if (submission.state === ApprovalStepSubmissionState.REVISION_REQUESTED) {
    this.throw(409, "Submission already has requested revisions");
  }

  const { updated } = yield ApprovalSubmissionsDAO.update(trx, submissionId, {
    state: ApprovalStepSubmissionState.REVISION_REQUESTED,
  });

  const comment = yield createCommentWithAttachments(trx, {
    comment: commentRequest,
    attachments,
    userId,
  });

  yield ApprovalStepCommentDAO.create(trx, {
    approvalStepId: this.state.stepId,
    commentId: comment.id,
  });

  const {
    mentionedUserIds,
    idNameMap,
  } = yield getCollaboratorsFromCommentMentions(trx, comment.text);

  for (const mentionedUserId of mentionedUserIds) {
    yield NotificationsService.sendApprovalStepCommentMentionNotification(trx, {
      approvalStepId: this.state.stepId,
      commentId: comment.id,
      actorId: userId,
      recipientId: mentionedUserId,
    });
  }

  const commentWithMentions = { ...comment, mentions: idNameMap };

  const event = yield DesignEventsDAO.create(trx, {
    ...templateDesignEvent,
    actorId: this.state.userId,
    approvalStepId: this.state.stepId,
    approvalSubmissionId: submissionId,
    commentId: comment.id,
    createdAt: new Date(),
    designId: this.state.designId,
    id: uuid.v4(),
    type: "REVISION_REQUEST",
  });

  const eventWithMeta = yield DesignEventsDAO.findById(trx, event.id);

  IrisService.sendMessage(
    realtimeApprovalSubmissionRevisionRequest({
      comment: commentWithMentions,
      event: eventWithMeta,
      approvalStepId: updated.stepId,
    })
  );

  const design = yield DesignsDAO.findById(this.state.designId);
  if (!design) {
    throw new Error(`Could not find a design with id: ${this.state.designId}`);
  }

  const collaborator = submission.collaboratorId
    ? yield CollaboratorsDAO.findById(submission.collaboratorId)
    : null;

  if (collaborator) {
    yield notifications[
      NotificationType.APPROVAL_STEP_SUBMISSION_REVISION_REQUEST
    ].send(
      trx,
      this.state.userId,
      {
        recipientUserId: collaborator.userId,
        recipientCollaboratorId: collaborator.id,
        recipientTeamUserId: null,
      },
      {
        approvalStepId: submission.stepId,
        approvalSubmissionId: submission.id,
        designId: this.state.designId,
        collectionId: design.collectionIds[0] || null,
      }
    );
  }

  this.status = 204;
}

interface ListSubmissionStreamItemsContext
  extends StrictContext<CommentWithResources[]> {
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
  ctx.body = (await addAtMentionDetails(db, comments)).map(addAttachmentLinks);
  ctx.status = 200;
}

router.get(
  "/",
  requireAuth,
  requireQueryParam<GetApprovalSubmissionsQuery>("stepId"),
  requireDesignIdBy(
    getDesignIdFromStep(function (this: AuthedContext): string {
      return this.query.stepId;
    })
  ),
  canAccessDesignInState,
  getApprovalSubmissionsForStep
);

router.post(
  "/:submissionId/revision-requests",
  requireAuth,
  requireDesignIdBy(getDesignIdFromSubmission),
  canAccessDesignInState,
  useTransaction,
  createRevisionRequest
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

router.patch(
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
  updateApprovalSubmission
);

router.post(
  "/",
  requireAuth,
  requireQueryParam<GetApprovalSubmissionsQuery>("stepId"),
  requireDesignIdBy(
    getDesignIdFromStep(function (this: AuthedContext): string {
      return this.query.stepId;
    })
  ),
  canAccessDesignInState,
  createApprovalSubmission
);

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
