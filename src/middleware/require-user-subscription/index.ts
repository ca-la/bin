import Koa from "koa";

import { findActive as findActiveSubscription } from "../../components/subscriptions/dao";
import Knex from "knex";
import db from "../../services/db";

// Require that the user has an active user-level subscription
// Note: This will become obsolete as subscriptions move to the team level; see
// `src/components/plans/find-collection-team-plans`
export default function* requireUserSubscription(
  this: Koa.Context,
  next: () => any
): Iterator<any, any, any> {
  this.assert(
    this.state.userId,
    401,
    "Authorization is required to access this resource"
  );

  if (this.state.role === "ADMIN") {
    return yield next;
  }

  yield db.transaction(async (trx: Knex.Transaction) => {
    const subscriptions = await findActiveSubscription(this.state.userId, trx);
    this.assert(
      subscriptions.length > 0,
      402,
      "A subscription is required to perform this action"
    );
  });
  yield next;
}
