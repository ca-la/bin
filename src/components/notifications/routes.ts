import Router from "koa-router";
import Knex from "knex";

import * as NotificationsDAO from "./dao";
import db from "../../services/db";
import requireAuth = require("../../middleware/require-auth");
import { createNotificationMessage } from "./notification-messages";
import { NotificationMessage } from "@cala/ts-lib";

const router = new Router();

interface GetListQuery {
  limit?: number;
  offset?: number;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.state;
  const { limit, offset }: GetListQuery = this.query;

  if ((limit && limit < 0) || (offset && offset < 0)) {
    this.throw(400, "Offset / Limit cannot be negative!");
  }

  const notifications = yield db.transaction((trx: Knex.Transaction) =>
    NotificationsDAO.findByUserId(trx, userId, {
      limit: limit || 20,
      offset: offset || 0,
    })
  );
  const messages: (NotificationMessage | null)[] = yield Promise.all(
    notifications.map(createNotificationMessage)
  );

  this.status = 200;
  this.body = messages.filter(
    (message: NotificationMessage | null) => message !== null
  );
}

function* getUnreadCount(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.state;

  const unreadNotificationsCount = yield db.transaction(
    (trx: Knex.Transaction) =>
      NotificationsDAO.findUnreadCountByUserId(trx, userId)
  );

  this.status = 200;
  this.body = { unreadNotificationsCount };
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

function* setReadOlderThan(
  this: AuthedContext<{ id: string }>
): Iterator<any, any, any> {
  if (!this.request.body.id) {
    this.throw(400, "You must indicate the last read notification");
  }

  yield db.transaction(async (trx: Knex.Transaction) =>
    NotificationsDAO.markReadOlderThan(
      trx,
      this.request.body.id,
      this.state.userId
    )
  );

  this.status = 204;
}
router.get("/", requireAuth, getList);
router.get("/unread", requireAuth, getUnreadCount);
router.patch("/read", requireAuth, setRead);
router.put("/last-read", requireAuth, setReadOlderThan);

export default router.routes();
