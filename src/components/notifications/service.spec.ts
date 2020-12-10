import { test, Test } from "../../test-helpers/fresh";
import { transformNotificationMessageToGraphQL } from "./service";
import { NotificationMessage } from "./types";

test("transformNotificationMessageToGraphQL endpoint", async (t: Test) => {
  const notificationMessage: NotificationMessage = {
    id: "",
    title: "",
    html: "",
    readAt: null,
    link: "",
    createdAt: new Date(),
    actor: null,
    imageUrl: null,
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
