import uuid from "node-uuid";
import Knex from "knex";
import { test, Test } from "../../test-helpers/fresh";
import { addDesign } from "../../test-helpers/collections";
import generateCollaborator from "../../test-helpers/factories/collaborator";

import createDesign from "../../services/create-design";
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import * as CollectionsDAO from "../collections/dao";
import * as UsersDAO from "../users/dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import db from "../../services/db";

import * as ParticipantsDAO from "./dao";
import { generateTeam } from "../../test-helpers/factories/team";
import { MentionType } from "../comments/types";
import { Role as UserRole } from "../users/types";
import { TeamUserRole } from "../../published-types";

const createUser = (name: string, role: UserRole = "USER") =>
  UsersDAO.create({
    name,
    email: `${uuid.v4()}@example.com`,
    role,
    password: "password",
    referralCode: "freebie",
  });

async function setup() {
  const user = await createUser("Designer");
  const user2 = await createUser("Design Collaborator");
  const user3 = await createUser("Collection Collaborator");
  const user4 = await createUser("Cancelled Collection Collaborator");
  const user5 = await createUser("Cancelled Design Collaborator");
  const teamAdmin = await createUser("Team Admin");
  const teamViewer = await createUser("Team Viewer");
  const partnerTeamAdmin = await createUser("Partner Team Admin", "PARTNER");
  const otherTeamAdmin = await createUser("Other Team Admin", "PARTNER");

  const { team, teamUser: teamUser1 } = await generateTeam(teamAdmin.id);
  const {
    team: partnerTeam,
    teamUser: partnerAdminTeamUser,
  } = await generateTeam(partnerTeamAdmin.id);
  await generateTeam(otherTeamAdmin.id);
  const design = await createDesign({
    productType: "BOMBER",
    title: "AW19",
    userId: user.id,
  });
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "",
    id: uuid.v4(),
    teamId: team.id,
    title: "AW19",
  });

  await addDesign(collection.id, design.id);

  const otherDesign = await createDesign({
    productType: "BOMBER",
    title: "AW20",
    userId: user.id,
  });
  const otherCollection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "",
    id: uuid.v4(),
    teamId: null,
    title: "AW20",
  });

  await addDesign(otherCollection.id, otherDesign.id);
  const teamUser2 = await db.transaction((trx: Knex.Transaction) =>
    RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.OWNER,
      teamId: team.id,
      userId: teamViewer.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    })
  );
  const teamUser3 = await db.transaction((trx: Knex.Transaction) =>
    RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.OWNER,
      teamId: team.id,
      userId: null,
      userEmail: "non-user-team-user@example.com",
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    })
  );

  const { collaborator: designCollaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user2.id,
  });
  const { collaborator: collectionCollaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user3.id,
  });
  await generateCollaborator({
    collectionId: otherCollection.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user3.id,
  });
  await generateCollaborator({
    collectionId: null,
    designId: otherDesign.id,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user2.id,
  });
  const {
    collaborator: cancelledCollectionCollaborator,
  } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    cancelledAt: new Date(),
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user4.id,
  });
  const {
    collaborator: cancelledDesignCollaborator,
  } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    cancelledAt: new Date(),
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user5.id,
  });
  const { collaborator: nonUserCollaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: "",
    role: "EDIT",
    userEmail: "non-user-collaborator@example.com",
    userId: null,
  });
  const { collaborator: teamCollaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    cancelledAt: null,
    invitationMessage: "",
    role: "PARTNER",
    userEmail: null,
    userId: null,
    teamId: partnerTeam.id,
  });

  return {
    collection,
    design,
    team,
    collaborators: {
      designerCollaborator: await CollaboratorsDAO.findByDesignAndUser(
        design.id,
        user.id
      ),
      designCollaborator,
      collectionCollaborator,
      cancelledCollectionCollaborator,
      cancelledDesignCollaborator,
      teamCollaborator,
      nonUserCollaborator,
    },
    teamUsers: {
      partnerTeam: partnerAdminTeamUser,
      admin: teamUser1,
      viewer: teamUser2,
      nonUser: teamUser3,
    },
    users: [user, user2, user3, user4, user5],
  };
}

test("ParticipantsDAO.findByDesign", async (t: Test) => {
  const state = await setup();
  const trx = await db.transaction();

  try {
    const participants = await ParticipantsDAO.findByDesign(
      trx,
      state.design.id
    );

    t.deepEquals(
      participants,
      [
        {
          type: MentionType.COLLABORATOR,
          id: state.collaborators.designerCollaborator!.id,
          displayName: "Designer",
          role: "USER",
          userId: state.users[0].id,
        },
        {
          type: MentionType.COLLABORATOR,
          id: state.collaborators.designCollaborator.id,
          displayName: "Design Collaborator",
          role: "USER",
          userId: state.users[1].id,
        },
        {
          type: MentionType.COLLABORATOR,
          id: state.collaborators.collectionCollaborator.id,
          displayName: "Collection Collaborator",
          role: "USER",
          userId: state.users[2].id,
        },
        {
          type: MentionType.COLLABORATOR,
          id: state.collaborators.nonUserCollaborator.id,
          displayName: state.collaborators.nonUserCollaborator.userEmail,
          role: null,
          userId: null,
        },
        {
          type: MentionType.TEAM_USER,
          id: state.teamUsers.partnerTeam.id,
          displayName: "Partner Team Admin",
          role: "PARTNER",
          userId: state.teamUsers.partnerTeam.userId,
        },
        {
          type: MentionType.TEAM_USER,
          id: state.teamUsers.admin.id,
          displayName: "Team Admin",
          role: "USER",
          userId: state.teamUsers.admin.userId,
        },
        {
          type: MentionType.TEAM_USER,
          id: state.teamUsers.viewer.id,
          displayName: "Team Viewer",
          role: "USER",
          userId: state.teamUsers.viewer.userId,
        },
        {
          type: MentionType.TEAM_USER,
          id: state.teamUsers.nonUser.id,
          displayName: state.teamUsers.nonUser.userEmail,
          role: null,
          userId: null,
        },
      ],
      "returns all non-cancelled design and collection collaborators and team users"
    );
  } finally {
    await trx.rollback();
  }
});
