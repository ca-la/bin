import uuid from "node-uuid";
import { test, Test } from "../../test-helpers/fresh";
import {
  transformNotificationMessageToGraphQL,
  getRecipientsByDesign,
  getRecipientsByCollection,
  getRecipientsWhoCanCheckoutByCollectionId,
  getUsersWhoCanCheckoutByCollectionId,
} from "./service";
import { NotificationMessage, NotificationType } from "./types";

import db from "../../services/db";
import { generateTeam } from "../../test-helpers/factories/team";
import generateCollection from "../../test-helpers/factories/collection";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import { Role as TeamUserRole } from "../team-users/types";
import createUser from "../../test-helpers/create-user";
import createDesign from "../../services/create-design";

test("transformNotificationMessageToGraphQL endpoint", async (t: Test) => {
  const notificationMessage: NotificationMessage = {
    id: "",
    title: "",
    html: "",
    text: "",
    readAt: null,
    link: "",
    createdAt: new Date(),
    actor: null,
    imageUrl: null,
    previewImageUrl: null,
    emailPreviewImageUrl: null,
    location: [],
    attachments: [
      {
        text: "a1",
        url: "url",
        mentions: { id1: "user1", id2: undefined },
      },
    ],
    actions: [],
    archivedAt: null,
    matchedFilters: [],
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  };

  const transformed = transformNotificationMessageToGraphQL(
    notificationMessage
  );
  t.deepEqual(transformed, {
    ...notificationMessage,
    attachments: [
      {
        ...notificationMessage.attachments[0],
        mentions: [
          { id: "id1", name: "user1" },
          { id: "id2", name: undefined },
        ],
      },
    ],
  });
});

test("getRecipients* and getUsers*", async (t: Test) => {
  const { user: userTeamOwner } = await createUser({ withSession: false });
  const { team, teamUser: tu1 } = await generateTeam(userTeamOwner.id, {});

  const trx = await db.transaction();
  try {
    const { user: userForTeam2 } = await createUser({ withSession: false });
    const tu2 = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.ADMIN,
      label: null,
      teamId: team.id,
      userId: userForTeam2.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    const { user: userForTeam3 } = await createUser({ withSession: false });
    const tu3 = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.EDITOR,
      label: null,
      teamId: team.id,
      userId: userForTeam3.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    // team user with VIEWER role shouldn't appear in the recipients list
    const { user: userForTeam4 } = await createUser({ withSession: false });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.VIEWER,
      label: null,
      teamId: team.id,
      userId: userForTeam4.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    const teamUserWithoutUserId = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.EDITOR,
      label: null,
      teamId: team.id,
      userId: null,
      userEmail: "team-user-without-user-id@ca.la",
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    // create a collection.
    const { user: collectionAndDesignOwner } = await createUser({
      withSession: false,
    });
    const { collection } = await generateCollection({
      title: "C1",
      teamId: team.id,
      createdBy: collectionAndDesignOwner.id,
    });
    // create a design.
    const design1 = await createDesign({
      productType: "TEE",
      title: "My Tee",
      userId: collectionAndDesignOwner.id,
      collectionIds: [collection.id],
    });

    const { user: userCollaborator1 } = await createUser({
      withSession: false,
    });
    const {
      collaborator: collaboratorDesignEditor,
    } = await generateCollaborator({
      collectionId: null,
      designId: design1.id,
      role: "EDIT",
      userEmail: null,
      userId: userCollaborator1.id,
    });

    // PARTNER collaborator shouldn't appear in the recipients list
    const { user: userCollaborator2 } = await createUser({
      withSession: false,
    });
    await generateCollaborator({
      collectionId: null,
      designId: design1.id,
      role: "PARTNER",
      userEmail: null,
      userId: userCollaborator2.id,
    });
    const { user: userCollaborator3 } = await createUser({
      withSession: false,
    });
    await generateCollaborator({
      collectionId: null,
      designId: design1.id,
      role: "VIEW",
      userEmail: null,
      userId: userCollaborator3.id,
    });
    const { user: userCollaborator4 } = await createUser({
      withSession: false,
    });
    await generateCollaborator({
      collectionId: null,
      designId: design1.id,
      role: "PREVIEW",
      userEmail: null,
      userId: userCollaborator4.id,
    });

    const { user: userCollaborator5 } = await createUser({
      withSession: false,
    });
    const { collaborator: collaboratorOwner } = await generateCollaborator({
      collectionId: collection.id,
      designId: null,
      role: "OWNER",
      userEmail: null,
      userId: userCollaborator5.id,
    });

    const {
      collaborator: collaboratorWithoutUserId,
    } = await generateCollaborator({
      collectionId: collection.id,
      designId: null,
      role: "EDIT",
      userEmail: "collaborator-without-user-id@ca.la",
      userId: null,
    });

    const { user: userAsTeamUserAndCollaborator } = await createUser({
      withSession: false,
    });
    const teamUserAndCollaborator = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.EDITOR,
      label: null,
      teamId: team.id,
      userId: userAsTeamUserAndCollaborator.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    // collaborator won't appear in the list if same user is a team user already
    await generateCollaborator({
      collectionId: collection.id,
      designId: null,
      role: "EDIT",
      userEmail: null,
      userId: userAsTeamUserAndCollaborator.id,
    });

    const designRecipients = await getRecipientsByDesign(trx, design1.id);
    const expectedDesignCollaboratorsRecipients = [
      {
        recipientUserId: collaboratorDesignEditor.userId,
        recipientCollaboratorId: collaboratorDesignEditor.id,
        recipientTeamUserId: null,
      },
      {
        recipientUserId: collaboratorOwner.userId,
        recipientCollaboratorId: collaboratorOwner.id,
        recipientTeamUserId: null,
      },
      {
        recipientUserId: null,
        recipientCollaboratorId: collaboratorWithoutUserId.id,
        recipientTeamUserId: null,
      },
    ];

    const expectedTeamUsersRecipients = [
      {
        recipientUserId: tu1.userId,
        recipientCollaboratorId: null,
        recipientTeamUserId: tu1.id,
      },
      {
        recipientUserId: tu2.userId,
        recipientCollaboratorId: null,
        recipientTeamUserId: tu2.id,
      },
      {
        recipientUserId: tu3.userId,
        recipientCollaboratorId: null,
        recipientTeamUserId: tu3.id,
      },
      {
        recipientUserId: null,
        recipientCollaboratorId: null,
        recipientTeamUserId: teamUserWithoutUserId.id,
      },
      {
        recipientUserId: teamUserAndCollaborator.userId,
        recipientCollaboratorId: null,
        recipientTeamUserId: teamUserAndCollaborator.id,
      },
    ];

    t.deepEquals(
      designRecipients,
      [
        ...expectedTeamUsersRecipients,
        ...expectedDesignCollaboratorsRecipients,
      ],
      "the design recipients list match expected items"
    );

    const collectionRecipients = await getRecipientsByCollection(
      trx,
      collection.id
    );

    const expectedCollectionCollaboratorsRecipients = [
      {
        recipientUserId: collaboratorOwner.userId,
        recipientCollaboratorId: collaboratorOwner.id,
        recipientTeamUserId: null,
      },
      {
        recipientUserId: null,
        recipientCollaboratorId: collaboratorWithoutUserId.id,
        recipientTeamUserId: null,
      },
    ];

    t.deepEquals(
      collectionRecipients,
      [
        ...expectedTeamUsersRecipients,
        ...expectedCollectionCollaboratorsRecipients,
      ],
      "the collection recipients list match expected items"
    );

    const collectionRecipientsWhoCanCheckout = await getRecipientsWhoCanCheckoutByCollectionId(
      trx,
      collection.id
    );

    t.deepEqual(
      collectionRecipientsWhoCanCheckout,
      [
        {
          recipientUserId: tu1.userId,
          recipientCollaboratorId: null,
          recipientTeamUserId: tu1.id,
        },
        {
          recipientUserId: tu2.userId,
          recipientCollaboratorId: null,
          recipientTeamUserId: tu2.id,
        },
        {
          recipientUserId: tu3.userId,
          recipientCollaboratorId: null,
          recipientTeamUserId: tu3.id,
        },
        {
          recipientUserId: null,
          recipientCollaboratorId: null,
          recipientTeamUserId: teamUserWithoutUserId.id,
        },
        {
          recipientUserId: teamUserAndCollaborator.userId,
          recipientCollaboratorId: null,
          recipientTeamUserId: teamUserAndCollaborator.id,
        },
        {
          recipientUserId: collaboratorOwner.userId,
          recipientCollaboratorId: collaboratorOwner.id,
          recipientTeamUserId: null,
        },
        {
          recipientUserId: null,
          recipientCollaboratorId: collaboratorWithoutUserId.id,
          recipientTeamUserId: null,
        },
      ],
      "recipients who can checkout match the expected items"
    );

    const collectionUsersWhoCanCheckout = await getUsersWhoCanCheckoutByCollectionId(
      trx,
      collection.id
    );

    t.deepEqual(
      collectionUsersWhoCanCheckout,
      [
        tu1.userId,
        tu2.userId,
        tu3.userId,
        teamUserAndCollaborator.userId,
        collaboratorOwner.userId,
      ],
      "users who can checkout match the expected items"
    );
  } finally {
    await trx.rollback();
  }
});
