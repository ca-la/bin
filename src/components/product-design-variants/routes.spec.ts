import Knex from "knex";
import tape from "tape";
import uuid from "node-uuid";
import { pick } from "lodash";
import { Variant } from "./types";
import db from "../../services/db";
import createUser from "../../test-helpers/create-user";
import createDesign from "../../services/create-design";
import API from "../../test-helpers/http";
import { sandbox, test } from "../../test-helpers/fresh";
import * as ProductDesignVariantsDAO from "./dao";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import * as DesignEventsService from "../design-events/service";
import { ApprovalStepState, ApprovalStepType } from "../approval-steps/types";

const API_PATH = "/product-design-variants";

test(`GET ${API_PATH}?designId fetches all variants for a design`, async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { session: sessionTwo, user: userTwo } = await createUser();
  const { session: randomSession } = await createUser();

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: "Come see my cool shirt",
    role: "VIEW",
    userEmail: null,
    userId: userTwo.id,
  });
  const variantOne = await ProductDesignVariantsDAO.create({
    colorName: "Green",
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: "M",
    unitsToProduce: 123,
    universalProductCode: null,
    sku: null,
    isSample: false,
    colorNamePosition: 1,
  });
  const variantTwo = await ProductDesignVariantsDAO.create({
    colorName: "Yellow",
    designId: design.id,
    id: uuid.v4(),
    position: 1,
    sizeName: "M",
    unitsToProduce: 100,
    universalProductCode: null,
    sku: null,
    isSample: false,
    colorNamePosition: 2,
  });

  const [failedResponse] = await API.get(`${API_PATH}/?designId=${design.id}`, {
    headers: API.authHeader(randomSession.id),
  });
  t.equal(failedResponse.status, 403);

  const [response, body] = await API.get(`${API_PATH}/?designId=${design.id}`, {
    headers: API.authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(
    body.map((variant: Variant): string => variant.id),
    [variantOne.id, variantTwo.id]
  );

  // A collaborator should have access to the variants.
  const [responseTwo, bodyTwo] = await API.get(
    `${API_PATH}/?designId=${design.id}`,
    {
      headers: API.authHeader(sessionTwo.id),
    }
  );
  t.equal(responseTwo.status, 200);
  t.deepEqual(
    bodyTwo.map((variant: Variant): string => variant.id),
    [variantOne.id, variantTwo.id]
  );
});

test(`PUT ${API_PATH}?designId replaces all variants for a design`, async (t: tape.Test) => {
  const owner = await createUser();
  const viewer = await createUser();
  const editor = await createUser();
  const rando = await createUser();
  const admin = await createUser({ role: "ADMIN" });

  const universalProductCode = "928076178457";
  const sku = "sku-1";

  const isQuoteCommittedStub = sandbox()
    .stub(DesignEventsService, "isQuoteCommitted")
    .resolves(false);

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: owner.user.id,
  });
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: "Come see my cool shirt",
    role: "VIEW",
    userEmail: null,
    userId: viewer.user.id,
  });
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: "Come edit my cool shirt",
    role: "EDIT",
    userEmail: null,
    userId: editor.user.id,
  });
  await ProductDesignVariantsDAO.create({
    colorName: "Green",
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: "M",
    unitsToProduce: 999,
    universalProductCode: null,
    sku: null,
    isSample: false,
    colorNamePosition: 1,
  });
  await ProductDesignVariantsDAO.create({
    colorName: "Yellow",
    designId: design.id,
    id: uuid.v4(),
    position: 1,
    sizeName: "M",
    unitsToProduce: 1,
    universalProductCode: null,
    sku: null,
    isSample: false,
    colorNamePosition: 2,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await generateApprovalStep(trx, {
      designId: design.id,
      type: ApprovalStepType.CHECKOUT,
      state: ApprovalStepState.COMPLETED,
      startedAt: new Date(),
      completedAt: new Date(),
    });
  });

  const variants = [
    {
      colorName: "Green",
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      position: 0,
      sizeName: "L",
      universalProductCode,
      sku,
      unitsToProduce: 101,
    },
    {
      colorName: "Green",
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      position: 1,
      sizeName: "M",
      unitsToProduce: 899,
    },
  ];

  const [failedResponse] = await API.put(`${API_PATH}/?designId=${design.id}`, {
    body: variants,
    headers: API.authHeader(rando.session.id),
  });
  t.equal(failedResponse.status, 403);

  const [initialResponse, initialBody] = await API.put(
    `${API_PATH}/?designId=${design.id}`,
    {
      body: variants,
      headers: API.authHeader(owner.session.id),
    }
  );
  t.equal(initialResponse.status, 200);
  t.deepEqual(
    initialBody.map((variant: Variant): string => variant.id),
    [variants[0].id, variants[1].id]
  );

  const [emptyResponse, emptyBody] = await API.put(
    `${API_PATH}/?designId=${design.id}`,
    {
      body: [],
      headers: API.authHeader(owner.session.id),
    }
  );
  t.equal(emptyResponse.status, 200);
  t.deepEqual(emptyBody, [], "Returns an empty list");

  const [editorResponse, editorBody] = await API.put(
    `${API_PATH}/?designId=${design.id}`,
    {
      body: variants,
      headers: API.authHeader(editor.session.id),
    }
  );
  t.equal(editorResponse.status, 200);
  t.deepEqual(
    editorBody.map((variant: Variant): string => variant.id),
    [variants[0].id, variants[1].id]
  );

  t.deepEqual(
    pick(editorBody[0], "universalProductCode", "sku"),
    {
      universalProductCode,
      sku,
    },
    "keeps existing upc and sku"
  );
  t.true(editorBody[1].sku, "generates new sku");
  t.true(editorBody[1].universalProductCode, "generates new upc");

  // A view collaborator should not have permissions to edit the variants.
  const [viewerResponse] = await API.put(`${API_PATH}/?designId=${design.id}`, {
    body: variants,
    headers: API.authHeader(viewer.session.id),
  });
  t.equal(viewerResponse.status, 403);
  t.equal(isQuoteCommittedStub.callCount, 5, "checkout status is checked");

  isQuoteCommittedStub.resolves(true);
  const [ownerLockedResponse] = await API.put(
    `${API_PATH}/?designId=${design.id}`,
    {
      body: variants,
      headers: API.authHeader(owner.session.id),
    }
  );
  t.equal(
    ownerLockedResponse.status,
    400,
    "non-admins cannot update locked variants"
  );

  isQuoteCommittedStub.resetHistory();
  const [adminResponse] = await API.put(`${API_PATH}/?designId=${design.id}`, {
    body: variants,
    headers: API.authHeader(admin.session.id),
  });
  t.equal(adminResponse.status, 200, "admins can update locked variants");
  t.equal(isQuoteCommittedStub.callCount, 0, "admins skip the commit check");
});

test(`PUT ${API_PATH}?designId for a not checked out design doesn't set codes`, async (t: tape.Test) => {
  const owner = await createUser();

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: owner.user.id,
  });
  await ProductDesignVariantsDAO.create({
    colorName: "Green",
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: "M",
    unitsToProduce: 999,
    universalProductCode: null,
    sku: null,
    isSample: false,
    colorNamePosition: 1,
  });

  const variants = [
    {
      colorName: "Green",
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      position: 1,
      sizeName: "M",
      unitsToProduce: 899,
    },
  ];

  const [response, body] = await API.put(`${API_PATH}/?designId=${design.id}`, {
    body: variants,
    headers: API.authHeader(owner.session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body[0].sku, null);
  t.equal(response.status, 200);
  t.deepEqual(body[0].universalProductCode, null);
});
