import { z } from "zod";

import { SafeBodyState } from "../../../middleware/type-guard";
import { TransactionState } from "../../../middleware/use-transaction";
import { StrictContext } from "../../../router-context";
import createDesign from "../../../services/create-design";
import {
  getDesignPermissions,
  Permissions,
} from "../../../services/get-permissions";
import { User } from "../../users/types";
import ProductDesign from "../domain-objects/product-design";
import * as UsersDAO from "../../users/dao";

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
