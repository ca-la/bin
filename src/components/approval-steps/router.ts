import Knex from "knex";
import convert from "koa-convert";
import dao from "./dao";
import { buildRouter } from "../../services/cala-component/cala-router";
import { ROLES } from "../users/types";
import ApprovalStep, {
  approvalStepDomain,
  approvalStepUpdateSchema,
  ApprovalStepUpdate,
} from "./types";
import db from "../../services/db";
import requireAuth from "../../middleware/require-auth";
import { typeGuardFromSchema } from "../../middleware/type-guard";
import useTransaction from "../../middleware/use-transaction";
import {
  canAccessDesignInQuery,
  canAccessDesignInState,
  canEditDesign,
  requireDesignIdBy,
} from "../../middleware/can-access-design";
import ApprovalStepsDAO from "../approval-steps/dao";
import * as ApprovalStepCommentDAO from "../approval-step-comments/dao";
import { CommentWithResources } from "../comments/types";
import addAtMentionDetails from "../../services/add-at-mention-details";
import { addAttachmentLinks } from "../../services/add-attachments-links";
import { DesignEventWithMeta } from "../design-events/types";
import DesignEventsDAO from "../design-events/dao";
import { CalaRouter } from "../../services/cala-component/types";
import filterError from "../../services/filter-error";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { emit } from "../../services/pubsub";
import { RouteUpdated } from "../../services/pubsub/cala-events";
import { StrictContext } from "../../router-context";

type StreamItem = CommentWithResources | DesignEventWithMeta;

async function getDesignIdFromStep(this: AuthedContext): Promise<string> {
  const { id } = this.params;

  const step = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findById(trx, id)
  );
  if (!step) {
    this.throw(404, `Step not found with ID: ${id}`);
  }

  return step.designId;
}

const standardRouter = buildRouter<ApprovalStep>(
  approvalStepDomain,
  "/design-approval-steps",
  dao,
  {
    pickRoutes: ["find", "update"],
    routeOptions: {
      find: {
        allowedFilterAttributes: ["designId"],
        middleware: [requireAuth, canAccessDesignInQuery],
      },
    },
  }
);

const SKIP_EVENTS = ["STEP_REOPEN"];

function subtractDesignEventPairs(
  acc: DesignEventWithMeta[],
  designEvent: DesignEventWithMeta,
  index: number,
  designEvents: DesignEventWithMeta[]
): DesignEventWithMeta[] {
  const hasFutureReopen = designEvents
    .slice(index)
    .find((future: DesignEventWithMeta) => future.type === "STEP_REOPEN");
  if (designEvent.type === "STEP_COMPLETE" && hasFutureReopen) {
    return acc;
  }

  if (SKIP_EVENTS.includes(designEvent.type)) {
    return acc;
  }

  return [...acc, designEvent];
}

type UpdateContext = AuthedContext &
  TransactionContext &
  SafeBodyContext<ApprovalStepUpdate>;

async function update(ctx: UpdateContext) {
  const { trx, role, userId: actorId, safeBody: patch } = ctx.state;
  const { id } = ctx.params;

  const isAdmin = role === ROLES.ADMIN;

  if (patch.dueAt !== undefined && !isAdmin) {
    ctx.throw(403, "Access denied for this resource");
  }

  const { before, updated } = await ApprovalStepsDAO.update(
    trx,
    id,
    patch
  ).catch(
    filterError(ResourceNotFoundError, (err: ResourceNotFoundError) => {
      ctx.throw(404, err.message);
    })
  );

  await emit<
    ApprovalStep,
    RouteUpdated<ApprovalStep, typeof approvalStepDomain>
  >({
    type: "route.updated",
    domain: approvalStepDomain,
    actorId,
    trx,
    before,
    updated,
  });

  ctx.status = 200;
  ctx.body = updated;
}

interface GetApprovalStepStreamContext extends StrictContext<StreamItem[]> {
  state: { designId: string };
  params: { id: string };
}

async function getApprovalStepStream(ctx: GetApprovalStepStreamContext) {
  const comments = await ApprovalStepCommentDAO.findByStepId(db, {
    approvalStepId: ctx.params.id,
  });

  if (!comments) {
    ctx.throw(404);
  }

  const commentsWithResources: CommentWithResources[] = (
    await addAtMentionDetails(db, comments)
  ).map(addAttachmentLinks);
  const events: DesignEventWithMeta[] = (
    await DesignEventsDAO.findApprovalStepEvents(
      db,
      ctx.state.designId,
      ctx.params.id
    )
  ).reduce(subtractDesignEventPairs, []);

  const streamItems: StreamItem[] = [...commentsWithResources, ...events].sort(
    (a: StreamItem, b: StreamItem) =>
      a.createdAt.getTime() - b.createdAt.getTime()
  );

  ctx.body = streamItems;
  ctx.status = 200;
}

const router: CalaRouter = {
  ...standardRouter,
  routes: {
    ...standardRouter.routes,
    "/:id": {
      ...standardRouter.routes["/:id"],
      patch: [
        requireAuth,
        useTransaction,
        requireDesignIdBy(getDesignIdFromStep),
        canAccessDesignInState,
        canEditDesign,
        typeGuardFromSchema(approvalStepUpdateSchema),
        convert.back(update),
      ],
    },
    "/:id/stream-items": {
      get: [
        requireAuth,
        requireDesignIdBy(getDesignIdFromStep),
        canAccessDesignInState,
        convert.back(getApprovalStepStream),
      ],
    },
  },
};

export default router;
