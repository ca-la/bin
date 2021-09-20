import Knex from "knex";
import uuid from "node-uuid";

import { adapter } from "./adapter";
import { UserFeature, UserFeatureRow } from "./types";

const TABLE_NAME = "user_features";

export async function create(
  trx: Knex.Transaction,
  userId: string,
  featureName: string
): Promise<UserFeature> {
  const data: UserFeatureRow = {
    id: uuid.v4(),
    created_at: new Date(),
    deleted_at: null,
    name: featureName,
    user_id: userId,
  };

  const result = await trx(TABLE_NAME).insert(data).returning("*");

  if (result.length !== 1) {
    throw new Error(
      `There was a problem creating feature "${featureName}" for user "${userId}"`
    );
  }

  return adapter.fromDb(result[0]);
}

export async function deleteByUserAndFeature(
  trx: Knex.Transaction,
  userId: string,
  featureName: string
): Promise<UserFeature> {
  const result = await trx(TABLE_NAME)
    .update({ deleted_at: new Date() })
    .returning("*")
    .where({
      user_id: userId,
      name: featureName,
      deleted_at: null,
    });

  if (result.length !== 1) {
    throw new Error(
      `There was a problem deleting feature "${featureName}" for user "${userId}"`
    );
  }

  return adapter.fromDb(result[0]);
}

export async function findNamesByUser(
  ktx: Knex,
  userId: string
): Promise<string[]> {
  const features = await ktx(TABLE_NAME)
    .select<{ name: string }[]>("name")
    .where({ user_id: userId, deleted_at: null });

  return features.map(({ name }: { name: string }) => name);
}
