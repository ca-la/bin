import uuid from "node-uuid";

import ResourceNotFoundError from "../../errors/resource-not-found";
import createUser from "../../test-helpers/create-user";
import SessionsDAO from "../../dao/sessions";
import { authHeader, del, get, patch, put } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as AnnotationDAO from "./dao";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import createDesign from "../../services/create-design";

const API_PATH = "/product-design-canvas-annotations";

function setup() {
  const annotations = [
    {
      canvasId: "a-canvas-id",
      createdBy: "a-user-id",
      id: "an-annotation-id",
      x: 5,
      y: 2,
    },
    {
      canvasId: "a-canvas-id",
      createdBy: "a-user-id",
      id: "another-annotation-id",
      x: 1,
      y: 1,
    },
  ];

  return {
    annotations,
    sessionStub: sandbox().stub(SessionsDAO, "findById").resolves({
      id: "a-session-id",
      userId: "a-user-id",
    }),
    findByCanvasStub: sandbox()
      .stub(AnnotationDAO, "findAllByCanvasId")
      .resolves(annotations),
    findByCanvasWithCommentsStub: sandbox()
      .stub(AnnotationDAO, "findAllWithCommentsByCanvasId")
      .resolves(annotations),
    findByDesignStub: sandbox()
      .stub(AnnotationDAO, "findNotEmptyByDesign")
      .resolves(annotations),
  };
}

test(`PUT ${API_PATH}/:annotationId creates an Annotation`, async (t: Test) => {
  const { session, user } = await createUser();

  const annotationId = uuid.v4();

  const design = await createDesign({
    title: "Green Tee",
    userId: user.id,
  });
  const { canvas: designCanvas } = await generateCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: "My Green Tee",
    width: 200,
    x: 0,
    y: 0,
  });
  const data = {
    canvasId: designCanvas.id,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    id: annotationId,
    x: 1,
    y: 1,
  };

  const [response, body] = await put(`${API_PATH}/${annotationId}`, {
    body: data,
    headers: authHeader(session.id),
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test(`PATCH ${API_PATH}/:annotationId updates an Annotation`, async (t: Test) => {
  const { session, user } = await createUser();
  const annotationId = uuid.v4();

  const design = await createDesign({
    title: "Green Tee",
    userId: user.id,
  });
  const { canvas: designCanvas } = await generateCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: "My Green Tee",
    width: 200,
    x: 0,
    y: 0,
  });
  const annotation = await AnnotationDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: annotationId,
    x: 1,
    y: 1,
  });
  const data = {
    canvasId: designCanvas.id,
    createdAt: "something completely invalid",
    createdBy: "not a user id.",
    deletedAt: "also really invalid",
    id: annotation.id,
    x: 33,
    y: 10,
  };

  const [response, body] = await patch(`${API_PATH}/${annotationId}`, {
    body: data,
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    ...data,
    createdAt: annotation.createdAt.toISOString(),
    createdBy: annotation.createdBy,
    deletedAt: annotation.deletedAt,
  });
});

test(`DELETE ${API_PATH}/:annotationId deletes an Annotation`, async (t: Test) => {
  const { session, user } = await createUser();
  const annotationId = uuid.v4();
  const canvasId = uuid.v4();
  const data = {
    canvasId,
    createdAt: "",
    createdBy: user.id,
    deletedAt: new Date().toISOString(),
    id: annotationId,
    x: 1,
    y: 1,
  };
  const deleteStub = sandbox().stub(AnnotationDAO, "deleteById").resolves(data);
  const [response] = await del(`${API_PATH}/${annotationId}`, {
    headers: authHeader(session.id),
  });
  t.equal(response.status, 204);

  deleteStub.rejects(new ResourceNotFoundError("Annotation not found"));

  const [invalidResponse] = await del(`${API_PATH}/do-not-find-me`, {
    headers: authHeader(session.id),
  });
  t.equal(invalidResponse.status, 404);

  deleteStub.rejects(new Error("Some other error"));

  const [unknownErrorResponse] = await del(`${API_PATH}/do-not-find-me`, {
    headers: authHeader(session.id),
  });
  t.equal(unknownErrorResponse.status, 500);
});

test(`GET ${API_PATH}/?designId returns Annotations`, async (t: Test) => {
  const { annotations, findByDesignStub } = setup();

  const [response, body] = await get(`${API_PATH}/?designId=a-design-id`, {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "returns success status");
  t.deepEqual(body, annotations, "returns annotations in body");
  t.true(findByDesignStub.calledOnce, "calls correct DAO method");
});

test(`GET ${API_PATH}/ without a canvasId or designId fails`, async (t: Test) => {
  setup();

  const [response] = await get(`${API_PATH}/`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 400, "returns invalid data status");
});
