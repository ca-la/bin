import dao from "./dao";
import { buildRouter } from "../../services/cala-component/cala-router";
import ApprovalStep, { domain } from "./types";
import db from "../../services/db";
import requireAuth from "../../middleware/require-auth";
import Knex from "knex";
import ApprovalStepsDAO from "../approval-steps/dao";
import useTransaction from "../../middleware/use-transaction";
import {
  canAccessDesignInQuery,
  canAccessDesignInState,
  canEditDesign,
  requireDesignIdBy,
} from "../../middleware/can-access-design";
import * as ApprovalStepCommentDAO from "../approval-step-comments/dao";
import { CommentWithResources } from "@cala/ts-lib";
import addAtMentionDetails from "../../services/add-at-mention-details";
import { addAttachmentLinks } from "../../services/add-attachments-links";
import { DesignEventWithMeta } from "../../domain-objects/design-event";
import * as DesignEventsDAO from "../../dao/design-events";
import { CalaRouter } from "../../services/cala-component/types";

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
  domain,
  "/design-approval-steps",
  dao,
  {
    pickRoutes: ["find", "update"],
    routeOptions: {
      find: {
        allowedFilterAttributes: ["designId"],
        middleware: [requireAuth, canAccessDesignInQuery],
      },
      update: {
        middleware: [
          requireAuth,
          requireDesignIdBy(getDesignIdFromStep),
          canAccessDesignInState,
          canEditDesign,
        ],
        allowedAttributes: ["collaboratorId", "state"],
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

const router: CalaRouter = {
  ...standardRouter,
  routes: {
    ...standardRouter.routes,
    "/:id/stream-items": {
      get: [
        requireAuth,
        requireDesignIdBy(getDesignIdFromStep),
        canAccessDesignInState,
        useTransaction,

        function* getApprovalStepStream(
          this: TrxContext<
            AuthedContext<{}, { designId: string }, { id: string }>
          >
        ): Iterator<any, any, any> {
          const { trx } = this.state;

          const comments = yield ApprovalStepCommentDAO.findByStepId(
            trx,
            this.params.id
          );

          if (!comments) {
            this.throw(404);
          }

          const commentsWithResources: CommentWithResources[] = (yield addAtMentionDetails(
            comments
          )).map(addAttachmentLinks);
          const events: DesignEventWithMeta[] = (yield DesignEventsDAO.findApprovalStepEvents(
            trx,
            this.state.designId,
            this.params.id
          )).reduce(subtractDesignEventPairs, []);

          const streamItems: StreamItem[] = [
            ...commentsWithResources,
            ...events,
          ].sort(
            (a: StreamItem, b: StreamItem) =>
              a.createdAt.getTime() - b.createdAt.getTime()
          );

          this.body = streamItems;
          this.status = 200;
        },
      ],
    },
  },
};

export default router;
