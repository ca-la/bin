import uuid from "node-uuid";
import { isEqual, sortBy } from "lodash";

import createUser from "../../test-helpers/create-user";
import db from "../../services/db";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as CollectionsDAO from "../collections/dao";
import TeamUsersDAO, { rawDao as RawTeamUsersDAO } from "./dao";
import TeamsDAO from "../teams/dao";
import { TeamType } from "../teams/types";
import { Role } from "./types";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { generateTeam } from "../../test-helpers/factories/team";
import { TeamUserRole } from ".";
import ConflictError from "../../errors/conflict";
import createDesign from "../../services/create-design";

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
      label: null,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    try {
      await RawTeamUsersDAO.create(trx, {
        id: uuid.v4(),
        userId: null,
        userEmail: "foo@example.com",
        teamId: team.id,
        role: Role.EDITOR,
        label: null,
        createdAt: testDate,
        deletedAt: null,
        updatedAt: testDate,
      });
      t.fail("should throw error on conflict");
    } catch (err) {
      t.true(
        isEqual(
          err,
          new ConflictError("This user is already a member of the team")
        ),
        "throws ConflictError if user already exists"
      );
    }

    await TeamUsersDAO.deleteById(trx, invited.id);

    const recreationDate = new Date(2012, 11, 30);
    sandbox().useFakeTimers(recreationDate);

    const revived = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "foo@example.com",
      teamId: team.id,
      role: Role.ADMIN,
      label: null,
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
      label: null,
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
      label: null,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    const deletedTeamUser = await TeamUsersDAO.deleteById(trx, created.id);

    t.deepEqual(
      deletedTeamUser,
      {
        ...created,
        deletedAt: testDate,
      },
      "returns deleted team user"
    );

    const invited = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "test@example.com",
      teamId: team.id,
      role: Role.VIEWER,
      label: null,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    const deletedInviteeUser = await TeamUsersDAO.deleteById(trx, invited.id);

    t.deepEqual(
      deletedInviteeUser,
      {
        ...invited,
        deletedAt: testDate,
      },
      "returns deleted invitee user"
    );
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
      label: null,
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
      label: null,
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

test("TeamUsersDAO.transferOwnership", async (t: Test) => {
  const { user: u0 } = await createUser({ withSession: false });
  const { user: u1 } = await createUser({ withSession: false });
  const { user: u2 } = await createUser({ withSession: false });
  const trx = await db.transaction();

  try {
    const team = await TeamsDAO.create(trx, {
      id: uuid.v4(),
      title: "Test Team",
      createdAt: testDate,
      deletedAt: null,
      type: TeamType.DESIGNER,
    });

    const oldOwner = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: u0.id,
      userEmail: null,
      teamId: team.id,
      role: Role.OWNER,
      label: null,
      createdAt: new Date(2012, 11, 21),
      deletedAt: null,
      updatedAt: new Date(2012, 11, 21),
    });

    const rando = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: u1.id,
      userEmail: null,
      teamId: team.id,
      role: Role.EDITOR,
      label: null,
      createdAt: new Date(2012, 11, 22),
      deletedAt: null,
      updatedAt: new Date(2012, 11, 22),
    });

    const newOwner = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: u2.id,
      userEmail: null,
      teamId: team.id,
      role: Role.VIEWER,
      label: null,
      createdAt: new Date(2012, 11, 23),
      deletedAt: null,
      updatedAt: new Date(2012, 11, 23),
    });

    const invited = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "invited@example.com",
      teamId: team.id,
      role: Role.EDITOR,
      label: null,
      createdAt: new Date(2012, 11, 24),
      deletedAt: null,
      updatedAt: new Date(2012, 11, 24),
    });

    await TeamUsersDAO.transferOwnership(trx, newOwner.id);

    t.deepEqual(
      await RawTeamUsersDAO.find(trx, { teamId: team.id }),
      [
        { ...oldOwner, role: Role.ADMIN },
        rando,
        { ...newOwner, role: Role.OWNER },
        invited,
      ],
      "sets new owner and makes old owner an admin"
    );

    try {
      await TeamUsersDAO.transferOwnership(trx, uuid.v4());
      t.fail("missing users should reject");
    } catch (err) {
      t.true(
        err instanceof ResourceNotFoundError,
        "rejects when attempting to set on unknown user"
      );
    }

    try {
      await TeamUsersDAO.transferOwnership(trx, invited.id);
      t.fail("Invited members should not be set to owner");
    } catch (err) {
      t.true(
        err instanceof ResourceNotFoundError,
        "rejects when attempting to set on invited user"
      );
    }
  } finally {
    await trx.rollback();
  }
});

test("TeamUsersDAO.findByUserAndDesign", async (t: Test) => {
  const trx = await db.transaction();
  const { user: owner } = await createUser({ withSession: false });
  const { user: user1 } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });
  const { user: user3 } = await createUser({ withSession: false });
  const { user: user4 } = await createUser({ withSession: false });
  const { team, teamUser: tu1 } = await generateTeam(
    user1.id,
    {},
    {
      role: TeamUserRole.ADMIN,
    }
  );

  try {
    const tu2 = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.EDITOR,
      label: null,
      teamId: team.id,
      userId: user2.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
    const tu3 = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.VIEWER,
      label: null,
      teamId: team.id,
      userId: user3.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.VIEWER,
      label: null,
      teamId: team.id,
      userId: user4.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    const collection = await CollectionsDAO.create(
      {
        createdAt: new Date(),
        createdBy: owner.id,
        deletedAt: null,
        description: null,
        id: uuid.v4(),
        teamId: team.id,
        title: "C1",
      },
      trx
    );
    const design1 = await createDesign(
      {
        productType: "TEE",
        title: "My Tee",
        userId: owner.id,
        collectionIds: [collection.id],
      },
      trx
    );

    t.deepEqual(
      await TeamUsersDAO.findByUserAndDesign(trx, user1.id, design1.id),
      [
        {
          ...tu1,
          user: user1,
        },
      ],
      "returns the team user"
    );

    t.deepEqual(
      await TeamUsersDAO.findByUserAndDesign(trx, user2.id, design1.id),
      [
        {
          ...tu2,
          user: user2,
        },
      ],
      "returns the team user"
    );

    t.deepEqual(
      await TeamUsersDAO.findByUserAndDesign(trx, user3.id, design1.id),
      [
        {
          ...tu3,
          user: user3,
        },
      ],
      "returns the team user"
    );

    t.deepEqual(
      await TeamUsersDAO.findByUserAndDesign(trx, user4.id, design1.id),
      [],
      "does not return the deleted team user"
    );

    t.deepEqual(
      await TeamUsersDAO.findByUserAndDesign(trx, owner.id, design1.id),
      [],
      "does not return the non team user"
    );
  } finally {
    await trx.rollback();
  }
});

test("TeamUsersDAO.findByUserAndCollection", async (t: Test) => {
  const trx = await db.transaction();
  const { user: owner } = await createUser({ withSession: false });
  const { user: user1 } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });
  const { user: user3 } = await createUser({ withSession: false });
  const { user: user4 } = await createUser({ withSession: false });
  const { team, teamUser: tu1 } = await generateTeam(
    user1.id,
    {},
    {
      role: TeamUserRole.ADMIN,
    }
  );

  try {
    const tu2 = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.EDITOR,
      label: null,
      teamId: team.id,
      userId: user2.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
    const tu3 = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.VIEWER,
      label: null,
      teamId: team.id,
      userId: user3.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.VIEWER,
      label: null,
      teamId: team.id,
      userId: user4.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    const collection = await CollectionsDAO.create({
      createdAt: new Date(),
      createdBy: owner.id,
      deletedAt: null,
      description: null,
      id: uuid.v4(),
      teamId: team.id,
      title: "C1",
    });

    t.deepEqual(
      await TeamUsersDAO.findByUserAndCollection(trx, user1.id, collection.id),
      [
        {
          ...tu1,
          user: user1,
        },
      ],
      "returns the team user"
    );

    t.deepEqual(
      await TeamUsersDAO.findByUserAndCollection(trx, user2.id, collection.id),
      [
        {
          ...tu2,
          user: user2,
        },
      ],
      "returns the team user"
    );

    t.deepEqual(
      await TeamUsersDAO.findByUserAndCollection(trx, user3.id, collection.id),
      [
        {
          ...tu3,
          user: user3,
        },
      ],
      "returns the team user"
    );

    t.deepEqual(
      await TeamUsersDAO.findByUserAndCollection(trx, user4.id, collection.id),
      [],
      "does not return the deleted team user"
    );

    t.deepEqual(
      await TeamUsersDAO.findByUserAndCollection(trx, owner.id, collection.id),
      [],
      "does not return the non team user"
    );
  } finally {
    await trx.rollback();
  }
});

test("TeamUsersDAO.countBilledUsers", async (t: Test) => {
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

    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "admin@example.com",
      teamId: team.id,
      role: Role.ADMIN,
      label: null,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "editor@example.com",
      teamId: team.id,
      role: Role.EDITOR,
      label: null,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "deleted@example.com",
      teamId: team.id,
      role: Role.EDITOR,
      label: null,
      createdAt: testDate,
      deletedAt: testDate,
      updatedAt: testDate,
    });

    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "viewer@example.com",
      teamId: team.id,
      role: Role.VIEWER,
      label: null,
      createdAt: testDate,
      deletedAt: null,
      updatedAt: testDate,
    });

    t.equal(
      await TeamUsersDAO.countBilledUsers(trx, team.id),
      2,
      "counts non viewers that are not deleted"
    );
    t.equal(
      await TeamUsersDAO.countBilledUsers(trx, uuid.v4()),
      0,
      "returns zero for non-existent team"
    );
  } finally {
    await trx.rollback();
  }
});

test("TeamUsersDAO.findByDesign", async (t: Test) => {
  const trx = await db.transaction();

  const { user: user1 } = await createUser({ withSession: false });
  const { team, teamUser: tu1 } = await generateTeam(
    user1.id,
    {},
    {
      role: TeamUserRole.ADMIN,
    }
  );

  // team 2 is not associated with collection - team users shouldn't appear in the list
  const { user: userForTeam2 } = await createUser({ withSession: false });
  const { team: team2 } = await generateTeam(
    userForTeam2.id,
    {},
    {
      role: TeamUserRole.ADMIN,
    }
  );

  try {
    const { user: user2 } = await createUser({ withSession: false });
    const tu2 = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.EDITOR,
      label: null,
      teamId: team.id,
      userId: user2.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    const { user: user3 } = await createUser({ withSession: false });
    const tu3 = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.VIEWER,
      label: null,
      teamId: team.id,
      userId: user3.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    const { user: user4 } = await createUser({ withSession: false });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.VIEWER,
      label: null,
      teamId: team.id,
      userId: user4.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    const { user: team2User } = await createUser({ withSession: false });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.EDITOR,
      label: null,
      teamId: team2.id,
      userId: team2User.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    const { user: owner } = await createUser({ withSession: false });
    const collection = await CollectionsDAO.create({
      createdAt: new Date(),
      createdBy: owner.id,
      deletedAt: null,
      description: null,
      id: uuid.v4(),
      teamId: team.id,
      title: "C1",
    });
    const design1 = await createDesign({
      productType: "TEE",
      title: "My Tee",
      userId: owner.id,
      collectionIds: [collection.id],
    });

    t.deepEqual(
      await TeamUsersDAO.findByDesign(trx, uuid.v4()),
      [],
      "no team-users for random design"
    );
    const teamUsers = await TeamUsersDAO.findByDesign(trx, design1.id);

    t.deepEqual(sortBy(teamUsers, "createdAt"), [
      { ...tu1, user: user1 },
      { ...tu2, user: user2 },
      { ...tu3, user: user3 },
    ]);
  } finally {
    await trx.rollback();
  }
});
