import uuid from "node-uuid";
import Knex from "knex";
import { sortBy } from "lodash";

import { test, Test } from "../../../test-helpers/fresh";
import db from "../../../services/db";
import createUser = require("../../../test-helpers/create-user");

import * as CohortsDAO from "../dao";
import * as CohortUsersDAO from "./dao";

test("CohortUsers DAO supports creation and retrieval", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: otherUser } = await createUser({ withSession: false });
  const cohort = await CohortsDAO.create({
    createdBy: user.id,
    description: "A bunch of delightful designers",
    id: uuid.v4(),
    slug: "moma-demo-june-2020",
    title: "MoMA Demo Participants",
  });

  const created = await CohortUsersDAO.create({
    cohortId: cohort.id,
    userId: user.id,
  });
  const createdOther = await CohortUsersDAO.create({
    cohortId: cohort.id,
    userId: otherUser.id,
  });

  const foundByCohort = await CohortUsersDAO.findAllByCohort(cohort.id);
  const foundByUser = await CohortUsersDAO.findAllByUser(user.id);

  t.deepEqual(
    sortBy(foundByCohort, ["userId"]),
    sortBy([created, createdOther], ["userId"]),
    "Is retrievable by cohort ID"
  );
  t.deepEqual(foundByUser, [created], "Is retrievable by user ID");
});

test("CohortUsers DAO supports creation and retrieval in a transaction", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: otherUser } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const cohort = await CohortsDAO.create(
      {
        createdBy: user.id,
        description: "A bunch of delightful designers",
        id: uuid.v4(),
        slug: "moma-demo-june-2020",
        title: "MoMA Demo Participants",
      },
      trx
    );

    const created = await CohortUsersDAO.create(
      {
        cohortId: cohort.id,
        userId: user.id,
      },
      trx
    );
    const createdOther = await CohortUsersDAO.create(
      {
        cohortId: cohort.id,
        userId: otherUser.id,
      },
      trx
    );

    const foundByCohort = await CohortUsersDAO.findAllByCohort(cohort.id, trx);
    const foundByUser = await CohortUsersDAO.findAllByUser(user.id, trx);

    t.deepEqual(
      sortBy(foundByCohort, ["userId"]),
      sortBy([created, createdOther], ["userId"]),
      "Is retrievable by cohort ID"
    );
    t.deepEqual(foundByUser, [created], "Is retrievable by user ID");
  });
});
