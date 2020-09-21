import Knex from "knex";
import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import { TeamDb, TeamType } from "./types";
import { TeamUserDb, Role } from "../team-users/types";
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";

import { listeners } from "./listeners";

function setup() {
  const created: TeamDb = {
    id: "a-team-id",
    title: "A team name",
    createdAt: new Date(),
    deletedAt: null,
    type: TeamType.DESIGNER,
  };

  const admin: TeamUserDb = {
    id: "a-team-user-id",
    teamId: "a-team-id",
    userId: "a-user-id",
    role: Role.ADMIN,
  };

  return {
    created,
    admin,
    stubs: {
      uuidStub: sandbox().stub(uuid, "v4").returns("a-team-user-id"),
      createTeamUserStub: sandbox()
        .stub(RawTeamUsersDAO, "create")
        .resolves(admin),
      trxStub: (sandbox().stub() as unknown) as Knex.Transaction,
    },
  };
}

test("Team listener: route.created", async (t: Test) => {
  const { created, admin, stubs } = setup();

  await listeners["route.created"]!({
    domain: "Team",
    actorId: "a-user-id",
    type: "route.created",
    trx: stubs.trxStub,
    created,
  });

  t.deepEqual(
    stubs.createTeamUserStub.args,
    [[stubs.trxStub, admin]],
    "creates an admin TeamUser for the team creator"
  );
});
