import uuid from "node-uuid";

import * as CollaboratorsDAO from "../../collaborators/dao";
import * as CollectionsDAO from "../dao";
import * as CollectionDesignsDAO from "../dao/design";
import SessionsDAO from "../../../dao/sessions";
import ProductDesignsDAO from "../../product-designs/dao";
import API from "../../../test-helpers/http";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser = require("../../../test-helpers/create-user");
import generateCollaborator from "../../../test-helpers/factories/collaborator";
import generateCollection from "../../../test-helpers/factories/collection";
import { generateDesign } from "../../../test-helpers/factories/product-design";
import ProductDesign = require("../../product-designs/domain-objects/product-design");
import { TeamUsersDAO } from "../../team-users";

const collection = {
  id: "a-collection-id",
  createdBy: "a-user-id",
  teamId: null,
};
const ownerCollaborator = {
  userId: "a-user-id",
  role: "EDIT",
};
const partnerCollaborator = {
  userId: "a-partner-id",
  role: "PARTNER",
};

function setupStubs() {
  return {
    sessionStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role: "USER",
      userId: "a-user-id",
    }),
    findCollectionById: sandbox()
      .stub(CollectionsDAO, "findById")
      .resolves(collection),
    collaboratorStub: sandbox()
      .stub(CollaboratorsDAO, "findByCollectionAndUser")
      .resolves([ownerCollaborator]),
    moveDesignStub: sandbox()
      .stub(CollectionDesignsDAO, "moveDesigns")
      .resolves(1),
    removeDesignStub: sandbox()
      .stub(CollectionDesignsDAO, "removeDesigns")
      .resolves(1),
    findDesignsByCollectionId: sandbox()
      .stub(ProductDesignsDAO, "findByCollectionId")
      .resolves([{ id: "another-design-id" }]),
    findTeamUsersByCollection: sandbox()
      .stub(TeamUsersDAO, "findByUserAndCollection")
      .resolves([]),
  };
}

test("PUT + DEL /collections/:id/designs supports moving many designs to from/the collection", async (t: Test) => {
  const { user, session } = await createUser();
  const { collection: c1 } = await generateCollection({ createdBy: user.id });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response1.status, 200);
  t.deepEqual(
    body1.map((design: ProductDesign) => design.id),
    [d3.id, d2.id, d1.id]
  );

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response2.status, 200);
  t.deepEqual(
    body2.map((design: ProductDesign) => design.id),
    [d2.id]
  );
});

test("PUT + DEL /collections/:id/designs without collection-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { user: user2 } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({ createdBy: user2.id });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response1.status, 403);
  t.equal(body1.message, "You don't have permission to view this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response2.status, 403);
  t.equal(body2.message, "You don't have permission to view this collection");
});

test("PUT + DEL /collections/:id/designs without designs", async (t: Test) => {
  const { user, session } = await createUser();
  const { collection: c1 } = await generateCollection({ createdBy: user.id });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response1.status, 400);
  t.equal(body1.message, "designIds is a required query parameter.");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response2.status, 400);
  t.equal(body2.message, "designIds is a required query parameter.");
});

test("PUT /collections/:id/designs?designIds", async (t: Test) => {
  const { sessionStub, collaboratorStub } = setupStubs();
  const ownerRequest = await API.put(
    `/collections/${collection.id}/designs?designIds=a-design-id`,
    { headers: { Authorization: "Token a-session-id" } }
  );

  t.equal(ownerRequest[0].status, 200);
  t.deepEqual(
    ownerRequest[1],
    [{ id: "another-design-id" }],
    "request returns designs in collection"
  );

  sessionStub.resolves({ role: "PARTNER", userId: "a-partner-id" });
  collaboratorStub.resolves([partnerCollaborator]);
  const partnerRequest = await API.put(
    `/collections/${collection.id}/designs?designIds=a-design-id`,
    { headers: { Authorization: "Token a-session-id" } }
  );

  t.equal(partnerRequest[0].status, 403);

  sessionStub.resolves({ role: "ADMIN", userId: "an-admin-id" });
  collaboratorStub.resolves([]);
  const adminRequest = await API.put(
    `/collections/${collection.id}/designs?designIds=a-design-id`,
    { headers: { Authorization: "Token a-session-id" } }
  );

  t.equal(adminRequest[0].status, 200);
});

test("PUT /collections/:id/designs/:id", async (t: Test) => {
  const { sessionStub, collaboratorStub } = setupStubs();

  const ownerRequest = await API.put(
    `/collections/${collection.id}/designs/a-design-id`,
    { headers: { Authorization: "Token a-session-id" } }
  );

  t.equal(ownerRequest[0].status, 200);
  t.deepEqual(
    ownerRequest[1],
    [{ id: "another-design-id" }],
    "request returns designs in collection"
  );

  sessionStub.resolves({ role: "PARTNER", userId: "a-partner-id" });
  collaboratorStub.resolves([partnerCollaborator]);
  const partnerRequest = await API.put(
    `/collections/${collection.id}/designs/a-design-id`,
    { headers: { Authorization: "Token a-session-id" } }
  );

  t.equal(partnerRequest[0].status, 403);

  sessionStub.resolves({ role: "ADMIN", userId: "an-admin-id" });
  collaboratorStub.resolves([]);
  const adminRequest = await API.put(
    `/collections/${collection.id}/designs/a-design-id`,
    { headers: { Authorization: "Token a-session-id" } }
  );

  t.equal(adminRequest[0].status, 200);
});

test("DELETE /collections/:id/designs/:id", async (t: Test) => {
  const { sessionStub, collaboratorStub } = setupStubs();
  const ownerRequest = await API.del(
    `/collections/${collection.id}/designs/a-design-id`,
    { headers: { Authorization: "Token a-session-id" } }
  );

  t.equal(ownerRequest[0].status, 200);
  t.deepEqual(
    ownerRequest[1],
    [{ id: "another-design-id" }],
    "request returns designs in collection"
  );

  sessionStub.resolves({ role: "PARTNER", userId: "a-partner-id" });
  collaboratorStub.resolves([partnerCollaborator]);
  const partnerRequest = await API.del(
    `/collections/${collection.id}/designs/a-design-id`,
    { headers: { Authorization: "Token a-session-id" } }
  );

  t.equal(partnerRequest[0].status, 403);

  sessionStub.resolves({ role: "ADMIN", userId: "an-admin-id" });
  collaboratorStub.resolves([]);
  const adminRequest = await API.del(
    `/collections/${collection.id}/designs/a-design-id`,
    { headers: { Authorization: "Token a-session-id" } }
  );

  t.equal(adminRequest[0].status, 200);
});

test("GET /collections/:id/designs", async (t: Test) => {
  const { user, session } = await createUser();

  const createdAt = new Date();
  const c1 = await CollectionsDAO.create({
    createdAt,
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  const design = await ProductDesignsDAO.create({
    description: "Black, bold, beautiful",
    productType: "HELMET",
    title: "Vader Mask",
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });

  await API.put(`/collections/${c1.id}/designs/${design.id}`, {
    headers: API.authHeader(session.id),
  });

  const [, designs] = await API.get(`/collections/${c1.id}/designs`, {
    headers: API.authHeader(session.id),
  });

  t.equal(designs.length, 1);
  t.deepEqual(
    designs[0],
    {
      ...design,
      collectionIds: [c1.id],
      collections: [{ id: c1.id, title: c1.title }],
      createdAt: design.createdAt.toISOString(),
      permissions: {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      role: "EDIT",
    },
    "returns a list of contained designs"
  );
});
