import uuid from "node-uuid";
import db from "../../services/db";
import { test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";

import TeamUsersDAO from "../team-users/dao";
import { Role } from "../team-users/types";
import TeamsDAO from "./dao";

test("TeamsDAO.findByUser", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const trx = await db.transaction();
  try {
    const [t0, t1] = await TeamsDAO.createAll(trx, [
      {
        id: uuid.v4(),
        title: "Team Zero",
        createdAt: new Date(),
        deletedAt: null,
      },
      {
        id: uuid.v4(),
        title: "Team One",
        createdAt: new Date(),
        deletedAt: null,
      },
      {
        id: uuid.v4(),
        title: "Team Two",
        createdAt: new Date(),
        deletedAt: null,
      },
    ]);

    await TeamUsersDAO.createAll(trx, [
      { id: uuid.v4(), userId: user.id, teamId: t0.id, role: Role.ADMIN },
      { id: uuid.v4(), userId: user.id, teamId: t1.id, role: Role.EDITOR },
    ]);

    t.deepEqual(
      await TeamsDAO.findByUser(trx, user.id),
      [t0, t1],
      "Finds only teams that a user is a part of"
    );

    t.deepEqual(
      await TeamsDAO.findByUser(trx, uuid.v4()),
      [],
      "Returns empty array when no teams are found for the user"
    );
  } finally {
    await trx.rollback();
  }
});
