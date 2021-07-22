import Knex from "knex";
import uuid from "node-uuid";
import tape from "tape";

import { test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";

import db from "../db";
import * as CollectionsDAO from "../../components/collections/dao";
import createDesign from "../../services/create-design";

import * as PermissionsService from "./index";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import { generateTeam } from "../../test-helpers/factories/team";
import { moveDesign } from "../../test-helpers/collections";
import { TeamUserRole, RawTeamUsersDAO } from "../../components/team-users";
import { CollaboratorRoles } from "../../components/collaborators/types";

test("calculateDesignPermissions", async (t: tape.Test) => {
  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: true,
      collaboratorRoles: [CollaboratorRoles.OWNER],
      teamUserRoles: [],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: owner but not a team member"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: true,
      collaboratorRoles: [CollaboratorRoles.OWNER],
      teamUserRoles: [],
      isDesignCheckedOut: false,
      isDraftDesign: true,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: owner has full access if design is in draft state"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [CollaboratorRoles.EDIT],
      teamUserRoles: [],
      isDesignCheckedOut: false,
      isDraftDesign: true,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: not an owner cannot delete the design"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: true,
      collaboratorRoles: [],
      teamUserRoles: [],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: creator but not a collaborator has the EDIT collaborator permissions"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [CollaboratorRoles.EDIT],
      teamUserRoles: [],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: editor but not a team member"
  );
  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [CollaboratorRoles.EDIT],
      teamUserRoles: [],
      isDesignCheckedOut: true,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: false,
      canSubmit: true,
      canView: true,
    },
    "valid: editor on checked out design"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "ADMIN",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [],
      isDesignCheckedOut: true,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: admin on checked out design no collaborator"
  );
  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "PARTNER",
      isOwner: false,
      collaboratorRoles: [CollaboratorRoles.PARTNER],
      teamUserRoles: [],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "valid: partner cannot edit the design title"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "PARTNER",
      isOwner: false,
      collaboratorRoles: [CollaboratorRoles.PREVIEW],
      teamUserRoles: [],
      isDesignCheckedOut: false,
    }),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "valid: preview"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: ["VIEW"],
      teamUserRoles: [],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "valid: view"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [
        CollaboratorRoles.EDIT,
        CollaboratorRoles.PREVIEW,
        CollaboratorRoles.PARTNER,
        CollaboratorRoles.VIEW,
      ],
      teamUserRoles: [],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: multiple roles returns permission for most permissive role"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [TeamUserRole.VIEWER],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "valid: VIEWER team user"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [TeamUserRole.TEAM_PARTNER],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: TEAM_PARTNER team user cannot edit the design title"
  );
  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [TeamUserRole.TEAM_PARTNER],
      isDesignCheckedOut: true,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: false,
      canSubmit: true,
      canView: true,
    },
    "valid: TEAM_PARTNER team user on checked out design"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [TeamUserRole.EDITOR],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: EDITOR team user"
  );
  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [TeamUserRole.EDITOR],
      isDesignCheckedOut: true,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: false,
      canSubmit: true,
      canView: true,
    },
    "valid: EDITOR team user on checked out design"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [TeamUserRole.ADMIN],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: ADMIN team user"
  );
  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [TeamUserRole.ADMIN],
      isDesignCheckedOut: true,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: false,
      canSubmit: true,
      canView: true,
    },
    "valid: ADMIN team user on checked out design"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [TeamUserRole.OWNER],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: OWNER team user"
  );
  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [],
      teamUserRoles: [TeamUserRole.OWNER],
      isDesignCheckedOut: true,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: false,
      canSubmit: true,
      canView: true,
    },
    "valid: OWNER team user on checked out design"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [CollaboratorRoles.OWNER],
      teamUserRoles: [TeamUserRole.VIEWER],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: owner collaborator and VIEWER team member can't delete the design"
  );
  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [CollaboratorRoles.OWNER],
      teamUserRoles: [TeamUserRole.EDITOR],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: owner collaborator and EDITOR team user can delete the design"
  );

  t.deepEqual(
    PermissionsService.calculateDesignPermissions({
      sessionRole: "USER",
      isOwner: false,
      collaboratorRoles: [CollaboratorRoles.VIEW, CollaboratorRoles.OWNER],
      teamUserRoles: [
        TeamUserRole.VIEWER,
        TeamUserRole.TEAM_PARTNER,
        TeamUserRole.EDITOR,
      ],
      isDesignCheckedOut: false,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: takes the most permissive role from collaborator and team user roles"
  );
});

test("#getDesignPermissions", async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { user: user2, session: session2 } = await createUser();

  const collection1 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    teamId: null,
    title: "C1",
  });
  const collection2 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    teamId: null,
    title: "C2",
  });

  const design1 = await createDesign({
    productType: "TEE",
    title: "My Tee",
    userId: user.id,
  });
  await moveDesign(collection1.id, design1.id);

  const design2 = await createDesign({
    productType: "PANT",
    title: "My Pant",
    userId: user2.id,
  });
  const design3 = await createDesign({
    productType: "JACKET",
    title: "Bomber Jacket",
    userId: user2.id,
  });
  const design4 = await createDesign({
    productType: "WOVENS",
    title: "Oversize Hoodie",
    userId: user2.id,
  });
  await moveDesign(collection2.id, design4.id);
  const design5 = await createDesign({
    productType: "WOVENS",
    title: "Oversize Hoodie",
    userId: user.id,
  });
  await generateDesignEvent({
    designId: design5.id,
    type: "COMMIT_QUOTE",
    actorId: user.id,
  });
  await moveDesign(collection2.id, design5.id);

  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: null,
    designId: design2.id,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: null,
    role: "PREVIEW",
    userEmail: null,
    userId: user2.id,
  });
  await generateCollaborator({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: null,
    role: "VIEW",
    userEmail: null,
    userId: user.id,
  });

  const draftDesign = await createDesign({
    productType: "TEE",
    title: "Draft design",
    userId: user.id,
  });

  await generateCollaborator({
    collectionId: null,
    designId: draftDesign.id,
    invitationMessage: null,
    role: "OWNER",
    userEmail: null,
    userId: user.id,
  });

  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: draftDesign.id,
      sessionRole: session.role,
      sessionUserId: user.id,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "Returns full access permissions for the draft design the user is owner of"
  );

  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design1.id,
      sessionRole: session.role,
      sessionUserId: user.id,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "Returns edit access permissions for the design the user created outside of the collection team."
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design5.id,
      sessionRole: session.role,
      sessionUserId: user.id,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: false,
      canSubmit: true,
      canView: true,
    },
    "Returns non edit variant permissions for the designs that have been paid for."
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design1.id,
      sessionRole: session2.role,
      sessionUserId: user2.id,
    }),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "Returns preview permissions for the design the user is a collection-level preview on."
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design2.id,
      sessionRole: session.role,
      sessionUserId: user.id,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "Returns edit access permissions for the design the user is an edit collaborator on and not a collection team member."
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design4.id,
      sessionRole: session.role,
      sessionUserId: user.id,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "Returns view access permissions for the design the user is a view collaborator on."
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design3.id,
      sessionRole: session.role,
      sessionUserId: user.id,
    }),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: false,
    },
    "Returns no access permissions for the collection the user does not have access to."
  );
});

test("#getDesignPermissions by team", async (t: tape.Test) => {
  const { user: owner } = await createUser();
  const { user: user1, session: session1 } = await createUser();
  const { user: user2, session: session2 } = await createUser();
  const { user: user3, session: session3 } = await createUser();
  const { user: user4, session: session4 } = await createUser();
  const { user: user5, session: session5 } = await createUser();
  const { team } = await generateTeam(
    user1.id,
    {},
    {
      role: TeamUserRole.ADMIN,
    }
  );

  await db.transaction(async (trx: Knex.Transaction) => {
    await RawTeamUsersDAO.create(trx, {
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
    await RawTeamUsersDAO.create(trx, {
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
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.TEAM_PARTNER,
      label: null,
      teamId: team.id,
      userId: user5.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
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
  const design1 = await createDesign({
    productType: "TEE",
    title: "My Tee",
    userId: owner.id,
  });
  await moveDesign(collection.id, design1.id);

  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: null,
    role: "VIEW",
    userEmail: null,
    userId: user1.id,
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user2.id,
  });

  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design1.id,
      sessionRole: session1.role,
      sessionUserId: user1.id,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "Prefers team permissions when they are more permissive"
  );

  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design1.id,
      sessionRole: session2.role,
      sessionUserId: user2.id,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "Prefers collaborator permissions when they are more permissive"
  );

  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design1.id,
      sessionRole: session3.role,
      sessionUserId: user3.id,
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "Permissions by team only"
  );

  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design1.id,
      sessionRole: session5.role,
      sessionUserId: user5.id,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "Permissions for TEAM_PARTNER role"
  );

  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design1.id,
      sessionRole: session4.role,
      sessionUserId: user4.id,
    }),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: false,
    },
    "Empty permissions for the deleted team user"
  );
});

test("#getCollectionPermissions", async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { user: user2, session: session2 } = await createUser();
  const { user: user3, session: session3 } = await createUser();
  const {
    user: teamViewerUser,
    session: teamViewerUserSession,
  } = await createUser();
  const { user: partnerUser, session: partnerSession } = await createUser();
  const { user: admin, session: adminSession } = await createUser({
    role: "ADMIN",
  });
  const { user: user4, session: session4 } = await createUser();
  const { team } = await generateTeam(user.id);

  const collection1 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    teamId: null,
    title: "C1",
  });
  const collection2 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    teamId: null,
    title: "C2",
  });
  const collection3 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    teamId: null,
    title: "C3",
  });
  const collection4 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    teamId: null,
    title: "C4",
  });
  const collection5 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    teamId: team.id,
    title: "C5",
  });
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: null,
    role: "PARTNER",
    userEmail: null,
    userId: user2.id,
  });
  await generateCollaborator({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection4.id,
    designId: null,
    invitationMessage: null,
    role: "VIEW",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection4.id,
    designId: null,
    invitationMessage: null,
    role: "PARTNER",
    userEmail: null,
    userId: partnerUser.id,
  });
  await generateCollaborator({
    collectionId: collection5.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user2.id,
  });
  await generateCollaborator({
    collectionId: collection5.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user4.id,
  });
  await generateCollaborator({
    collectionId: collection5.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: admin.id,
  });
  await generateCollaborator({
    collectionId: collection5.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: teamViewerUser.id,
  });

  const trx = await db.transaction();

  await RawTeamUsersDAO.create(trx, {
    id: uuid.v4(),
    role: TeamUserRole.TEAM_PARTNER,
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
    role: TeamUserRole.EDITOR,
    label: null,
    teamId: team.id,
    userId: user4.id,
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
    userId: teamViewerUser.id,
    userEmail: null,
    createdAt: new Date(),
    deletedAt: null,
    updatedAt: new Date(),
  });

  try {
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection1,
        session.role,
        user.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      "Returns all access permissions for the collection the user created."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection1,
        session2.role,
        user2.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: true,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: true,
      },
      "Returns partner permissions for the collection the user is a partner on."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection5,
        session3.role,
        user3.id
      ),
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      "Returns full permissions for the collection the user is a team partner on."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection2,
        session.role,
        user.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      "Returns edit access permissions for the collection the user is an edit collaborator on."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection4,
        session.role,
        user.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: false,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: true,
      },
      "Returns view access permissions for the collection the user is a view collaborator on."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection4,
        partnerSession.role,
        partnerUser.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: true,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: true,
      },
      "Returns partner access permissions for the collection the user is a partner collaborator on."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection3,
        session.role,
        user.id
      ),
      {
        canComment: false,
        canDelete: false,
        canEdit: false,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: false,
      },
      "Returns no access permissions for the collection the user does not have access to."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection5,
        session2.role,
        user2.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      "Returns edit access permissions for the team collection the user is an edit collaborator on."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection5,
        session4.role,
        user4.id
      ),
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      "Returns edit and delete access permissions for the team collection the user is an edit collaborator on and collection team Editor."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection5,
        adminSession.role,
        admin.id
      ),
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      "Returns full access permissions for the team collection the user is an edit collaborator on and CALA admin."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection5,
        teamViewerUserSession.role,
        teamViewerUser.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      "Returns edit access but not delete permissions for the team collection where the user is an edit collaborator on and team viewer"
    );
  } finally {
    await trx.rollback();
  }
});

test("#findMostPermissiveRole", async (t: tape.Test) => {
  t.equal(
    PermissionsService.findMostPermissiveRole([
      "VIEW",
      "PREVIEW",
      "OWNER",
      "VIEW",
      "EDIT",
      "EDIT",
      "PARTNER",
    ]),
    "OWNER",
    "Finds the most permissive role in the list"
  );
  t.equal(
    PermissionsService.findMostPermissiveRole([
      "VIEW",
      "PREVIEW",
      "VIEW",
      "EDIT",
      "EDIT",
      "PARTNER",
    ]),
    "EDIT",
    "Finds the most permissive role in the list"
  );
  t.equal(
    PermissionsService.findMostPermissiveRole([
      "VIEW",
      "VIEW",
      "VIEW",
      "PREVIEW",
      "VIEW",
      "PARTNER",
    ]),
    "PARTNER",
    "Finds the most permissive role in the list"
  );
  t.equal(
    PermissionsService.findMostPermissiveRole(["ADFFD", "DDD", "FOO", "BAR"]),
    null,
    "Returns null if the list is malformed"
  );
  t.equal(
    PermissionsService.findMostPermissiveRole([]),
    null,
    "Returns null if the list is empty"
  );
});

test("mergePermissionsOR", async (t: tape.Test) => {
  t.deepEqual(
    PermissionsService.mergePermissionsOR(
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      {
        canComment: false,
        canDelete: false,
        canEdit: false,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: false,
      }
    ),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "permissionsA is not affected by permissionsB false values"
  );

  t.deepEqual(
    PermissionsService.mergePermissionsOR(
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      {}
    ),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "initial true state is not affected by empty permissions"
  );

  t.deepEqual(
    PermissionsService.mergePermissionsOR(
      {
        canComment: false,
        canDelete: false,
        canEdit: false,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: false,
      },
      {}
    ),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: false,
    },
    "initial false state is not affected by empty permissions"
  );

  t.deepEqual(
    PermissionsService.mergePermissionsOR(
      {
        canComment: false,
        canDelete: false,
        canEdit: false,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: false,
      },
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      }
    ),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "converts all from false to true"
  );

  t.deepEqual(
    PermissionsService.mergePermissionsOR(
      {
        canComment: true,
        canDelete: false,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      {
        canDelete: true,
      }
    ),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "converts single element"
  );
});

test("mergePermissionsAND", async (t: tape.Test) => {
  t.deepEqual(
    PermissionsService.mergePermissionsAND(
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      {
        canComment: false,
        canDelete: false,
        canEdit: false,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: false,
      }
    ),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: false,
    },
    "set all true to false"
  );

  t.deepEqual(
    PermissionsService.mergePermissionsAND(
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      {}
    ),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "empty second argument does not affects the base permissions"
  );

  t.deepEqual(
    PermissionsService.mergePermissionsAND(
      {
        canComment: false,
        canDelete: false,
        canEdit: false,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: false,
      },
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      }
    ),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: false,
    },
    "falsy state is not coverted to true"
  );

  t.deepEqual(
    PermissionsService.mergePermissionsAND(
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      {
        canEditVariants: false,
      }
    ),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: false,
      canSubmit: true,
      canView: true,
    },
    "set to false one truthly permission"
  );
});

test("mergeRolesPermissions", async (t: tape.Test) => {
  t.deepEqual(
    PermissionsService.mergeRolesPermissions([], {}),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditTitle: false,
      canEditVariants: false,
      canSubmit: false,
      canView: false,
    },
    "return no access if no roles provided"
  );

  t.deepEqual(
    PermissionsService.mergeRolesPermissions(["VIEWER", "EDITOR"], {
      VIEWER: {
        canComment: true,
        canDelete: false,
        canEdit: false,
        canEditTitle: false,
        canEditVariants: false,
        canSubmit: false,
        canView: true,
      },
      EDITOR: {
        canComment: true,
        canDelete: false,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "return true in merged permissions where at least one role has true"
  );
});
