import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import notifications from "./notifications";
import * as NotificationAnnouncer from "../iris/messages/notification";
import {
  FullNotification,
  NotificationType,
} from "../notifications/domain-object";
import * as PlansDAO from "../plans/dao";
import * as NotificationsDAO from "../notifications/dao";
import createUser from "../../test-helpers/create-user";
import { TeamDb } from "../teams/types";
import { generateTeam } from "../../test-helpers/factories/team";
import { TeamUserDb, TeamUserRole } from "../../published-types";
import { RawTeamUsersDAO } from ".";
import { generatePlanWithoutDB } from "../../test-helpers/factories/plan";

const prepareAssets = async (): Promise<{
  actor: any;
  recipient: any;
  team: TeamDb;
  teamUser: TeamUserDb;
}> => {
  try {
    const { user: actor } = await createUser();
    const { user: recipient } = await createUser();
    const { team, teamUser } = await generateTeam(actor.id, {
      title: "My Team",
    });

    return {
      actor,
      recipient,
      team,
      teamUser,
    };
  } catch (err) {
    throw err;
  }
};

test("Invite team user notification", async (t: Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { actor, recipient, team, teamUser } = await prepareAssets();

  const trx = await db.transaction();
  try {
    const notificationComponent =
      notifications[NotificationType.INVITE_TEAM_USER];
    const send = notificationComponent.send as (
      trx: any,
      actorId: any,
      data: any
    ) => Promise<void>;
    await send(trx, actor.id, {
      teamId: team.id,
      recipientUserId: recipient.id,
      recipientTeamUserId: teamUser.id,
    });
    const ns = await NotificationsDAO.findByUserId(trx, recipient.id, {
      limit: 20,
      offset: 0,
    });
    t.is(ns.length, 1, "creates exactly 1 notification");
    const message = await notificationComponent.messageBuilder(ns[0]);
    t.is(
      [actor.name, " invited you to ", team.title].every(
        (part: string) => message && message.html.includes(part)
      ),
      true,
      `notification message contains expected parts`
    );
    t.true(
      message && message.location[0].url.includes(`/teams/${team.id}`),
      `notification attachment message has url`
    );
  } finally {
    await trx.rollback();
  }
});

test("Invite team user notification for non-CALA users", async (t: Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});

  const plan = generatePlanWithoutDB();

  sandbox().stub(PlansDAO, "findFreeAndDefaultForTeams").resolves(plan);

  const { actor, team } = await prepareAssets();

  const trx = await db.transaction();
  const teamUser = await RawTeamUsersDAO.create(trx, {
    userId: null,
    id: uuid.v4(),
    teamId: team.id,
    userEmail: "test@example.com",
    role: TeamUserRole.EDITOR,
    teamOrdering: 0,
    label: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });
  try {
    const notificationComponent =
      notifications[NotificationType.INVITE_TEAM_USER];
    const send = notificationComponent.send as (
      trx: any,
      actorId: any,
      data: any
    ) => Promise<void>;
    const notification: any = await send(trx, actor.id, {
      teamId: team.id,
      recipientTeamUserId: teamUser.id,
      recipientUserId: null,
    });

    const message = await notificationComponent.messageBuilder(notification);
    t.is(
      [actor.name, " invited you to ", team.title].every(
        (part: string) => message && message.html.includes(part)
      ),
      true,
      `notification message contains expected parts`
    );

    t.true(
      message?.link.includes(
        `subscribe?planId=${plan.id}&invitationEmail=test%40example.com&returnTo=%2Fteams%2F${team.id}`
      ),
      "Link directs to subscribe page with a redirect"
    );
  } finally {
    await trx.rollback();
  }
});

test("No invite team user notification for with a deleted team user", async (t: Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});

  const plan = generatePlanWithoutDB();

  sandbox().stub(PlansDAO, "findFreeAndDefaultForTeams").resolves(plan);

  const { actor, team } = await prepareAssets();

  const trx = await db.transaction();
  try {
    const teamUser = await RawTeamUsersDAO.create(trx, {
      userId: null,
      id: uuid.v4(),
      teamId: team.id,
      userEmail: "test@example.com",
      role: TeamUserRole.EDITOR,
      teamOrdering: 0,
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    const notificationComponent =
      notifications[NotificationType.INVITE_TEAM_USER];
    const send = notificationComponent.send as (
      trx: any,
      actorId: any,
      data: any
    ) => Promise<FullNotification>;
    const notification = await send(trx, actor.id, {
      teamId: team.id,
      recipientTeamUserId: teamUser.id,
      recipientUserId: null,
    });
    t.equal(
      notification.teamUserEmail,
      "test@example.com",
      "Email for non-CALA team user is set"
    );
    await RawTeamUsersDAO.update(trx, teamUser.id, { deletedAt: new Date() });
    const afterUpdateNotification = await NotificationsDAO.findById(
      trx,
      notification.id
    );
    t.is(
      afterUpdateNotification,
      null,
      `notification is not found after deleting the team user`
    );
  } finally {
    await trx.rollback();
  }
});
