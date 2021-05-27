import Router from "koa-router";

import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import requireAuth from "../../middleware/require-auth";
import {
  attachDesignPermissions,
  canCommentOnDesign,
} from "../../middleware/can-access-design";
import { Permissions } from "../permissions/types";

import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";
import { Asset } from "../assets/types";
import {
  CommentWithResources,
  CreateCommentWithResources,
  createCommentWithResourcesSchema,
} from "../comments/types";
import convert from "koa-convert";
import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../middleware/type-guard";
import { StrictContext } from "../../router-context";
import { createAndAnnounce } from "./service";

const router = new Router();

interface CreateCommentContext extends StrictContext<CommentWithResources> {
  state: AuthedState &
    TransactionState & { permissions?: Permissions } & SafeBodyState<
      CreateCommentWithResources
    >;
  params: { approvalStepId: string };
}

async function attachPermissions(ctx: CreateCommentContext, next: any) {
  const { trx } = ctx.state;
  const { approvalStepId } = ctx.params;

  const step = await ApprovalStepsDAO.findById(trx, approvalStepId);
  if (!step) {
    ctx.throw(404, `Step ${approvalStepId} not found`);
  }
  await attachDesignPermissions(ctx, step.designId);

  return next();
}

async function createApprovalStepComment(ctx: CreateCommentContext) {
  const { trx, userId } = ctx.state;
  const attachments: Asset[] = ctx.state.safeBody.attachments || [];
  const { approvalStepId } = ctx.params;

  const comment = await createCommentWithAttachments(trx, {
    comment: ctx.state.safeBody,
    attachments,
    userId,
  });

  const commentWithResources = await createAndAnnounce(
    trx,
    approvalStepId,
    comment
  );

  ctx.status = 201;
  ctx.body = commentWithResources;
}

router.post(
  "/:approvalStepId",
  requireAuth,
  typeGuardFromSchema<CreateCommentWithResources>(
    createCommentWithResourcesSchema
  ),
  useTransaction,
  convert.back(attachPermissions),
  canCommentOnDesign,
  convert.back(createApprovalStepComment)
);

export default router.routes();
