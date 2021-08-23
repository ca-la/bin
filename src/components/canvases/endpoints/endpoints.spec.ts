import { pick } from "lodash";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateDesign } from "../../../test-helpers/factories/product-design";
import generateCanvas from "../../../test-helpers/factories/product-design-canvas";
import generateAnnotation from "../../../test-helpers/factories/product-design-canvas-annotation";
import generateMeasurement from "../../../test-helpers/factories/product-design-canvas-measurement";
import generateComment from "../../../test-helpers/factories/comment";
import * as AnnotationCommentsDAO from "../../annotation-comments/dao";
import * as CanvasesDAO from "../../canvases/dao";
import generateCollaborator from "../../../test-helpers/factories/collaborator";

function buildRequest(canvasId: string) {
  return {
    query: `query ($canvasId: String) {
      CanvasAndEnvironment(canvasId: $canvasId) {
        canvasId,
        annotations {
          id
          x
          y
        }
        measurements {
          id
          label
        }
      }
    }`,
    variables: {
      canvasId,
    },
  };
}

function buildDeleteRequest(canvasId: string) {
  return {
    query: `mutation ($canvasId: String!) {
      deleteCanvas(canvasId: $canvasId) {
        id
        deletedAt
      }
    }`,
    variables: {
      canvasId,
    },
  };
}

test("CanvasAndEnvironment needs authentication", async (t: Test) => {
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest("d1"),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("CanvasAndEnvironment is forbidden for arbitrary user", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { session } = await createUser();
  const design = await generateDesign({ userId: user.id });
  const { canvas } = await generateCanvas({ designId: design.id });

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(canvas.id),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "Not authorized to view this design"
  );
});

test("CanvasAndEnvironment returns annotations and measurements", async (t: Test) => {
  const { session, user } = await createUser();
  const design = await generateDesign({ userId: user.id });
  const { canvas } = await generateCanvas({
    designId: design.id,
    title: "canvas 1",
  });
  const { annotation } = await generateAnnotation({
    canvasId: canvas.id,
    x: 1,
    y: 2,
  });
  // empty annotation
  await generateAnnotation({
    canvasId: canvas.id,
    x: 2,
    y: 3,
  });
  const { comment } = await generateComment({ userId: user.id });
  await AnnotationCommentsDAO.create({
    annotationId: annotation.id,
    commentId: comment.id,
  });

  const { measurement } = await generateMeasurement({
    canvasId: canvas.id,
    label: "m1",
  });

  const [response, body] = await post("/v2", {
    body: buildRequest(canvas.id),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      CanvasAndEnvironment: {
        canvasId: canvas.id,
        annotations: [pick(annotation, "id", "x", "y")],
        measurements: [pick(measurement, "id", "label")],
      },
    },
  });
});

test("DeleteCanvas deletes a canvas", async (t: Test) => {
  const testTime = new Date();
  sandbox().stub(CanvasesDAO, "del").resolves({
    id: "canvas-id",
    deletedAt: testTime,
  });
  sandbox().useFakeTimers(testTime);

  const { session, user } = await createUser();
  const { session: viewerSession, user: viewer } = await createUser();
  const { session: forbidden } = await createUser();
  const design = await generateDesign({ userId: user.id });
  await generateCollaborator({
    designId: design.id,
    userId: viewer.id,
    role: "VIEW",
  });
  const { canvas } = await generateCanvas({
    designId: design.id,
    title: "canvas 1",
  });

  const [response, body] = await post("/v2", {
    body: buildDeleteRequest(canvas.id),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(
    body,
    {
      data: {
        deleteCanvas: {
          id: "canvas-id",
          deletedAt: testTime.toISOString(),
        },
      },
    },
    "Canvas was deleted"
  );

  const [viewerResponse, viewerBody] = await post("/v2", {
    body: buildDeleteRequest(canvas.id),
    headers: authHeader(viewerSession.id),
  });

  t.equal(viewerResponse.status, 200);
  t.equal(
    viewerBody.errors[0].message,
    "Not authorized to edit this design",
    "Viewers cannot delete canvases"
  );

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildDeleteRequest(canvas.id),
    headers: authHeader(forbidden.id),
  });

  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "Not authorized to edit this design",
    "Users with no access cannot delete canvases"
  );
});
