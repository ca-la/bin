import uuid from "node-uuid";
import Knex from "knex";

import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import { Role } from "../team-users/types";
import TeamsDAO from "./dao";
import { Team, TeamType } from "./types";
import * as SubscriptionsDAO from "../subscriptions/dao";
import * as CollectionsDAO from "../collections/dao";

export async function createTeamWithOwner(
  trx: Knex.Transaction,
  title: string,
  ownerUserId: string
): Promise<Team> {
  const created = await TeamsDAO.create(trx, {
    id: uuid.v4(),
    title,
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
    createdAt: new Date(),
    deletedAt: null,
    updatedAt: new Date(),
  });

  return { ...created, role: createdUser.role, teamUserId: createdUser.id };
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
