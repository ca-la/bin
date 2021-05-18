import uuid from "node-uuid";
import Knex from "knex";

import { create } from "../../components/collections/dao";
import CollectionDb from "../../components/collections/domain-object";
import { findById as findUserById } from "../../components/users/dao";
import TeamsDAO from "../../components/teams/dao";
import createUser = require("../create-user");
import { generateTeam } from "./team";
import db = require("../../services/db");

export default async function generateCollection(
  options: Partial<CollectionDb> = {},
  trx?: Knex.Transaction
) {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });

  const { team } = options.teamId
    ? { team: await TeamsDAO.findById(trx || db, options.teamId) }
    : await generateTeam(user.id);

  if (!team) {
    throw new Error("Could not find or create team for collection");
  }

  const collection = await create(
    {
      createdAt: new Date(),
      createdBy: user.id,
      deletedAt: null,
      description: null,
      id: uuid.v4(),
      teamId: team.id,
      title: null,
      ...options,
    },
    trx
  );

  return { collection, createdBy: user, team };
}
