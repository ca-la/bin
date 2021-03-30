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
    t.true(body.errors[0].message.includes("Something went wrong!"));
  });

  test("Fails on negative offset", async (t: Test) => {
    const { session } = await createUser({ role: "USER" });
    const headers = authHeader(session.id);
    const [response, body] = await post("/v2", {
      body: buildRequest({ offset: -1 }),
      headers,
    });
    t.equal(response.status, 200);
    t.true(body.errors[0].message.includes("Something went wrong!"));
  });

  test("Fails on negative limit", async (t: Test) => {
    const { session } = await createUser({ role: "USER" });
    const [response, body] = await post("/v2", {
      body: buildRequest({ limit: -1 }),
      headers: authHeader(session.id),
    });
    t.equal(response.status, 200);
    t.true(body.errors[0].message.includes("Something went wrong!"));
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

    t.deepEqual(
      createNotificationMessageStub.args,
      [[notification]],
      "db notifications are processed into notification messages"
    );
    t.deepEqual(body, {
      data: {
        notificationMessages: [pick(notificationMessage, "id", "title")],
      },
    });
  });
});

test("archiveNotifications endpoint", async (t: Test) => {
  const { session, user } = await createUser({ role: "USER" });
  function buildRequest(id: string = "") {
    return {
      operationName: "archive",
      query: `mutation archive($id: String!) {
        archiveNotifications(id: $id)
      }`,
      variables: { id },
    };
  }
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(),
  });
  t.equal(forbiddenResponse.status, 200);
  t.true(forbiddenBody.errors[0].message.includes("Something went wrong!"));

  const [errorResponse, errorBody] = await post("/v2", {
    body: buildRequest(""),
    headers: authHeader(session.id),
  });
  t.equal(errorResponse.status, 200);
  t.true(errorBody.errors[0].message.includes("Something went wrong!"));

  const archiveStub = sandbox()
    .stub(NotificationsDAO, "archiveOlderThan")
    .resolves(10);

  const [response, body] = await post("/v2", {
    body: buildRequest("some-id"),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, { data: { archiveNotifications: 10 } });

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

test("updateNotification endpoint", async (t: Test) => {
  const testTime = new Date(2020, 0, 1);
  const { session, user } = await createUser({ role: "USER" });
  const notification = {
    ...templateNotification,
    id: "not-id",
    actorUserId: "actor-id",
    recipientUserId: user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  };
  function buildRequest(id: string = "", archivedAt: Date | null = null) {
    return {
      operationName: "update",
      query: `mutation update($id: String!, $archivedAt: GraphQLDateTime) {
        updateNotification(id: $id, archivedAt: $archivedAt) {
          id
        }
      }`,
      variables: { id, archivedAt },
    };
  }
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(),
  });
  t.equal(forbiddenResponse.status, 200);
  t.true(forbiddenBody.errors[0].message.includes("Something went wrong!"));

  sandbox().stub(NotificationsDAO, "findById").resolves(notification);
  sandbox()
    .stub(NotificationMessages, "createNotificationMessage")
    .resolves({
      ...notificationMessage,
      id: "some-id",
      archivedAt: new Date(),
    });

  const updateStub = sandbox()
    .stub(NotificationsDAO, "update")
    .resolves({ id: "notification" });

  const [response, body] = await post("/v2", {
    body: buildRequest("some-id", testTime),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      updateNotification: { id: "some-id" },
    },
  });

  t.deepEqual(updateStub.args, [
    [
      updateStub.args[0][0],
      "some-id",
      {
        archivedAt: testTime,
      },
    ],
  ]);
});
