import Knex from "knex";
import uuid from "node-uuid";

import { db, test, Test } from "../../test-helpers/fresh";
import * as CanvasesDAO from "../../components/canvases/dao";
import generateComponentRelationship from "../../test-helpers/factories/component-relationship";
import generateComponent from "../../test-helpers/factories/component";
import generateProcess from "../../test-helpers/factories/process";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import createUser = require("../../test-helpers/create-user");
import API from "../../test-helpers/http";

test("GET /component-relationships/?componentId returns a list of relationships", async (t: Test) => {
  const { session, user } = await createUser();
  const { session: sessionTwo } = await createUser();
  const {
    componentRelationship: relationshipOne,
    sourceComponent: component,
  } = await generateComponentRelationship({ createdBy: user.id });
  const {
    componentRelationship: relationshipTwo,
  } = await generateComponentRelationship({
    createdBy: user.id,
    targetComponentId: component.id,
  });
  const { canvas } = await generateCanvas({
    componentId: component.id,
    createdBy: user.id,
  });

  const [getResponse, getBody] = await API.get(
    `/component-relationships/?componentId=${component.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(getResponse.status, 200, "GET returns a 200 status");
  t.deepEqual(
    getBody,
    [
      {
        ...relationshipOne,
        createdAt: relationshipOne.createdAt.toISOString(),
      },
      {
        ...relationshipTwo,
        createdAt: relationshipTwo.createdAt.toISOString(),
      },
    ],
    "Successfully fetches the relationship objects for the given component"
  );

  const [failedResponse] = await API.get(
    `/component-relationships/?componentId=${component.id}`,
    {
      headers: API.authHeader(sessionTwo.id),
    }
  );
  t.equal(
    failedResponse.status,
    403,
    "GET returns a 403 status when a random user attempts to fetch the list"
  );

  await db.transaction((trx: Knex.Transaction) =>
    CanvasesDAO.del(trx, canvas.id)
  );

  const [deletedCanvas] = await API.get(
    `/component-relationships/?componentId=${component.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );
  t.equal(deletedCanvas.status, 404, "responds with Not Found status");
});

test("GET /component-relationships/:relationshipId returns a relationship", async (t: Test) => {
  const { session } = await createUser();
  const {
    componentRelationship: relationship,
  } = await generateComponentRelationship({});

  const [getResponse, getBody] = await API.get(
    `/component-relationships/${relationship.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(getResponse.status, 200, "GET returns a 200 status");
  t.deepEqual(
    { ...getBody, createdAt: null },
    { ...relationship, createdAt: null },
    "Successfully fetches the relationship object"
  );
});

test("PUT /component-relationships/:relationshipId creates a relationship", async (t: Test) => {
  const { session, user } = await createUser();
  const { session: sessionTwo } = await createUser();
  const { component } = await generateComponent({ createdBy: user.id });
  const { process } = await generateProcess({});
  await generateCanvas({
    componentId: component.id,
    createdBy: user.id,
  });

  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    processId: process.id,
    relativeX: 0,
    relativeY: 0,
    sourceComponentId: component.id,
    targetComponentId: component.id,
  };

  const [putResponse, putBody] = await API.put(
    `/component-relationships/${body.id}`,
    {
      body,
      headers: API.authHeader(session.id),
    }
  );
  t.equal(putResponse.status, 200, "PUT returns a 200 status");
  t.deepEqual(
    { ...putBody, createdAt: null },
    { ...body, createdAt: null },
    "Successfully returns the relationship which was inserted"
  );

  const [putResponseTwo] = await API.put(
    `/component-relationships/${body.id}`,
    {
      body,
      headers: API.authHeader(sessionTwo.id),
    }
  );
  t.equal(putResponseTwo.status, 403);
});

test("PATCH /component-relationships/:relationshipId updates a relationship", async (t: Test) => {
  const { session, user } = await createUser();
  const { session: sessionTwo } = await createUser();
  const { component } = await generateComponent({ createdBy: user.id });
  const { componentRelationship } = await generateComponentRelationship({
    createdBy: user.id,
    sourceComponentId: component.id,
    targetComponentId: component.id,
  });
  const { process } = await generateProcess({});
  await generateCanvas({
    componentId: component.id,
    createdBy: user.id,
  });

  const body = {
    ...componentRelationship,
    processId: process.id,
  };

  const [patchResponse, patchBody] = await API.patch(
    `/component-relationships/${body.id}`,
    {
      body,
      headers: API.authHeader(session.id),
    }
  );
  t.equal(patchResponse.status, 200, "PUT returns a 200 status");
  t.deepEqual(
    { ...patchBody, createdAt: null },
    { ...body, createdAt: null },
    "Successfully returns the relationship which was updated"
  );

  const [patchResponseTwo] = await API.patch(
    `/component-relationships/${body.id}`,
    {
      body,
      headers: API.authHeader(sessionTwo.id),
    }
  );
  t.equal(patchResponseTwo.status, 403);
});

test("DEL /component-relationships/:relationshipId deletes a relationship", async (t: Test) => {
  const { session, user } = await createUser();
  const { session: sessionTwo } = await createUser();
  const { component } = await generateCanvas({ createdBy: user.id });
  const { componentRelationship } = await generateComponentRelationship({
    createdBy: user.id,
    sourceComponentId: component.id,
    targetComponentId: component.id,
  });

  const [delResponseTwo] = await API.del(
    `/component-relationships/${componentRelationship.id}`,
    {
      headers: API.authHeader(sessionTwo.id),
    }
  );
  t.equal(delResponseTwo.status, 403);

  const [delResponse] = await API.del(
    `/component-relationships/${componentRelationship.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );
  t.equal(delResponse.status, 204, "DEL returns a 204 status");
});
