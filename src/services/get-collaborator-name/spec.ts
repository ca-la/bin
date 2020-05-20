import { test, Test } from "../../test-helpers/fresh";
import createUser = require("../../test-helpers/create-user");
import generateCollaborator from "../../test-helpers/factories/collaborator";
import getCollaboratorName from ".";
import generateCollection from "../../test-helpers/factories/collection";

test("getCollaboratorName gets correct name", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection();
  const { collaborator: cUser } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id,
  });

  const { collaborator: cEmail } = await generateCollaborator({
    collectionId: collection.id,
    userEmail: "test@test.test",
  });

  const name = getCollaboratorName(cUser);
  t.deepEqual(name, user.name, "collaborator with user name is returned");

  const email = getCollaboratorName(cEmail);
  t.deepEqual(email, "test@test.test", "collaborator with email is returned");
});
