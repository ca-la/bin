import uuid from "node-uuid";
import Knex from "knex";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import { Role } from "../team-users/types";

import TeamsDAO from "./dao";
import { TeamType, TeamDb } from "./types";
import * as TeamsService from "./service";

const testDate = new Date(2012, 11, 23);
const t1: TeamDb = {
  id: "a-team-id",
  title: "A team",
  createdAt: testDate,
  deletedAt: null,
  type: TeamType.DESIGNER,
};

test("createTeamWithOwner", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  sandbox().stub(uuid, "v4").returns("a-uuid");
  const createTeamStub = sandbox().stub(TeamsDAO, "create").resolves(t1);
  const createTeamUserStub = sandbox()
    .stub(RawTeamUsersDAO, "create")
    .resolves();

  const created = await db.transaction((trx: Knex.Transaction) =>
    TeamsService.createTeamWithOwner(trx, "A team title", "a-user-id")
  );

  t.deepEqual(created, t1, "returns the raw created team");
  t.deepEqual(
    createTeamStub.args[0].slice(1),
    [
      {
        id: "a-uuid",
        title: "A team title",
        createdAt: testDate,
        deletedAt: null,
        type: TeamType.DESIGNER,
      },
    ],
    "creates a team"
  );
  t.deepEqual(
    createTeamUserStub.args[0].slice(1),
    [
      {
        teamId: "a-team-id",
        userId: "a-user-id",
        userEmail: null,
        id: "a-uuid",
        role: Role.OWNER,
        createdAt: testDate,
        updatedAt: testDate,
        deletedAt: null,
      },
    ],
    "creates the team owner"
  );
});
