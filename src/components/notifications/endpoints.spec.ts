import { pick } from "lodash";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { authHeader, post } from "../../test-helpers/http";
import * as NotificationsDAO from "./dao";
import { templateNotification } from "./models/base";
import {
  NotificationType,
  NotificationFilter,
  NotificationMessage,
} from "./types";
import * as NotificationMessages from "./notification-messages";

test("notificationMessages endpoint", async () => {
  function buildRequest({
    offset = 0,
    limit = 20,
  }: { offset?: number; limit?: number } = {}) {
    return {
      operationName: "n",
      query: `query n($offset: Int!, $limit: Int) {
        notificationMessages(filter: ${NotificationFilter.INBOX}, offset: $offset, limit: $limit) {
          id
          title
        }
      }`,
      variables: { offset, limit },
    };
  }

  test("Requires authentication", async (t: Test) => {
    const [response, body] = await post("/v2", {
      body: buildRequest(),
    });
    t.equal(response.status, 200);
    t.equal(body.errors[0].message, "Unauthorized");
  });

  test("Fails on negative offset", async (t: Test) => {
    const { session } = await createUser({ role: "USER" });
    const headers = authHeader(session.id);
    const [response, body] = await post("/v2", {
      body: buildRequest({ offset: -1 }),
      headers,
    });
    t.equal(response.status, 200);
    t.equal(body.errors[0].message, "Offset / Limit cannot be negative!");
  });

  test("Fails on negative limit", async (t: Test) => {
    const { session } = await createUser({ role: "USER" });
    const [response, body] = await post("/v2", {
      body: buildRequest({ limit: -1 }),
      headers: authHeader(session.id),
    });
    t.equal(response.status, 200);
    t.equal(body.errors[0].message, "Offset / Limit cannot be negative!");
  });

  test("Valid request", async (t: Test) => {
    const { session, user } = await createUser({ role: "USER" });
    const notification = {
      ...templateNotification,
      id: "not-id",
      actorUserId: "actor-id",
      recipientUserId: user.id,
      type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
    };
    const notificationMessage: NotificationMessage = {
      id: "",
      title: "",
      text: "",
      html: "",
      readAt: null,
      link: "",
      createdAt: new Date(),
      actor: null,
      imageUrl: null,
      location: [],
      attachments: [],
      actions: [],
      archivedAt: null,
      matchedFilters: [],
      type: NotificationType.ANNOTATION_COMMENT_CREATE,
    };
    const findByUserIdStub = sandbox()
      .stub(NotificationsDAO, "findByUserId")
      .resolves([notification]);
    const createNotificationMessageStub = sandbox()
      .stub(NotificationMessages, "createNotificationMessage")
      .resolves(notificationMessage);

    const [response, body] = await post("/v2", {
      body: buildRequest(),
      headers: authHeader(session.id),
    });
    t.equal(response.status, 200);

    t.deepEqual(findByUserIdStub.args, [
      [
        findByUserIdStub.args[0][0],
        user.id,
        {
          filter: "INBOX",
          limit: 20,
          offset: 0,
        },
      ],
    ]);
    t.deepEqual(createNotificationMessageStub.args, [
      [notification, 0, [notification]],
    ]);
    t.deepEqual(body, {
      data: {
        notificationMessages: [pick(notificationMessage, "id", "title")],
      },
    });
  });
});

test("archiveNotification endpoint", async (t: Test) => {
  const { session, user } = await createUser({ role: "USER" });
  function buildRequest(id: string = "") {
    return {
      operationName: "archive",
      query: `mutation archive($id: String!) {
        archiveNotification(id: $id)
      }`,
      variables: { id },
    };
  }
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");

  const [errorResponse, errorBody] = await post("/v2", {
    body: buildRequest(""),
    headers: authHeader(session.id),
  });
  t.equal(errorResponse.status, 200);
  t.equal(
    errorBody.errors[0].message,
    "You must indicate the last archived notification"
  );

  const archiveStub = sandbox()
    .stub(NotificationsDAO, "archiveOlderThan")
    .resolves(10);

  const [response, body] = await post("/v2", {
    body: buildRequest("some-id"),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, { data: { archiveNotification: 10 } });

  t.deepEqual(archiveStub.args, [
    [
      archiveStub.args[0][0],
      {
        notificationId: "some-id",
        recipientUserId: user.id,
        onlyArchiveInbox: false,
      },
    ],
  ]);
});
