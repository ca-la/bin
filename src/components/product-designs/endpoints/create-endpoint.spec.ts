import uuid from "node-uuid";
import { test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import generateCollection from "../../../test-helpers/factories/collection";
import { generateTeamUser } from "../../../test-helpers/factories/team-user";
import { TeamUserRole } from "../../team-users";

async function setup() {
  const calaAdminUser = await createUser({ role: "ADMIN" });
  const arbitraryUser = await createUser();
  const viewerUser = await createUser();
  const editorUser = await createUser();
  const ownerUser = await createUser();
  const adminUser = await createUser();

  const collectionResult = await generateCollection({
    createdBy: ownerUser.user.id,
  });

  await generateTeamUser({
    userId: viewerUser.user.id,
    teamId: collectionResult.team.id,
    role: TeamUserRole.VIEWER,
  });
  await generateTeamUser({
    userId: editorUser.user.id,
    teamId: collectionResult.team.id,
    role: TeamUserRole.EDITOR,
  });
  await generateTeamUser({
    userId: adminUser.user.id,
    teamId: collectionResult.team.id,
    role: TeamUserRole.ADMIN,
  });

  return {
    calaAdminUser,
    adminUser,
    arbitraryUser,
    viewerUser,
    editorUser,
    ownerUser,
    ...collectionResult,
  };
}

function buildRequest(id: string, collectionId: string | null) {
  return {
    query: `mutation ($design: DesignInput!) {
      createDesign(design: $design) {
        id
        title
      }
    }`,
    variables: {
      design: {
        id,
        collectionId,
        title: "D1",
      },
    },
  };
}

test("createDesign needs authentication", async (t: Test) => {
  const { collection } = await setup();
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(uuid.v4(), collection.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("createDesign is forbidden for arbitrary user", async (t: Test) => {
  const { arbitraryUser, collection } = await setup();
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(uuid.v4(), collection.id),
    headers: authHeader(arbitraryUser.session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "You do not have permission to create a design in this collection"
  );
});

test("createDesign is forbidden for a viewer", async (t: Test) => {
  const { viewerUser, collection } = await setup();

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(uuid.v4(), collection.id),
    headers: authHeader(viewerUser.session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "You do not have permission to create a design in this collection"
  );
});

test("createDesign for collection is allowed for CALA admin, owner, admin and editor", async (t: Test) => {
  const {
    ownerUser,
    editorUser,
    adminUser,
    calaAdminUser,
    collection,
  } = await setup();
  const ownerId = uuid.v4();
  const [, ownerBody] = await post("/v2", {
    body: buildRequest(ownerId, collection.id),
    headers: authHeader(ownerUser.session.id),
  });
  t.equal(ownerBody.data.createDesign.title, "D1");
  t.equal(ownerBody.data.createDesign.id, ownerId);

  const editorId = uuid.v4();
  const [, editorBody] = await post("/v2", {
    body: buildRequest(editorId, collection.id),
    headers: authHeader(editorUser.session.id),
  });
  t.equal(editorBody.data.createDesign.title, "D1");
  t.equal(editorBody.data.createDesign.id, editorId);

  const adminId = uuid.v4();
  const [, adminBody] = await post("/v2", {
    body: buildRequest(adminId, collection.id),
    headers: authHeader(adminUser.session.id),
  });
  t.equal(adminBody.data.createDesign.title, "D1");
  t.equal(adminBody.data.createDesign.id, adminId);

  const calaAdminId = uuid.v4();
  const [, calaAdminBody] = await post("/v2", {
    body: buildRequest(calaAdminId, collection.id),
    headers: authHeader(calaAdminUser.session.id),
  });
  t.equal(calaAdminBody.data.createDesign.title, "D1");
  t.equal(calaAdminBody.data.createDesign.id, calaAdminId);
});

test("createDesign (draft) is allowed for arbitrary user", async (t: Test) => {
  const { arbitraryUser } = await setup();
  const id = uuid.v4();
  const [, body] = await post("/v2", {
    body: buildRequest(id, null),
    headers: authHeader(arbitraryUser.session.id),
  });
  t.equal(body.data.createDesign.title, "D1");
  t.equal(body.data.createDesign.id, id);
});
