import Knex from "knex";
import { findTeamPlans } from "./dao";
import { Plan, TeamPlanOption } from "./types";

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

export function attachTeamOptionData(
  plan: Plan,
  billedUserCount: number
): TeamPlanOption {
  return {
    ...plan,
    billedUserCount,
    totalBillingIntervalCostCents:
      plan.baseCostPerBillingIntervalCents +
      billedUserCount * plan.perSeatCostPerBillingIntervalCents,
  };
}
