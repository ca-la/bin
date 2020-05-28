import Koa from "koa";
import Knex from "knex";

import db from "../../services/db";
import { getDesignPermissions } from "../../services/get-permissions";
import { findDesignByApprovalStepId } from "../../components/product-designs/dao/dao";

/**
 * Determines whether or not the current user has access to the supplied approval step.
 */
export function* canAccessApprovalStepInParam(
  this: Koa.Context,
  next: () => Promise<any>
): any {
  const { role, userId } = this.state;
  const { approvalStepId } = this.params;

  if (!approvalStepId) {
    this.throw(
      400,
      "Must provide an approval step id in the query parameters."
    );
  }
  const design = yield findDesignByApprovalStepId(approvalStepId);
  if (!design) {
    this.throw(404, "Design cannot be found.");
  }
  this.state.permissions = yield db.transaction((trx: Knex.Transaction) =>
    getDesignPermissions(trx, {
      designId: design.id,
      sessionRole: role,
      sessionUserId: userId,
    })
  );
  const { permissions } = this.state;

  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view the step for this design."
  );

  yield next;
}
