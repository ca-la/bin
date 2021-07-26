import Router from "koa-router";
import convert from "koa-convert";

import requireAuth from "../../middleware/require-auth";
import { canAccessAnnotationInParams } from "../../middleware/can-access-annotation";
import { canAccessTaskInParams } from "../../middleware/can-access-task";
import { canAccessDesignInParam } from "../../middleware/can-access-design";
import { canAccessApprovalStepInParam } from "../../middleware/can-access-approval-step";
import { canAccessCollectionInParam } from "../../middleware/can-access-collection";
import {
  requireTeamRoles,
  RequireTeamRolesContext,
} from "../../components/team-users/service";

import { Role as TeamUserRole } from "../../components/team-users/types";
import { StrictContext } from "../../router-context";
import { getPermissionsBySubmission } from "../submission-comments/routes";

const router = new Router();

/**
 * Checks if the authenticated user has access to the given task.
 * Responds with a 200 if there's a match, otherwise throws a 400.
 */
function* getAnnotationsAccess(this: AuthedContext): Iterator<any, any, any> {
  this.status = 200;
}

interface NotificationAccessQuery {
  userId?: string;
}

/**
 * Checks the state's userId against the query param's userId;
 * Responds with a 200 if there's a match, otherwise throws a 400.
 */
interface GetUserAccessContext extends StrictContext {
  state: AuthedState;
  query: {
    userId: string;
  };
}

async function getUserAccess(ctx: GetUserAccessContext) {
  const { userId } = ctx.state;
  const { userId: checkUserId }: NotificationAccessQuery = ctx.query;

  if (userId !== checkUserId) {
    ctx.throw(
      400,
      "The user id in the query does not match the session's user!"
    );
  }

  ctx.status = 200;
}

/**
 * Checks the state's userId against the query param's userId;
 * Responds with a 200 if there's a match, otherwise throws a 400.
 */
function* getNotificationAccess(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.state;
  const { userId: checkUserId }: NotificationAccessQuery = this.query;

  if (userId !== checkUserId) {
    this.throw(
      400,
      "The user id in the query does not match the session's user!"
    );
  }

  this.status = 200;
}

/**
 * Checks if the authenticated user has access to the given task.
 * Responds with a 200 if there's a match, otherwise throws a 400.
 */
function* getTasksAccess(this: AuthedContext): Iterator<any, any, any> {
  this.status = 200;
}

/**
 * Checks if the authenticated user has access to the given approval step.
 * Responds with a 200 if there's a match, otherwise throws a 400.
 */
function* getApprovalStepAccess(this: AuthedContext): Iterator<any, any, any> {
  this.status = 200;
}

/**
 * Checks if the authenticated user has access to the given design.
 * Responds with a 200 and permissions object if there's a match,
 * otherwise throws a 400.
 */
function* getDesignAccess(
  this: AuthedContext<{}, PermissionsKoaState>
): Iterator<any, any, any> {
  this.status = 200;
  this.body = this.state.permissions;
}

function* getCollectionAccess(
  this: AuthedContext<{}, PermissionsKoaState>
): Iterator<any, any, any> {
  this.status = 200;
  this.body = this.state.permissions;
}

/**
 * Checks if the authenticated user has access to the given team.
 * Responds with a 200 if there's a match.
 */
function* getTeamAccess(this: AuthedContext): Iterator<any, any, any> {
  this.status = 200;
}

interface GetSubmissionAccessContext extends StrictContext {
  state: AuthedState;
  params: { submissionId: string };
}

async function getSubmissionAccess(ctx: GetSubmissionAccessContext) {
  ctx.assert(
    (await getPermissionsBySubmission(ctx, ctx.params.submissionId)).canView,
    403,
    "You do not have permission to view this submission"
  );

  ctx.status = 200;
}

router.get("/users", requireAuth, convert.back(getUserAccess));
router.get("/notifications", requireAuth, getNotificationAccess);
router.get(
  "/annotations/:annotationId",
  requireAuth,
  canAccessAnnotationInParams,
  getAnnotationsAccess
);
router.get(
  "/tasks/:taskId",
  requireAuth,
  canAccessTaskInParams,
  getTasksAccess
);
router.get(
  "/designs/:designId",
  requireAuth,
  canAccessDesignInParam,
  getDesignAccess
);
router.get(
  "/collections/:collectionId",
  requireAuth,
  canAccessCollectionInParam,
  getCollectionAccess
);

router.get(
  "/approval-steps/:approvalStepId",
  requireAuth,
  canAccessApprovalStepInParam,
  getApprovalStepAccess
);

router.get(
  "/submissions/:submissionId",
  requireAuth,
  convert.back(getSubmissionAccess)
);

interface GetTeamAccessRequireTeamRolesContext extends RequireTeamRolesContext {
  params: { teamId: string };
}

router.get(
  "/teams/:teamId",
  requireAuth,
  requireTeamRoles(
    Object.values(TeamUserRole),
    async (context: GetTeamAccessRequireTeamRolesContext) =>
      context.params.teamId
  ),
  getTeamAccess
);

export default router.routes();
