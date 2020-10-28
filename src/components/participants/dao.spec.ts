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
import { TeamUserRole } from "../../published-types";

const createUser = (name: string) =>
  UsersDAO.create({
    name,
    email: `${uuid.v4()}@example.com`,
    role: "USER",
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
    teamId: null,
    title: "AW19",
  });

  await addDesign(collection.id, design.id);
  const { team, teamUser: teamUser1 } = await generateTeam(teamAdmin.id);
  const teamUser2 = await db.transaction((trx: Knex.Transaction) =>
    RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.OWNER,
      teamId: team.id,
      userId: teamViewer.id,
      userEmail: null,
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
  const { collaborator: teamCollaborator } = await generateCollaborator({
    collectionId: null,
    designId: design.id,
    cancelledAt: null,
    invitationMessage: "",
    role: "PARTNER",
    userEmail: null,
    userId: null,
    teamId: team.id,
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
    },
    teamUsers: {
      admin: teamUser1,
      viewer: teamUser2,
    },
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
        },
        {
          type: MentionType.COLLABORATOR,
          id: state.collaborators.designCollaborator.id,
          displayName: "Design Collaborator",
        },
        {
          type: MentionType.COLLABORATOR,
          id: state.collaborators.collectionCollaborator.id,
          displayName: "Collection Collaborator",
        },
        {
          type: MentionType.TEAM_USER,
          id: state.teamUsers.admin.id,
          displayName: "Team Admin",
        },
        {
          type: MentionType.TEAM_USER,
          id: state.teamUsers.viewer.id,
          displayName: "Team Viewer",
        },
      ],
      "returns all non-cancelled design and collection collaborators and team users"
    );
  } finally {
    await trx.rollback();
  }
});
