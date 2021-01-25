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

test("getPermissionFromDesign", async (t: tape.Test) => {
  t.deepEqual(
    PermissionsService.getPermissionsFromDesign({
      collaboratorRoles: ["EDIT"],
      isCheckedOut: false,
      sessionRole: "USER",
      sessionUserId: "a-session-user-id",
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: editor"
  );
  t.deepEqual(
    PermissionsService.getPermissionsFromDesign({
      collaboratorRoles: ["EDIT"],
      isCheckedOut: true,
      sessionRole: "USER",
      sessionUserId: "a-session-user-id",
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditVariants: false,
      canSubmit: true,
      canView: true,
    },
    "valid: editor on checked out design"
  );
  t.deepEqual(
    PermissionsService.getPermissionsFromDesign({
      collaboratorRoles: [],
      isCheckedOut: true,
      sessionRole: "ADMIN",
      sessionUserId: "a-session-user-id",
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: admin on checked out design no collaborator"
  );
  t.deepEqual(
    PermissionsService.getPermissionsFromDesign({
      collaboratorRoles: ["PARTNER"],
      isCheckedOut: false,
      sessionRole: "PARTNER",
      sessionUserId: "a-session-user-id",
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "valid: partner"
  );
  t.deepEqual(
    PermissionsService.getPermissionsFromDesign({
      collaboratorRoles: ["PREVIEW"],
      isCheckedOut: false,
      sessionRole: "PARTNER",
      sessionUserId: "a-session-user-id",
    }),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "valid: preview"
  );
  t.deepEqual(
    PermissionsService.getPermissionsFromDesign({
      collaboratorRoles: ["VIEW"],
      isCheckedOut: false,
      sessionRole: "USER",
      sessionUserId: "a-session-user-id",
    }),
    {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "valid: view"
  );

  t.deepEqual(
    PermissionsService.getPermissionsFromDesign({
      collaboratorRoles: ["EDIT", "PREVIEW", "PARTNER", "VIEW"],
      isCheckedOut: false,
      sessionRole: "USER",
      sessionUserId: "a-session-user-id",
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "valid: multiple roles returns permission for most permissive role"
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

  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: null,
    designId: design2.id,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: "",
    role: "PREVIEW",
    userEmail: null,
    userId: user2.id,
  });
  await generateCollaborator({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: "",
    role: "VIEW",
    userEmail: null,
    userId: user.id,
  });

  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design1.id,
      sessionRole: session.role,
      sessionUserId: user.id,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "Returns all access permissions for the design the user created."
  );
  t.deepEqual(
    await PermissionsService.getDesignPermissions({
      designId: design5.id,
      sessionRole: session.role,
      sessionUserId: user.id,
    }),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
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
      canDelete: true,
      canEdit: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "Returns edit access permissions for the design the user is an edit collaborator on."
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
      teamId: team.id,
      userId: user4.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: new Date(),
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
    invitationMessage: "",
    role: "VIEW",
    userEmail: null,
    userId: user1.id,
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: "",
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
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    },
    "Permissions by team only"
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
  const { user: partnerUser, session: partnerSession } = await createUser();

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
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: "",
    role: "PARTNER",
    userEmail: null,
    userId: user2.id,
  });
  await generateCollaborator({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection4.id,
    designId: null,
    invitationMessage: "",
    role: "VIEW",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection4.id,
    designId: null,
    invitationMessage: "",
    role: "PARTNER",
    userEmail: null,
    userId: partnerUser.id,
  });

  const trx = await db.transaction();

  try {
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection1,
        session,
        user.id
      ),
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditVariants: false,
        canSubmit: true,
        canView: true,
      },
      "Returns all access permissions for the collection the user created."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection1,
        session2,
        user2.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: true,
        canEditVariants: false,
        canSubmit: false,
        canView: true,
      },
      "Returns partner permissions for the collection the user is a partner on."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection2,
        session,
        user.id
      ),
      {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditVariants: false,
        canSubmit: true,
        canView: true,
      },
      "Returns edit access permissions for the collection the user is an edit collaborator on."
    );
    t.deepEqual(
      await PermissionsService.getCollectionPermissions(
        trx,
        collection4,
        session,
        user.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: false,
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
        partnerSession,
        partnerUser.id
      ),
      {
        canComment: true,
        canDelete: false,
        canEdit: true,
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
        session,
        user.id
      ),
      {
        canComment: false,
        canDelete: false,
        canEdit: false,
        canEditVariants: false,
        canSubmit: false,
        canView: false,
      },
      "Returns no access permissions for the collection the user does not have access to."
    );
  } finally {
    await trx.rollback();
  }
});

test("#getCollectionPermissions", async (t: tape.Test) => {
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
