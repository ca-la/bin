import Knex from "knex";

import { validateEvery } from "../../services/validate-from-db";
import { dataAdapter, isPlanRow, Plan, PlanRow } from "./domain-object";

export default async function findTeamPlans(
  trx: Knex.Transaction,
  teamId: string
): Promise<Plan[]> {
  const result = await trx("subscriptions")
    .innerJoin("plans", "subscriptions.plan_id", "plans.id")
    .whereRaw(
      `
      subscriptions.team_id = ? and (
        subscriptions.cancelled_at is null or
        subscriptions.cancelled_at > now()
      )
    `,
      [teamId]
    )
    .select("plans.*");

  return validateEvery<PlanRow, Plan>("plans", isPlanRow, dataAdapter, result);
}

export async function areThereAvailableSeatsInTeamPlan(
  trx: Knex.Transaction,
  teamId: string,
  currentTeamUsers: number,
  isAdmin?: boolean
): Promise<boolean> {
  const plans = await findTeamPlans(trx, teamId);

  // probably temporary fix while all our teams don't subscribe to any plans
  if (!plans.length && isAdmin) {
    return true;
  }
  return plans.some(
    (plan: Plan) =>
      plan.maximumSeatsPerTeam === null ||
      plan.maximumSeatsPerTeam > currentTeamUsers
  );
}
