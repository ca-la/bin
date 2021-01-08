import uuid from "node-uuid";
import Knex from "knex";

import { create } from "../../components/collections/dao";
import CollectionDb from "../../components/collections/domain-object";
import { findById as findUserById } from "../../components/users/dao";
import createUser = require("../create-user");

interface CollectionWithResources {
  collection: CollectionDb;
  createdBy: any;
}

export default async function generateCollection(
  options: Partial<CollectionDb> = {},
  trx?: Knex.Transaction
): Promise<CollectionWithResources> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });

  const collection = await create(
    {
      createdAt: options.createdAt || new Date(),
      createdBy: user.id,
      deletedAt: options.deletedAt || null,
      description: options.description || null,
      id: options.id || uuid.v4(),
      teamId: options.teamId || null,
      title: options.title || null,
    },
    trx
  );

  return { collection, createdBy: user };
}
