import { Test, test } from "../../test-helpers/simple";
import { realtimeNotificationCreated } from "../notifications/realtime";
import { NotificationType } from "../notifications/types";
import { realtimeMessageSchema, unknownRealtimeMessageSchema } from "./types";

test("realtimeMessageSchema: valid", async (t: Test) => {
  const notificationCreated = realtimeNotificationCreated("a-user-id", {
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
    attachments: [],
    actions: [],
    archivedAt: null,
    matchedFilters: [],
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });

  const result = realtimeMessageSchema.safeParse(
    JSON.parse(JSON.stringify(notificationCreated))
  );

  t.true(result.success, "succeeds at parsing a valid message");
  t.deepEqual(
    result.success && result.data,
    notificationCreated,
    "returns parsed and deserialized data"
  );
});

test("realtimeMessageSchema: fall-through", async (t: Test) => {
  const unknownMessage = {
    type: "a-new-message/type",
    channels: ["many", "channels", "get", "this", "message"],
    resource: {
      foo: "doesn't matter",
    },
  };
  const result = realtimeMessageSchema.safeParse(unknownMessage);

  t.false(result.success, "fails with the generic message");

  const fallthrough = unknownRealtimeMessageSchema.safeParse(unknownMessage);
  t.deepEqual(
    fallthrough.success && fallthrough.data,
    {
      type: "a-new-message/type",
      channels: ["many", "channels", "get", "this", "message"],
      resource: {
        foo: "doesn't matter",
      },
    },
    "returns data as-is"
  );
});

test("realtimeMessageSchema: invalid: wrong shape", async (t: Test) => {
  const result = realtimeMessageSchema.safeParse({
    type: "a-new-message/type",
    channels: "oops! this should be an array",
    resourceBeepBoop: {
      foo: "doesn't matter",
    },
  });

  t.false(result.success, "does not succeed");
});
