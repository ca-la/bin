import uuid from "node-uuid";

import createUser from "../../test-helpers/create-user";
import db from "../../services/db";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import TeamUsersDAO, { rawDao as RawTeamUsersDAO } from "./dao";
import TeamsDAO from "../teams/dao";
import { TeamType } from "../teams/types";
import { Role } from "./types";

const testDate = new Date(2012, 11, 25);

test("RawTeamUsersDAO.create", async (t: Test) => {
  const trx = await db.transaction();

  try {
    sandbox().useFakeTimers(testDate);
    const team = await TeamsDAO.create(trx, {
      id: uuid.v4(),
      title: "Test Team",
      createdAt: testDate,
      deletedAt: null,
      type: TeamType.DESIGNER,
    });

    const invited = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "foo@example.com",
      teamId: team.id,
      role: Role.ADMIN,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    const upserted = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "foo@example.com",
      teamId: team.id,
      role: Role.EDITOR,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    t.deepEqual(
      upserted,
      { ...invited, role: Role.EDITOR },
      "creating with existing row updates that row"
    );

    await TeamUsersDAO.deleteById(trx, invited.id);

    const recreationDate = new Date(2012, 11, 30);
    sandbox().useFakeTimers(recreationDate);

    const revived = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "foo@example.com",
      teamId: team.id,
      role: Role.ADMIN,
      createdAt: recreationDate,
      deletedAt: null,
      updatedAt: recreationDate,
    });

    t.deepEqual(
      revived,
      { ...invited, updatedAt: new Date() },
      "reuses existing deleted row if present"
    );
  } finally {
    await trx.rollback();
  }
});

test("TeamUsersDAO.claimAllByEmail", async (t: Test) => {
  const trx = await db.transaction();
  const { user } = await createUser({ withSession: false });

  try {
    const team = await TeamsDAO.create(trx, {
      id: uuid.v4(),
      title: "Test Team",
      createdAt: new Date(),
      deletedAt: null,
      type: TeamType.DESIGNER,
    });

    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "foo@example.com",
      teamId: team.id,
      role: Role.ADMIN,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    const claimed = await TeamUsersDAO.claimAllByEmail(
      trx,
      "foo@example.com",
      user.id
    );

    t.equal(claimed.length, 1, "Claims and returns a user");
    t.equal(claimed[0].userEmail, null);
    t.equal(claimed[0].userId, user.id);

    const claimed2 = await TeamUsersDAO.claimAllByEmail(
      trx,
      "another@example.com",
      user.id
    );
    t.equal(claimed2.length, 0, "Claims no results for a non-matching email");
  } finally {
    await trx.rollback();
  }
});

test("TeamUsersDAO.deleteById", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  const trx = await db.transaction();
  const { user } = await createUser({ withSession: false });

  try {
    const team = await TeamsDAO.create(trx, {
      id: uuid.v4(),
      title: "Test Team",
      createdAt: testDate,
      deletedAt: null,
      type: TeamType.DESIGNER,
    });

    const created = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: user.id,
      userEmail: null,
      teamId: team.id,
      role: Role.ADMIN,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    const deletedCount = await TeamUsersDAO.deleteById(trx, created.id);

    t.equal(deletedCount, 1, "returns count of deleted users");

    const invited = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "test@example.com",
      teamId: team.id,
      role: Role.VIEWER,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    const invitedDeleteCount = await TeamUsersDAO.deleteById(trx, invited.id);

    t.equal(invitedDeleteCount, 1, "returns count of deleted users");
  } finally {
    await trx.rollback();
  }
});

test("TeamUsersDAO.find", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  const trx = await db.transaction();
  const { user } = await createUser({ withSession: false });

  try {
    const team = await TeamsDAO.create(trx, {
      id: uuid.v4(),
      title: "Test Team",
      createdAt: testDate,
      deletedAt: null,
      type: TeamType.DESIGNER,
    });

    const teamUser = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: user.id,
      userEmail: null,
      teamId: team.id,
      role: Role.ADMIN,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    const found = await TeamUsersDAO.find(trx, {
      teamId: team.id,
    });

    t.deepEqual(
      found,
      [{ ...teamUser, user }],
      "finds team users that are not deleted"
    );

    await TeamUsersDAO.deleteById(trx, teamUser.id);
    const foundDeleted = await TeamUsersDAO.find(trx, {
      teamId: team.id,
    });

    t.deepEqual(foundDeleted, [], "does not find deleted users");
  } finally {
    await trx.rollback();
  }
});

test("TeamUsersDAO.findByUserAndTeam", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  const trx = await db.transaction();
  const { user } = await createUser({ withSession: false });

  try {
    const team = await TeamsDAO.create(trx, {
      id: uuid.v4(),
      title: "Test Team",
      createdAt: testDate,
      deletedAt: null,
      type: TeamType.DESIGNER,
    });

    const teamUser = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: user.id,
      userEmail: null,
      teamId: team.id,
      role: Role.ADMIN,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    const found = await TeamUsersDAO.findByUserAndTeam(trx, {
      userId: user.id,
      userEmail: null,
      teamId: team.id,
    });

    t.deepEqual(
      found,
      { ...teamUser, user },
      "finds team users that are not deleted"
    );

    const notFoundUser = await TeamUsersDAO.findByUserAndTeam(trx, {
      userId: uuid.v4(),
      userEmail: null,
      teamId: team.id,
    });

    t.equal(notFoundUser, null, "returns null for missing user");

    const notFoundTeam = await TeamUsersDAO.findByUserAndTeam(trx, {
      userId: user.id,
      userEmail: null,
      teamId: uuid.v4(),
    });

    t.equal(notFoundTeam, null, "returns null for missing team");

    await TeamUsersDAO.deleteById(trx, teamUser.id);
    const foundDeleted = await TeamUsersDAO.findByUserAndTeam(trx, {
      userId: user.id,
      userEmail: null,
      teamId: team.id,
    });

    t.deepEqual(
      foundDeleted,
      { ...teamUser, user, deletedAt: testDate },
      "finds deleted TeamUser"
    );
  } finally {
    await trx.rollback();
  }
});
