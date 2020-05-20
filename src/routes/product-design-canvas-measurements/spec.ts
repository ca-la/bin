import tape from "tape";
import uuid from "node-uuid";
import sinon from "sinon";

import createUser = require("../../test-helpers/create-user");
import { authHeader, del, get, patch, put } from "../../test-helpers/http";
import { sandbox, test } from "../../test-helpers/fresh";
import * as MeasurementDAO from "../../dao/product-design-canvas-measurements";
import { create as createDesign } from "../../components/product-designs/dao";
import * as CreateNotifications from "../../services/create-notifications";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";

test("PUT /:measurementId creates a Measurement", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const measurementId = uuid.v4();

  const design = await createDesign({
    productType: "TEESHIRT",
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
    endingX: 20,
    endingY: 20,
    id: measurementId,
    label: "A",
    measurement: "20 inches",
    name: null,
    startingX: 1,
    startingY: 1,
  };

  const notificationStub = sandbox()
    .stub(CreateNotifications, "sendDesignOwnerMeasurementCreateNotification")
    .resolves();

  const [response, body] = await put(
    `/product-design-canvas-measurements/${measurementId}`,
    {
      body: data,
      headers: authHeader(session.id),
    }
  );
  t.equal(response.status, 201);
  t.deepEqual(body, data);

  sinon.assert.callCount(notificationStub, 1);
});

test("PUT /:measurementId returns 400 if canvasId is invalid", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const measurementId = uuid.v4();

  const data = {
    canvasId: "60c63643-592c-4280-9d3f-55b934917ca9",
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 20,
    id: measurementId,
    label: "A",
    measurement: "20 inches",
    name: null,
    startingX: 1,
    startingY: 1,
  };

  const [response, body] = await put(
    `/product-design-canvas-measurements/${measurementId}`,
    {
      body: data,
      headers: authHeader(session.id),
    }
  );
  t.equal(response.status, 400);
  t.deepEqual(
    body.message,
    "Invalid canvas ID: 60c63643-592c-4280-9d3f-55b934917ca9"
  );
});

test("PATCH /:measurementId updates a Measurement", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const measurementId = uuid.v4();

  const design = await createDesign({
    productType: "TEESHIRT",
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
  const measurement = await MeasurementDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 20,
    id: measurementId,
    label: "A",
    measurement: "20 inches",
    name: null,
    startingX: 1,
    startingY: 1,
  });

  const data = {
    canvasId: designCanvas.id,
    createdAt: measurement.createdAt.toISOString(),
    createdBy: user.id,
    deletedAt: null,
    endingX: 23,
    endingY: 23,
    id: measurementId,
    label: "B",
    measurement: "22 inches",
    name: null,
    startingX: 1,
    startingY: 1,
  };
  const [response, body] = await patch(
    `/product-design-canvas-measurements/${measurementId}`,
    {
      body: data,
      headers: authHeader(session.id),
    }
  );
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test("PATCH /:measurementId returns 400 if canvasid is invalid", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const measurementId = uuid.v4();

  const design = await createDesign({
    productType: "TEESHIRT",
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
  const measurement = await MeasurementDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 20,
    id: measurementId,
    label: "A",
    measurement: "20 inches",
    name: null,
    startingX: 1,
    startingY: 1,
  });

  const data = {
    canvasId: "60c63643-592c-4280-9d3f-55b934917ca9",
    createdAt: measurement.createdAt.toISOString(),
    createdBy: user.id,
    deletedAt: null,
    endingX: 23,
    endingY: 23,
    id: measurementId,
    label: "B",
    measurement: "22 inches",
    name: null,
    startingX: 1,
    startingY: 1,
  };
  const [response, body] = await patch(
    `/product-design-canvas-measurements/${measurementId}`,
    {
      body: data,
      headers: authHeader(session.id),
    }
  );
  t.equal(response.status, 400);
  t.deepEqual(
    body.message,
    "Invalid canvas ID: 60c63643-592c-4280-9d3f-55b934917ca9"
  );
});

test("PATCH /:measurementId returns 404 if not found", async (t: tape.Test) => {
  const { session } = await createUser();

  // tslint:disable-next-line:max-line-length
  const [response, body] = await patch(
    "/product-design-canvas-measurements/00000000-0000-0000-0000-000000000000",
    {
      body: {
        canvasId: "00000000-0000-0000-0000-000000000000",
        createdAt: "2019-01-01",
        createdBy: "00000000-0000-0000-0000-000000000000",
        deletedAt: null,
        endingX: 23,
        endingY: 23,
        id: "00000000-0000-0000-0000-000000000000",
        label: "B",
        measurement: "22 inches",
        name: null,
        startingX: 1,
        startingY: 1,
      },
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 404);
  t.deepEqual(body.message, "Measurement not found");
});

test("DELETE /:measurementId deletes a Measurement", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const measurementId = uuid.v4();
  const canvasId = uuid.v4();
  const data = {
    canvasId,
    createdAt: "",
    createdBy: user.id,
    deletedAt: new Date().toISOString(),
    endingX: 20,
    endingY: 20,
    id: measurementId,
    label: "A",
    measurement: "20 inches",
    name: null,
    startingX: 1,
    startingY: 1,
  };
  sandbox().stub(MeasurementDAO, "deleteById").resolves(data);
  const [response] = await del(
    `/product-design-canvas-measurements/${measurementId}`,
    {
      headers: authHeader(session.id),
    }
  );
  t.equal(response.status, 204);
});

test("DELETE /:measurementId throws a 404 if not found", async (t: tape.Test) => {
  const { session } = await createUser();

  // tslint:disable-next-line:max-line-length
  const [response] = await del(
    "/product-design-canvas-measurements/00000000-0000-0000-0000-000000000000",
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 404);
});

test("GET /?canvasId=:canvasId returns Measurements", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const canvasId = uuid.v4();

  const data = [
    {
      canvasId,
      createdBy: user.id,
      endingX: 20,
      endingY: 10,
      id: uuid.v4(),
      label: "A",
      measurement: "16 inches",
      name: "sleeve length",
      startingX: 5,
      startingY: 2,
    },
    {
      canvasId,
      createdBy: user.id,
      endingX: 2,
      endingY: 10,
      id: uuid.v4(),
      label: "B",
      measurement: "6 inches",
      name: "sleeve width",
      startingX: 1,
      startingY: 1,
    },
  ];

  sandbox().stub(MeasurementDAO, "findAllByCanvasId").resolves(data);

  const [response, body] = await get(
    `/product-design-canvas-measurements/?canvasId=${canvasId}`,
    {
      headers: authHeader(session.id),
    }
  );
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test("GET /label?canvasId= gets the next label to use", async (t: tape.Test) => {
  const { session, user } = await createUser();

  const design = await createDesign({
    productType: "TEESHIRT",
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
  await MeasurementDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 20,
    id: uuid.v4(),
    label: "A",
    measurement: "20 inches",
    name: null,
    startingX: 1,
    startingY: 1,
  });
  await MeasurementDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 21,
    endingY: 23,
    id: uuid.v4(),
    label: "A",
    measurement: "5 inches",
    name: null,
    startingX: 11,
    startingY: 11,
  });

  const [
    response,
    body,
  ] = await get(
    `/product-design-canvas-measurements/label?canvasId=${designCanvas.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(response.status, 200);
  t.equal(body, "C", "Should return the third label");
});
