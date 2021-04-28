import { z } from "zod";
import convert from "koa-convert";

import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../../middleware/type-guard";
import useTransaction, {
  TransactionState,
} from "../../../middleware/use-transaction";
import { StrictContext } from "../../../router-context";
import createDesign from "../../../services/create-design";
import {
  getDesignPermissions,
  Permissions,
} from "../../../services/get-permissions";
import { User } from "../../users/types";
import { Role as TeamUserRole } from "../../team-users/types";
import ProductDesign from "../domain-objects/product-design";
import * as UsersDAO from "../../users/dao";
import requireAuth from "../../../middleware/require-auth";
import {
  requireTeamRoles,
  RequireTeamRolesContext,
} from "../../team-users/service";
import * as CollectionsDAO from "../../collections/dao";
import ResourceNotFoundError from "../../../errors/resource-not-found";

export const createBodySchema = z.object({
  title: z.string(),
  collectionIds: z.array(z.string()).nullable().optional(),
});
export type CreateBody = z.infer<typeof createBodySchema>;

export interface CreateResponseBody extends ProductDesign {
  permissions: Permissions;
  owner: User;
}

interface CreateContext extends StrictContext<CreateResponseBody> {
  state: AuthedState & SafeBodyState<CreateBody> & TransactionState;
}

export async function create(ctx: CreateContext) {
  const { role: sessionRole, userId, safeBody, trx } = ctx.state;

  const design = await createDesign({ ...safeBody, userId }, trx);

  const permissions = await getDesignPermissions({
    designId: design.id,
    sessionRole,
    sessionUserId: userId,
    trx,
  });
  const owner = await UsersDAO.findById(userId, trx);

  // Unexpected: Owner should exist in an authed route. Checked for safety.
  ctx.assert(owner, 404, `No user found with ID ${userId}`);

  ctx.status = 201;
  ctx.body = {
    ...design,
    permissions,
    owner,
  };
}

interface CreateDesignRequireTeamRolesContext extends RequireTeamRolesContext {
  state: RequireTeamRolesContext["state"] & SafeBodyState<CreateBody>;
}

export const routeMiddlewareStack = [
  requireAuth,
  typeGuardFromSchema(createBodySchema),
  useTransaction,
  requireTeamRoles(
    [
      TeamUserRole.OWNER,
      TeamUserRole.ADMIN,
      TeamUserRole.EDITOR,
      TeamUserRole.TEAM_PARTNER,
    ],
    async (ctx: CreateDesignRequireTeamRolesContext) => {
      const { collectionIds } = ctx.state.safeBody;
      if (!collectionIds || collectionIds.length === 0) {
        return null;
      }

      const collectionId = collectionIds[0];
      const collection = await CollectionsDAO.findById(collectionId);
      if (!collection) {
        throw new ResourceNotFoundError(
          `Could not find collection with ID ${collectionId}`
        );
      }

      return collection.teamId;
    },
    { allowNoTeam: true }
  ),
  convert.back(create),
];
