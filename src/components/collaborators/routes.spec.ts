import * as CollectionsDAO from "../collections/dao";
import * as ProductDesignsDAO from "../product-designs/dao";
import SessionsDAO from "../../dao/sessions";
import * as CollaboratorsDAO from "../collaborators/dao";
import * as AddCollaboratorService from "../../services/add-collaborator";
import { authHeader, del, get, patch, post } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PermissionsService from "../../services/get-permissions";
import * as NotificationService from "../../services/create-notifications";
import { Role } from "../users/types";
import Collaborator from "./types";
import { CollectionDb } from "../collections/types";

const c1: CollectionDb = {
  createdAt: new Date(),
  createdBy: "a-user-id",
  deletedAt: null,
  description: null,
  id: "a-collection-id",
  teamId: null,
  title: "A collection",
};

const col: Collaborator = {
  id: "a-collaborator-id",
  cancelledAt: null,
  collectionId: "a-collection-id",
  createdAt: new Date(),
  deletedAt: null,
  designId: null,
  invitationMessage: null,
  role: "EDIT",
  teamId: null,
  userEmail: null,
  userId: "a-user-id",
};

const updated = {
  ...col,
  role: "VIEW",
};

function setup(role: Role = "ADMIN") {
  return {
    sessionStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role,
      userId: "a-user-id",
    }),
    inviteCollaboratorStub: sandbox()
      .stub(NotificationService, "immediatelySendInviteCollaborator")
      .resolves(),
    findCollaboratorStub: sandbox()
      .stub(CollaboratorsDAO, "findById")
      .resolves(col),
    findByCollectionStub: sandbox()
      .stub(CollaboratorsDAO, "findByCollection")
      .resolves([col]),
    findByDesignsStub: sandbox()
      .stub(CollaboratorsDAO, "findByDesigns")
      .resolves([
        {
          designId: "a-design-id",
          collaborators: [
            { ...col, collectionId: null, designId: "a-design-id" },
          ],
        },
      ]),
    updateCollaboratorsStub: sandbox()
      .stub(CollaboratorsDAO, "update")
      .resolves(updated),
    deleteCollaboratorStub: sandbox()
      .stub(CollaboratorsDAO, "deleteById")
      .resolves(),
    addCollaboratorStub: sandbox()
      .stub(AddCollaboratorService, "default")
      .resolves(col),
    findCollectionStub: sandbox().stub(CollectionsDAO, "findById").resolves(c1),
    getCollectionPermissionsStub: sandbox()
      .stub(PermissionsService, "getCollectionPermissions")
      .resolves({
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      }),
  };
}

test("DELETE /collaborators/:id", async (t: Test) => {
  const { findCollaboratorStub } = setup();

  const [response] = await del("/collaborators/a-collaborator-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 204, "found / returns a no content status");

  findCollaboratorStub.resolves(null);
  const [missing] = await del("/collaborators/a-collaborator-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(missing.status, 404, "not found / returns a not found status");
});

test("POST /collaborators allows adding collaborators on a collection", async (t: Test) => {
  setup();

  const [response, body] = await post("/collaborators", {
    body: {
      collectionId: "a-collection-id",
      invitationMessage: "Take a look, y'all",
      role: "EDIT",
      userEmail: "you@example.com",
    },
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 201, "valid / returns success response");
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify(col)),
    "valid / returns result of creating as body"
  );
});

test("POST /collaborators throws 400 with unknown role", async (t: Test) => {
  setup();

  const [invalid] = await post("/collaborators", {
    body: {
      collectionId: "a-collection-id",
      invitationMessage: "Take a look, y'all",
      role: "NOT A ROLE",
      userEmail: "you@example.com",
    },
    headers: authHeader("a-session-id"),
  });

  t.equal(invalid.status, 400);
});

test("PATCH /collaborators allows updating collaborators on a collection", async (t: Test) => {
  setup();

  const [response, body] = await patch("/collaborators/a-collaborator-id", {
    body: {
      role: "VIEW",
    },
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "valid / returns success status");
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify(updated)),
    "valid / returns result of updating as body"
  );
});

test("PATCH /collaborators throws 400 with unknown role", async (t: Test) => {
  setup();

  const [invalid] = await patch("/collaborators/a-collaborator-id", {
    body: { role: "NOT A ROLE" },
    headers: authHeader("a-session-id"),
  });

  t.equal(invalid.status, 400, "invalid role / returns invalid data response");
});

test("GET /collaborators allows querying by collection ID", async (t: Test) => {
  setup();

  const [response, body] = await get(
    "/collaborators?collectionId=a-collection-id",
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(response.status, 200, "valid / returns success response");
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify([col])),
    "valid / returns collaborators"
  );
});

test("GET /collaborators?designIds= allows querying by design ids", async (t: Test) => {
  setup();

  const [response, body] = await get("/collaborators?designIds=a-design-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "valid / returns success response");
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify([
        {
          designId: "a-design-id",
          collaborators: [
            { ...col, collectionId: null, designId: "a-design-id" },
          ],
        },
      ])
    ),
    "valid / returns collaborators"
  );
});

test("GET /collaborators?collectionId for missing collection", async (t: Test) => {
  const { findCollectionStub } = setup();
  findCollectionStub.resolves(null);

  const [
    collectionResponse,
    collectionBody,
  ] = await get(
    "/collaborators?collectionId=d7567ce0-2fe3-404d-b1a4-393b661d5683",
    { headers: authHeader("a-session-id") }
  );

  t.equal(collectionResponse.status, 400);
  t.equal(
    collectionBody.message,
    "Could not find collection d7567ce0-2fe3-404d-b1a4-393b661d5683"
  );
});

test("GET /collaborators?designId for missing design", async (t: Test) => {
  setup();
  sandbox().stub(ProductDesignsDAO, "findById").resolves(null);
  const [
    designResponse,
    designBody,
  ] = await get(
    "/collaborators?designId=d7567ce0-2fe3-404d-b1a4-393b661d5683",
    { headers: authHeader("a-session-id") }
  );

  t.equal(designResponse.status, 400);
  t.equal(
    designBody.message,
    "Could not find design d7567ce0-2fe3-404d-b1a4-393b661d5683"
  );
});

test("GET /collaborators requires access to the resource you want to access", async (t: Test) => {
  setup();

  const [response, body] = await get(
    `/collaborators?collectionId=a-collection-id&designId=a-design-id`,
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(response.status, 400);
  t.equal(body.message, "Must pass only one query parameter at a time!");
});
