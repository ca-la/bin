import Knex from "knex";
import convert from "koa-convert";
import Router from "koa-router";

import requireAuth from "../../middleware/require-auth";
import { StrictContext } from "../../router-context";
import {
  CommentWithResources,
  createCommentWithAttachmentsSchema,
} from "../comments/types";
import db from "../../services/db";
import {
  getDesignPermissions,
  Permissions,
} from "../../services/get-permissions";
import { createAndAnnounce } from "./service";

const router = new Router();

async function getDesignIdBySubmission(
  submissionId: string,
  ktx: Knex = db
): Promise<string | null> {
  const dbResult = await ktx
    .select<{ design_id: string }>("steps.design_id")
    .from("design_approval_submissions AS submissions")
    .where({ "submissions.id": submissionId })
    .join("design_approval_steps AS steps", "steps.id", "submissions.step_id")
    .first();

  return dbResult ? dbResult.design_id : null;
}

async function getPermissionsBySubmission(
  ctx: StrictContext<unknown> & { state: AuthedState },
  submissionId: string
): Promise<Permissions> {
  const designId = await getDesignIdBySubmission(submissionId);

  ctx.assert(
    designId,
    404,
    `Could not find submission with ID: ${submissionId}`
  );

  return getDesignPermissions({
    designId,
    sessionRole: ctx.state.role,
    sessionUserId: ctx.state.userId,
  });
}

interface CreateSubmissionCommentContext
  extends StrictContext<CommentWithResources> {
  state: AuthedState;
  params: { submissionId: string };
}

async function createSubmissionComment(ctx: CreateSubmissionCommentContext) {
  const { submissionId } = ctx.params;

  ctx.assert(
    (await getPermissionsBySubmission(ctx, submissionId)).canComment,
    403,
    "You don't have permission to comment on this design"
  );

  const result = createCommentWithAttachmentsSchema.safeParse(ctx.request.body);
  ctx.assert(result.success, 400, "Request body did not match expected type");

  const { data: body } = result;
  const { userId } = ctx.state;

  return db.transaction(async (trx: Knex.Transaction) => {
    ctx.body = await createAndAnnounce(trx, {
      comment: body,
      attachments: body.attachments || [],
      userId,
      submissionId,
    });
    ctx.status = 201;
  });
}

router.post(
  "/:submissionId",
  requireAuth,
  convert.back(createSubmissionComment)
);

export default router.routes();
