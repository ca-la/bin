import Knex from "knex";
import { findTeamPlans } from "./dao";
import { Plan, TeamPlanOption } from "./types";
import { calculatePerBillingIntervalPrice } from "./service";

export async function areThereAvailableSeatsInTeamPlan(
  trx: Knex.Transaction,
  teamId: string,
  currentTeamUsers: number
): Promise<boolean> {
  const plans = await findTeamPlans(trx, teamId);

  return plans.some(
    (plan: Plan) =>
      plan.maximumSeatsPerTeam === null ||
      plan.maximumSeatsPerTeam > currentTeamUsers
  );
}

export async function isAvailableSeatLimitExceededInTeamPlan(
  trx: Knex.Transaction,
  teamId: string,
  currentTeamUsers: number
): Promise<boolean> {
  const plans = await findTeamPlans(trx, teamId);

  return plans.every(
    (plan: Plan) =>
      plan.maximumSeatsPerTeam !== null &&
      plan.maximumSeatsPerTeam < currentTeamUsers
  );
}

export function attachTeamOptionData(
  plan: Plan,
  billedUserCount: number
): TeamPlanOption {
  return {
    ...plan,
    billedUserCount,
    totalBillingIntervalCostCents: calculatePerBillingIntervalPrice(
      plan,
      billedUserCount
    ),
  };
}
