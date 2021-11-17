import tape from "tape";
import uuid from "node-uuid";
import Knex from "knex";

import { test } from "../../test-helpers/fresh";
import { create } from "../../components/comments/dao";
import createUser = require("../../test-helpers/create-user");
import addAtMentionDetails from ".";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import generateCollection from "../../test-helpers/factories/collection";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import db from "../db";
import { generateTeam } from "../../test-helpers/factories/team";
import { generateTeamUser } from "../../test-helpers/factories/team-user";
import { RawTeamUsersDAO } from "../../components/team-users";
import { Role as TeamUserRole } from "../../components/team-users/types";

test("addAtMentionDetails adds null when there are no at mentions", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment with no @<${uuid.v4()}|fooBar> mentions`,
    userId: user.id,
  });

  const result = await db.transaction((trx: Knex.Transaction) =>
    addAtMentionDetails(trx, [comment])
  );
  t.deepEqual(result[0].mentions, {}, "comments mentions are null");
});

test("addAtMentionDetails adds details when there is an at mention", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const { collection } = await generateCollection();
  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id,
  });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator> with mentions`,
    userId: user.id,
  });

  const result = await db.transaction((trx: Knex.Transaction) =>
    addAtMentionDetails(trx, [comment])
  );
  const { mentions } = result[0];

  t.deepEqual(
    mentions[collaborator.id],
    user.name,
    "comments mention has correct name as value"
  );
});

test("addAtMentionDetails adds details when there is an at mention even for a removed collaborator", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const { collection } = await generateCollection();
  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id,
  });
  await CollaboratorsDAO.deleteById(collaborator.id);

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator> with mentions`,
    userId: user.id,
  });

  const result = await db.transaction((trx: Knex.Transaction) =>
    addAtMentionDetails(trx, [comment])
  );
  const { mentions } = result[0];

  t.deepEqual(
    mentions[collaborator.id],
    user.name,
    "comments mention has correct name as value"
  );
});

test("addAtMentionDetails can add details when there is an at mention for an unknown collaborator", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const randomId = uuid.v4();

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${randomId}|collaborator> with mentions`,
    userId: user.id,
  });

  const result = await db.transaction((trx: Knex.Transaction) =>
    addAtMentionDetails(trx, [comment])
  );
  const { mentions } = result[0];

  t.deepEqual(
    mentions[randomId],
    "Unknown",
    "comments mention has correct name as value"
  );
});

test("addAtMentionDetails adds details for multiple at mentions", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: u2 } = await createUser({ withSession: false });
  const { collection } = await generateCollection();

  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id,
  });
  const { collaborator: c2 } = await generateCollaborator({
    collectionId: collection.id,
    userId: u2.id,
  });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator> with mentions @<${c2.id}|collaborator>`,
    userId: user.id,
  });

  const result = await db.transaction((trx: Knex.Transaction) =>
    addAtMentionDetails(trx, [comment])
  );
  const { mentions } = result[0];

  t.deepEqual(
    mentions[collaborator.id],
    user.name,
    "comments mention 1 has correct name as value"
  );
  t.deepEqual(
    mentions[c2.id],
    u2.name,
    "comments mention 2 has correct name as value"
  );
});

test("addAtMentionDetails adds single detail for multiple at mentions of single user", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection();

  const { collaborator: c1 } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id,
  });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${c1.id}|collaborator> with mentions @<${c1.id}|collaborator>`,
    userId: user.id,
  });

  const result = await db.transaction((trx: Knex.Transaction) =>
    addAtMentionDetails(trx, [comment])
  );
  const { mentions } = result[0];

  t.deepEqual(
    mentions[c1.id],
    user.name,
    "comments mention 1 has correct name as value"
  );
  t.deepEqual(
    Object.keys(mentions).length,
    1,
    "comments mentions has only 1 value"
  );
});

test("addAtMentionDetails adds details for deleted and non-registered team users", async (t: tape.Test) => {
  const { user: adminUser } = await createUser({ withSession: false });

  const { team, teamUser: adminTeamUser } = await generateTeam(adminUser.id);
  const {
    teamUser: deletedTeamUser,
    user: deletedUser,
  } = await generateTeamUser({
    teamId: team.id,
    deletedAt: new Date(),
  });

  const trx = await db.transaction();
  try {
    const nonRegisteredTeamUser = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.ADMIN,
      teamOrdering: 0,
      label: null,
      userEmail: "testing@example.com",
      userId: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
      teamId: team.id,
    });

    const comment = await create({
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      isPinned: false,
      parentCommentId: null,
      text: `Me: @<${adminTeamUser.id}|teamUser>. Deleted: @<${deletedTeamUser.id}|teamUser>. Unregistered: @<${nonRegisteredTeamUser.id}|teamUser>!`,
      userId: adminUser.id,
    });

    const result = await addAtMentionDetails(trx, [comment]);
    const { mentions } = result[0];

    t.deepEqual(
      mentions[adminTeamUser.id],
      adminUser.name,
      "attaches valid team user"
    );
    t.deepEqual(
      mentions[deletedTeamUser.id],
      deletedUser!.user.name,
      "attaches deleted team user name"
    );
    t.deepEqual(
      mentions[nonRegisteredTeamUser.id],
      "testing@example.com",
      "attaches unregistered team user email"
    );
  } finally {
    trx.rollback();
  }
});
