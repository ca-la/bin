import Router from "koa-router";
import Knex from "knex";
import { omit } from "lodash";

import * as NotificationsDAO from "./dao";
import db from "../../services/db";
import requireAuth = require("../../middleware/require-auth");
import { createNotificationMessage } from "./notification-messages";
import useTransaction from "../../middleware/use-transaction";
import { NotificationMessage, NotificationFilter } from "./types";
import { trackTime } from "../../middleware/tracking";

const ALLOWED_UPDATE_KEYS = ["archivedAt"];

const router = new Router();

interface GetListQuery {
  limit?: number;
  offset?: number;
  filter?: NotificationFilter;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.state;
  const { limit, offset, filter }: GetListQuery = this.query;
  const trackEventPrefix = "notifications/getList";

  if ((limit && limit < 0) || (offset && offset < 0)) {
    this.throw(400, "Offset / Limit cannot be negative!");
  }

  if (filter && !Object.values(NotificationFilter).includes(filter)) {
    this.throw(400, "Unknown filter");
  }

  const notifications = yield trackTime(
    this,
    `${trackEventPrefix}/findByUserId`,
    () =>
      db.transaction((trx: Knex.Transaction) =>
        NotificationsDAO.findByUserId(trx, userId, {
          limit: limit || 20,
          offset: offset || 0,
          filter,
        })
      )
  );
  const messages: (NotificationMessage | null)[] = yield trackTime(
    this,
    `${trackEventPrefix}/createNotificationMessage`,
    () => Promise.all(notifications.map(createNotificationMessage))
  );

  this.status = 200;
  this.body = messages.filter(
    (message: NotificationMessage | null) => message !== null
  );
}

function* getUnreadCount(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.state;

  const unreadCountsByFilter = yield trackTime(
    this,
    "notifications/getUnreadCount/findUnreadCountByFiltersByUserId",
    () => NotificationsDAO.findUnreadCountByFiltersByUserId(db, userId)
  );
  const unreadNotificationsCount =
    unreadCountsByFilter[NotificationFilter.ARCHIVED] +
    unreadCountsByFilter[NotificationFilter.UNARCHIVED];

  this.status = 200;
  this.body = {
    unreadNotificationsCount,
    unreadNotificationsCountByFilter: unreadCountsByFilter,
  };
}

function* setRead(this: AuthedContext): Iterator<any, any, any> {
  const { notificationIds } = this.query;
  if (notificationIds) {
    const idList = notificationIds.split(",");
    yield db.transaction(async (trx: Knex.Transaction) => {
      for (const id of idList) {
        const notification = await NotificationsDAO.findById(trx, id);
        if (
          !notification ||
          (notification.recipientUserId !== null &&
            notification.recipientUserId !== this.state.userId)
        ) {
          this.throw(403, "Access denied for this resource");
        }
      }
    });
    yield NotificationsDAO.markRead(idList);
    this.status = 200;
    this.body = { ok: true };
  } else {
    this.throw("Missing notification ids");
  }
}

function* update(this: TrxContext<AuthedContext>): Iterator<any, any, any> {
  const { trx, userId } = this.state;
  const { notificationId } = this.params;

  const notification = yield NotificationsDAO.findById(trx, notificationId);
  if (!notification) {
    this.throw(404, "Notification not found");
  }
  if (notification.recipientUserId !== userId) {
    this.throw(403, "Access denied for this resource");
  }

  const restKeys = omit(this.request.body, ALLOWED_UPDATE_KEYS);
  if (Object.keys(restKeys).length > 0) {
    this.throw(400, `Keys ${Object.keys(restKeys).join(", ")} are not allowed`);
  }

  yield NotificationsDAO.update(trx, notificationId, this.request.body);

  this.status = 204;
}

function* setArchiveOlderThan(
  this: TrxContext<AuthedContext<{ id: string }>>
): Iterator<any, any, any> {
  const { trx } = this.state;
  if (!this.request.body.id) {
    this.throw(400, "You must indicate the last archived notification");
  }

  const { inboxOnly }: { inboxOnly?: string } = this.query;

  yield NotificationsDAO.archiveOlderThan(trx, {
    notificationId: this.request.body.id,
    recipientUserId: this.state.userId,
    onlyArchiveInbox: Boolean(inboxOnly === "true"),
  });

  this.status = 204;
}

router.get("/", requireAuth, getList);
router.get("/unread", requireAuth, getUnreadCount);
router.patch("/read", requireAuth, setRead);
router.patch("/:notificationId", requireAuth, useTransaction, update);
router.put("/archive", requireAuth, useTransaction, setArchiveOlderThan);
export default router.routes();
