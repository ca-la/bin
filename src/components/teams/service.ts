import uuid from "node-uuid";
import Knex from "knex";

import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import { Role } from "../team-users/types";
import TeamsDAO from "./dao";
import { Team, TeamType, TeamInput } from "./types";
import * as SubscriptionsDAO from "../subscriptions/dao";
import * as CollectionsDAO from "../collections/dao";
import {
  rawDao as PlansRawDAO,
  findFreeAndDefaultForTeams,
} from "../plans/dao";
import { PlanDb } from "../plans/types";
import { URLSearchParams } from "url";
import * as Teams from "./";
import { createSubscription } from "../subscriptions/create";

export async function createTeamWithOwnerAndSubscription(
  trx: Knex.Transaction,
  input: TeamInput,
  ownerUserId: string
): Promise<Team> {
  const team = await createTeamWithOwner(trx, input, ownerUserId);

  const freeDefaultPlan = await findFreeAndDefaultForTeams(trx);
  if (freeDefaultPlan) {
    await createSubscription(trx, {
      teamId: team.id,
      planId: freeDefaultPlan.id,
      stripeCardToken: null,
      isPaymentWaived: false,
    });
  }

  return team;
}

export async function createTeamWithOwner(
  trx: Knex.Transaction,
  input: TeamInput,
  ownerUserId: string
): Promise<Team> {
  const created = await TeamsDAO.create(trx, {
    id: input.id || uuid.v4(),
    title: input.title,
    createdAt: new Date(),
    deletedAt: null,
    type: TeamType.DESIGNER,
  });
  const createdUser = await RawTeamUsersDAO.create(trx, {
    teamId: created.id,
    userId: ownerUserId,
    userEmail: null,
    id: uuid.v4(),
    role: Role.OWNER,
    label: null,
    teamOrdering: 0,
    createdAt: new Date(),
    deletedAt: null,
    updatedAt: new Date(),
  });

  return {
    ...created,
    role: createdUser.role,
    teamUserId: createdUser.id,
    teamOrdering: createdUser.teamOrdering,
  };
}

export type CheckLimitResult =
  | {
      isReached: true;
      limit: number;
    }
  | {
      isReached: false;
    };

export async function checkCollectionsLimit(
  ktx: Knex,
  teamId: string
): Promise<CheckLimitResult> {
  const subscriptions = await SubscriptionsDAO.findForTeamWithPlans(
    ktx,
    teamId,
    { isActive: true }
  );

  if (subscriptions.length === 0) {
    return { isReached: false };
  }

  let limit: number | null = null;
  for (const subscription of subscriptions) {
    // if there's a subscription with no collections limitation,
    // limit is not exceeded
    if (subscription.plan.maximumCollections === null) {
      return { isReached: false };
    }
    if (limit === null || subscription.plan.maximumCollections > limit) {
      limit = subscription.plan.maximumCollections;
    }
  }
  // should never happen, but TS doesn't understand it
  if (limit === null) {
    return { isReached: false };
  }

  const count = await CollectionsDAO.count(ktx, {
    teamId,
    deletedAt: null,
  });

  return count >= limit ? { isReached: true, limit } : { isReached: false };
}

export interface UpgradeTeamBody {
  title: string;
  message: string;
  actionText: string;
  actionUrl: string;
}

export function generateUpgradeBody(
  teamId: string,
  message: string,
  {
    title = "Upgrade team",
    actionText = "Upgrade team",
    upgradePlan,
  }: {
    title?: string;
    actionText?: string;
    upgradePlan?: PlanDb;
  } = {}
): UpgradeTeamBody {
  const searchParams = new URLSearchParams({
    upgradingTeamId: teamId,
    ...(upgradePlan ? { planId: upgradePlan.id } : null),
  });

  return {
    title,
    message,
    actionText,
    actionUrl: `/subscribe?${searchParams.toString()}`,
  };
}

export async function generateUpgradeBodyDueToCollectionsLimit(
  ktx: Knex,
  teamId: string,
  limit: number
): Promise<UpgradeTeamBody> {
  const upgradePlan = await PlansRawDAO.findOne(ktx, {
    isPublic: true,
    maximumCollections: null,
  });

  return Teams.generateUpgradeBody(
    teamId,
    upgradePlan
      ? `In order to create more than ${limit} collections, you must first upgrade your team to ${upgradePlan.title}. Upgrading includes unlimited collections, collection costing, and more.`
      : `In order to create more than ${limit} collections, you must first upgrade your team.`,
    upgradePlan ? { upgradePlan } : {}
  );
}

export async function generateUpgradeBodyDueToUsersLimit(
  ktx: Knex,
  teamId: string,
  role: Role
): Promise<UpgradeTeamBody> {
  const upgradePlan = await PlansRawDAO.findOne(ktx, {
    isPublic: true,
    maximumSeatsPerTeam: null,
  });
  return Teams.generateUpgradeBody(
    teamId,
    `In order to add additional ${role.toLowerCase()} seats, you must first upgrade your team. Upgrading includes unlimited collections, collection costing, and more.`,
    upgradePlan ? { upgradePlan } : {}
  );
}

export async function generateUpgradeBodyDueToSubmitAttempt(
  ktx: Knex,
  teamId: string
): Promise<UpgradeTeamBody> {
  const upgradePlan = await PlansRawDAO.findOne(ktx, {
    isPublic: true,
    canSubmit: true,
  });

  return Teams.generateUpgradeBody(
    teamId,
    upgradePlan
      ? `In order to submit the collection, you must first upgrade your team to ${upgradePlan.title}.`
      : `In order to submit the collection, you must first upgrade your team.`,
    upgradePlan ? { upgradePlan } : {}
  );
}

export async function generateUpgradeBodyDueToCheckoutAttempt(
  ktx: Knex,
  teamId: string
): Promise<UpgradeTeamBody> {
  const upgradePlan = await PlansRawDAO.findOne(ktx, {
    isPublic: true,
    canCheckOut: true,
  });

  return Teams.generateUpgradeBody(
    teamId,
    upgradePlan
      ? `In order to check out the collection, you must first upgrade your team to ${upgradePlan.title}.`
      : `In order to check out the collection, you must first upgrade your team.`,
    upgradePlan ? { upgradePlan } : {}
  );
}

export function generateUpgradeBodyDueToMissingSubscription(
  teamId: string
): UpgradeTeamBody {
  return Teams.generateUpgradeBody(
    teamId,
    "This team does not have an active subscription."
  );
}
