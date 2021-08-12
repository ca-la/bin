import { pick } from "lodash";
import { test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateDesign } from "../../../test-helpers/factories/product-design";
import generateCanvas from "../../../test-helpers/factories/product-design-canvas";
import generateAnnotation from "../../../test-helpers/factories/product-design-canvas-annotation";
import generateMeasurement from "../../../test-helpers/factories/product-design-canvas-measurement";

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
