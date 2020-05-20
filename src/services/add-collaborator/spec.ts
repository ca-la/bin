import { pick } from "lodash";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import addCollaborator from "./index";
import generateCollection from "../../test-helpers/factories/collection";
import * as NotificationsService from "../../services/create-notifications";

test("addCollaborator can add a collaborator", async (t: Test) => {
  const notificationsStub = sandbox()
    .stub(NotificationsService, "immediatelySendInviteCollaborator")
    .resolves();

  const { collection, createdBy } = await generateCollection();
  const collaborator = await addCollaborator({
    collectionId: collection.id,
    designId: null,
    email: "foo@example.com",
    inviterUserId: createdBy.id,
    role: "EDIT",
  });

  t.equal(notificationsStub.callCount, 1, "Calls the notifications service");
  const partialCollaborator = pick(collaborator, ["userEmail", "role"]);
  t.deepEqual(
    partialCollaborator,
    {
      role: "EDIT",
      userEmail: "foo@example.com",
    },
    "Creates a collaborator"
  );
});
