import tape from "tape";
import Knex from "knex";

import { test } from "../../test-helpers/fresh";
import API from "../../test-helpers/http";
import createUser = require("../../test-helpers/create-user");
import createDesign from "../../services/create-design";
import generateCollection from "../../test-helpers/factories/collection";
import { addDesign } from "../../test-helpers/collections";
import generateProductDesignStage from "../../test-helpers/factories/product-design-stage";
import generateTask from "../../test-helpers/factories/task";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import db from "../../services/db";

const API_PATH = "/access-control";

test(`GET ${API_PATH}/annotations checks access`, async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id,
  });
  const designOne = await createDesign({
    productType: "test",
    title: "design",
    userId: userOne.user.id,
  });
  await addDesign(collectionOne.id, designOne.id);
  const { canvas: canvasOne } = await generateCanvas({
    designId: designOne.id,
  });
  const { annotation: annotationOne } = await generateAnnotation({
    canvasId: canvasOne.id,
  });

  const [responseOne] = await API.get(
    `${API_PATH}/annotations/${annotationOne.id}`,
    {
      headers: API.authHeader(userOne.session.id),
    }
  );
  t.equal(responseOne.status, 200);

  const [responseTwo] = await API.get(
    `${API_PATH}/annotations/${annotationOne.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(responseTwo.status, 403);

  await generateCollaborator({
    collectionId: collectionOne.id,
    userId: userTwo.user.id,
  });
  const [responseThree] = await API.get(
    `${API_PATH}/annotations/${annotationOne.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(responseThree.status, 200);
});

test(`GET ${API_PATH}/notifications checks access`, async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const [response1] = await API.get(
    `${API_PATH}/notifications?userId=${userTwo.user.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(response1.status, 200);

  const [response2] = await API.get(
    `${API_PATH}/notifications?userId=${userOne.user.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(response2.status, 400);

  const [response3] = await API.get(
    `${API_PATH}/notifications?userId=abc-123`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(response3.status, 400);
});

test(`GET ${API_PATH}/tasks checks access`, async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id,
  });
  const designOne = await createDesign({
    productType: "test",
    title: "design",
    userId: userOne.user.id,
  });
  await addDesign(collectionOne.id, designOne.id);
  const { stage: stageOne } = await generateProductDesignStage({
    designId: designOne.id,
  });
  const { task: taskOne } = await generateTask({ designStageId: stageOne.id });

  const [responseOne] = await API.get(`${API_PATH}/tasks/${taskOne.id}`, {
    headers: API.authHeader(userOne.session.id),
  });
  t.equal(responseOne.status, 200);

  const [responseTwo] = await API.get(`${API_PATH}/tasks/${taskOne.id}`, {
    headers: API.authHeader(userTwo.session.id),
  });
  t.equal(responseTwo.status, 403);

  await generateCollaborator({
    collectionId: collectionOne.id,
    userId: userTwo.user.id,
  });
  const [responseThree] = await API.get(`${API_PATH}/tasks/${taskOne.id}`, {
    headers: API.authHeader(userTwo.session.id),
  });
  t.equal(responseThree.status, 200);
});

test(`GET ${API_PATH}/designs checks access`, async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const designOne = await createDesign({
    productType: "test",
    title: "design",
    userId: userOne.user.id,
  });

  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id,
  });
  await addDesign(collectionOne.id, designOne.id);

  const [responseOne, bodyOne] = await API.get(
    `${API_PATH}/designs/${designOne.id}`,
    {
      headers: API.authHeader(userOne.session.id),
    }
  );
  t.equal(responseOne.status, 200);
  t.deepEqual(bodyOne, {
    canComment: true,
    canDelete: true,
    canEdit: true,
    canEditVariants: true,
    canSubmit: true,
    canView: true,
  });

  const [responseTwo, bodyTwo] = await API.get(
    `${API_PATH}/designs/${designOne.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(responseTwo.status, 403);
  t.deepEqual(bodyTwo, {
    message: "You don't have permission to view this design",
  });

  await generateCollaborator({
    collectionId: collectionOne.id,
    userId: userTwo.user.id,
    role: "VIEW",
  });
  const [responseThree, bodyThree] = await API.get(
    `${API_PATH}/designs/${designOne.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(responseThree.status, 200);
  t.deepEqual(bodyThree, {
    canComment: true,
    canDelete: false,
    canEdit: false,
    canEditVariants: false,
    canSubmit: false,
    canView: true,
  });
});

test(`GET ${API_PATH}/approval-steps checks access`, async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const designOne = await createDesign({
    productType: "test",
    title: "design",
    userId: userOne.user.id,
  });

  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id,
  });
  await addDesign(collectionOne.id, designOne.id);

  const { approvalStep } = await db.transaction((trx: Knex.Transaction) =>
    generateApprovalStep(trx, { designId: designOne.id })
  );

  const [responseOne] = await API.get(
    `${API_PATH}/approval-steps/${approvalStep.id}`,
    {
      headers: API.authHeader(userOne.session.id),
    }
  );
  t.equal(responseOne.status, 200);

  const [responseTwo] = await API.get(
    `${API_PATH}/approval-steps/${approvalStep.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(responseTwo.status, 403);

  await generateCollaborator({
    collectionId: collectionOne.id,
    userId: userTwo.user.id,
    role: "VIEW",
  });
  const [responseThree] = await API.get(
    `${API_PATH}/approval-steps/${approvalStep.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(responseThree.status, 200);
});

test(`GET ${API_PATH}/collections checks access`, async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const designOne = await createDesign({
    productType: "test",
    title: "design",
    userId: userOne.user.id,
  });

  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id,
  });
  await addDesign(collectionOne.id, designOne.id);

  const [responseOne] = await API.get(
    `${API_PATH}/collections/${collectionOne.id}`,
    {
      headers: API.authHeader(userOne.session.id),
    }
  );
  t.equal(responseOne.status, 200);

  const [responseTwo] = await API.get(
    `${API_PATH}/collections/${collectionOne.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(responseTwo.status, 403);

  await generateCollaborator({
    collectionId: collectionOne.id,
    userId: userTwo.user.id,
    role: "VIEW",
  });
  const [responseThree] = await API.get(
    `${API_PATH}/collections/${collectionOne.id}`,
    {
      headers: API.authHeader(userTwo.session.id),
    }
  );
  t.equal(responseThree.status, 200);
});
