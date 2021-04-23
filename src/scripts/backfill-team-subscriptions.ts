import Knex from "knex";
import process from "process";
import uuid from "node-uuid";
import { chunk } from "lodash";

import { log, logServerError } from "../services/logger";
import { green, reset } from "../services/colors";
import db from "../services/db";
import { findFreeAndDefaultForTeams } from "../components/plans/dao";
import { Subscription } from "../components/subscriptions/domain-object";
import * as SubscriptionsDAO from "../components/subscriptions/dao";

function backfillTeamSubscriptions(args: string[]) {
  const isDryRun = args.includes("--dry-run");

  return db.transaction(async (trx: Knex.Transaction) => {
    const teamsWithNoSubscriptions = await trx
      .select<{ id: string }[]>(["teams.id"])
      .from("teams")
      .leftJoin("subscriptions", "subscriptions.team_id", "teams.id")
      .andWhere({ "subscriptions.id": null })
      .groupBy("teams.id");
    const plan = await findFreeAndDefaultForTeams(trx);

    if (!plan) {
      throw new Error("Could not find free and default plan");
    }

    log(
      `Found ${teamsWithNoSubscriptions.length} teams without a subscription`
    );

    const subscriptionsToCreate: Subscription[] = teamsWithNoSubscriptions.map(
      (team: { id: string }) => ({
        cancelledAt: null,
        createdAt: new Date(),
        id: uuid.v4(),
        isPaymentWaived: true,
        paymentMethodId: null,
        planId: plan.id,
        stripeSubscriptionId: null,
        teamId: team.id,
        userId: null,
      })
    );

    for (const subChunk of chunk(subscriptionsToCreate, 1000)) {
      await SubscriptionsDAO.createAll(trx, subChunk);
    }

    if (isDryRun) {
      await trx.rollback(new Error("Dry run, rolling back!"));
    }
  });
}

backfillTeamSubscriptions(process.argv.slice(2))
  .then(() => {
    log(green, `Successfully backfilled!`, reset);
    process.exit();
  })
  .catch((err: any): void => {
    logServerError(err.message);
    process.exit(1);
  });
