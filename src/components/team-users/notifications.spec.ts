import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import notifications from "./notifications";
import * as NotificationAnnouncer from "../iris/messages/notification";
import { NotificationType } from "../notifications/domain-object";
import { findByUserId } from "../notifications/dao";
import createUser from "../../test-helpers/create-user";
import { TeamDb } from "../teams/types";
import { generateTeam } from "../../test-helpers/factories/team";

const prepareAssets = async (): Promise<{
  actor: any;
  recipient: any;
  team: TeamDb;
}> => {
  try {
    const { user: actor } = await createUser();
    const { user: recipient } = await createUser();
    const { team } = await generateTeam(actor.id, { title: "My Team" });

    return {
      actor,
      recipient,
      team,
    };
  } catch (err) {
    throw err;
  }
};

test("Invite team user notification", async (t: Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { actor, recipient, team } = await prepareAssets();

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
    });
    const ns = await findByUserId(trx, recipient.id, {
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
