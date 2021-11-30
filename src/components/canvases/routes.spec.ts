import Knex from "knex";
import tape from "tape";
import uuid from "node-uuid";
import { omit, pick } from "lodash";

import * as ProductDesignCanvasesDAO from "./dao";
import * as ComponentsDAO from "../components/dao";
import * as CanvasSplitService from "./services/split";
import Logger from "../../services/logger";
import { Component } from "../components/types";
import Canvas from "./domain-object";
import { EnrichedComponent } from "./types";

import createUser from "../../test-helpers/create-user";
import {
  authHeader,
  del,
  get,
  patch,
  post,
  put,
} from "../../test-helpers/http";
import { sandbox, test, db } from "../../test-helpers/fresh";
import createDesign from "../../services/create-design";
import * as EnrichmentService from "../../services/enrich-component";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import * as Changes from "./services/gather-changes";
import generateAsset from "../../test-helpers/factories/asset";
import { ImgixResponseTypeError } from "../../services/imgix";

test("GET /product-design-canvases/:canvasId returns Canvas", async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    components: [],
    createdAt: "",
    designId: id,
    height: 10,
    id,
    ordering: 0,
    title: "test",
    width: 10,
    x: 0,
    y: 0,
  };

  sandbox().stub(ProductDesignCanvasesDAO, "findById").resolves(data);
  sandbox().stub(ComponentsDAO, "findById").returns(Promise.resolve([]));

  const [response, body] = await get(`/product-design-canvases/${id}`, {
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test("GET /product-design-canvases/?designId=:designId returns a list of Canvases", async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = [
    {
      components: [],
      createdAt: "",
      designId: id,
      height: 10,
      id,
      ordering: 0,
      title: "test",
      width: 10,
      x: 0,
      y: 0,
    },
  ];

  sandbox()
    .stub(ProductDesignCanvasesDAO, "findAllWithEnrichedComponentsByDesignId")
    .resolves(data);

  const [response, body] = await get(
    `/product-design-canvases?designId=${id}`,
    {
      headers: authHeader(session.id),
    }
  );
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test("POST /product-design-canvases returns a Canvas with Components", async (t: tape.Test) => {
  const { user, session } = await createUser();

  sandbox()
    .stub(EnrichmentService, "enrichComponent")
    .callsFake(
      async (_: Knex.Transaction, c: Component): Promise<EnrichedComponent> => {
        return {
          ...c,
          assetLink: "https://foo.bar/test.png",
          asset3xLink: "https://foo.bar/test3x.png",
          downloadLink: "",
          fileType: "png",
          thumbnail2xLink: "https://foo.bar/test-small/2x.png",
          thumbnailLink: "https://foo.bar/test-small.png",
          originalWidthPx: 640,
          originalHeightPx: 480,
          assetId: "test",
          key: "test",
          mimeType: "a-mime-type",
          option: null,
        };
      }
    );

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });
  const { asset: sketch } = await generateAsset({
    description: "",
    id: uuid.v4(),
    mimeType: "image/png",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    userId: user.id,
  });
  const componentId = uuid.v4();

  const image = {
    createdAt: new Date("2019-05-05"),
    id: uuid.v4(),
    mimeType: "image%2Fpng",
    originalHeightPx: 192,
    originalWidthPx: 192,
    title: "Michele Lamy",
    uploadCompletedAt: null,
    url: "https://foo.bar/test.png",
    userId: user.id,
  };
  const component = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    id: componentId,
    image,
    materialId: null,
    parentId: null,
    sketchId: sketch.id,
    type: "Sketch",
    assetPageNumber: null,
  };

  const data = [
    {
      componentId,
      components: [component],
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      deletedAt: null,
      designId: design.id,
      height: 0,
      id: uuid.v4(),
      ordering: 0,
      title: "Michele Lamy",
      width: 0,
      x: 0,
      y: 0,
    },
  ];

  const [response, body] = await post("/product-design-canvases/", {
    body: data,
    headers: authHeader(session.id),
  });
  t.equal(response.status, 201);
  t.deepEqual(
    omit(body[0], "archivedAt", "components"),
    omit(data[0], "components")
  );
  t.deepEqual(
    omit(
      body[0].components[0],
      "image",
      "assetLink",
      "asset3xLink",
      "downloadLink",
      "thumbnail2xLink",
      "thumbnailLink",
      "fileType",
      "originalHeightPx",
      "originalWidthPx",
      "assetId",
      "key",
      "mimeType",
      "option"
    ),
    omit(component, "image")
  );
});

test("POST /product-design-canvases throws 400 when given empty array", async (t: tape.Test) => {
  const { session } = await createUser();

  const [response, body] = await post("/product-design-canvases", {
    body: [],
    headers: authHeader(session.id),
  });
  t.equal(response.status, 400);
  t.deepEqual(body.message, "At least one canvas must be provided");
});

test("PATCH /product-design-canvases/:canvasId returns a Canvas", async (t: tape.Test) => {
  const { user, session } = await createUser();

  const assetLink = {
    assetId: "test",
    key: "test",
    assetLink: "https://foo.bar/test.png",
    asset3xLink: "https://foo.bar/test3x.png",
    downloadLink: "",
    fileType: "png",
    thumbnail2xLink: "https://foo.bar/test-small/2x.png",
    thumbnailLink: "https://foo.bar/test-small.png",
    originalWidthPx: 640,
    originalHeightPx: 480,
  };
  sandbox()
    .stub(EnrichmentService, "enrichComponentsList")
    .callsFake(
      async (
        _: Knex.Transaction,
        cList: Component[]
      ): Promise<EnrichedComponent[]> => {
        return cList.map((c: Component) => ({
          ...c,
          ...assetLink,
          mimeType: "a-mime-type",
          option: null,
        }));
      }
    );

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });
  const { asset: sketch } = await generateAsset({
    description: "",
    id: uuid.v4(),
    mimeType: "image/png",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    userId: user.id,
  });
  const componentId = uuid.v4();

  const image = {
    createdAt: new Date("2019-05-05"),
    id: uuid.v4(),
    mimeType: "image%2Fpng",
    originalHeightPx: 192,
    originalWidthPx: 192,
    title: "Michele Lamy",
    uploadCompletedAt: null,
    url: "https://foo.bar/test.png",
    userId: user.id,
  };
  const component = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    id: componentId,
    image,
    materialId: null,
    parentId: null,
    sketchId: sketch.id,
    type: "Sketch",
  };

  const data = {
    componentId,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    designId: design.id,
    height: 0,
    id: uuid.v4(),
    ordering: 0,
    title: "Michele Lamy",
    width: 0,
    x: 0,
    y: 0,
  };

  const updateStub = sandbox()
    .stub(ProductDesignCanvasesDAO, "update")
    .resolves(data);
  sandbox().stub(ComponentsDAO, "findAllByCanvasId").resolves([component]);

  const [response, body] = await patch(`/product-design-canvases/${data.id}`, {
    body: data,
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        ...data,
        components: [
          {
            ...component,
            ...assetLink,
            mimeType: "a-mime-type",
            option: null,
          },
        ],
      })
    )
  );

  updateStub.rejects(
    new ProductDesignCanvasesDAO.CanvasNotFoundError("Could not find canvas")
  );
  const [missingCanvasResponse] = await patch(
    `/product-design-canvases/${uuid.v4()}`,
    {
      body: data,
      headers: authHeader(session.id),
    }
  );
  t.equal(missingCanvasResponse.status, 404);
});

test("PATCH /product-design-canvases/ updates and returns list of Canvases", async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { canvas: canvas1, design } = await generateCanvas({
    createdBy: user.id,
  });
  const { canvas: canvas2 } = await generateCanvas({
    createdBy: user.id,
    designId: design.id,
  });
  const { canvas: canvas3 } = await generateCanvas({
    createdBy: user.id,
    designId: design.id,
  });

  const archivedDate = new Date(2012, 10, 19);
  const deletedDate = new Date(2013, 10, 19);
  const [response, body] = await patch(`/product-design-canvases/`, {
    body: [
      { id: canvas1.id, archivedAt: archivedDate },
      { id: canvas2.id, deletedAt: deletedDate },
      { id: canvas3.id, ordering: 99 },
    ],
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);

  t.deepEqual(
    body.map((canvas: Canvas) => omit(canvas, "components")),
    JSON.parse(
      JSON.stringify([
        {
          ...canvas1,
          archivedAt: archivedDate,
        },
        canvas2, // stays the same as we don't allow to update deletedAt
        {
          ...canvas3,
          ordering: 99,
        },
      ])
    ),
    "patch returned the passed canvas with updated structure"
  );

  const [notAuthed] = await patch(`/product-design-canvases/`, {
    body: [
      { id: canvas1.id, archivedAt: archivedDate },
      { id: canvas2.id, deletedAt: deletedDate },
      { id: canvas3.id, ordering: 99 },
    ],
    headers: authHeader("a-session-id"),
  });

  t.equal(notAuthed.status, 401, "responds with unauthorized response");
});

test("DEL /product-design-canvases/ deletes list of canvases", async (t: tape.Test) => {
  const { session } = await createUser();

  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(db, "transaction").yields(trxStub);
  const deleteStub = sandbox().stub(ProductDesignCanvasesDAO, "del").resolves();

  const [response] = await del(`/product-design-canvases/`, {
    body: ["a-canvas-id-1", "a-canvas-id-2"],
    headers: authHeader(session.id),
  });
  t.equal(response.status, 204);
  t.deepEqual(deleteStub.args, [
    [trxStub, "a-canvas-id-1"],
    [trxStub, "a-canvas-id-2"],
  ]);

  deleteStub.resetHistory();
  deleteStub.rejects(
    new ProductDesignCanvasesDAO.CanvasNotFoundError("Could not find canvas")
  );
  const [notFound] = await del(`/product-design-canvases/`, {
    body: ["a-canvas-id-1", "a-canvas-id-2"],
    headers: authHeader(session.id),
  });
  t.equal(notFound.status, 404, "Response with 404 on error");
  t.equal(deleteStub.callCount, 2);

  deleteStub.resetHistory();
  const [notAuthed] = await del(`/product-design-canvases/`, {
    body: ["a-canvas-id"],
    headers: authHeader("a-session-id"),
  });

  t.equal(notAuthed.status, 401, "responds with unauthorized response");
  t.equal(deleteStub.callCount, 0);
});

test("PATCH /product-design-canvases/reorder", async (t: tape.Test) => {
  const { session } = await createUser();

  sandbox().stub(ProductDesignCanvasesDAO, "reorder").resolves();

  const [response] = await patch(`/product-design-canvases/reorder`, {
    body: [
      { id: "", ordering: 0 },
      { id: "", ordering: 1 },
    ],
    headers: authHeader(session.id),
  });
  t.equal(response.status, 204);
});

test("DELETE /product-design-canvases/:canvasId deletes a Canvas", async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const deleteStub = sandbox().stub(ProductDesignCanvasesDAO, "del").resolves();

  const [response] = await del(`/product-design-canvases/${id}`, {
    headers: authHeader(session.id),
  });
  t.equal(response.status, 204);

  deleteStub.rejects(
    new ProductDesignCanvasesDAO.CanvasNotFoundError("Could not find canvas")
  );

  const [duplicateDeleteCall] = await del(`/product-design-canvases/${id}`, {
    headers: authHeader(session.id),
  });
  t.equal(duplicateDeleteCall.status, 404);
});

test("PUT /product-design-canvases/:canvasId/component/:componentId adds a component", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Rick Tee",
    userId: user.id,
  });
  const { canvas: designCanvas } = await generateCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: "My Rick Owens Tee",
    width: 200,
    x: 0,
    y: 0,
  });
  const { asset: sketch } = await generateAsset({
    description: "",
    id: uuid.v4(),
    mimeType: "image/png",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    userId: user.id,
  });
  const data = {
    artworkId: null,
    assetLink: "https://ca.la/images/my-cool-image",
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    materialId: null,
    parentId: null,
    sketchId: sketch.id,
    type: "Sketch",
    assetPageNumber: null,
  };

  const [response, body] = await put(
    `/product-design-canvases/${designCanvas.id}/component/${data.id}`,
    {
      body: data,
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(
    omit(pick(body.components[0], Object.keys(data)), "assetLink"),
    omit(data, "assetLink"),
    "Creates a component"
  );
});

test(`PUT /product-design-canvases/:canvasId/component/:componentId adds a component with a
pre-existing preview image`, async (t: tape.Test) => {
  const { session, user } = await createUser();
  const design = await createDesign({
    title: "Rick Tee",
    userId: user.id,
  });
  const { canvas: designCanvas } = await generateCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: "My Rick Owens Tee",
    width: 200,
    x: 0,
    y: 0,
  });
  const { asset: sketch } = await generateAsset({
    description: "",
    id: uuid.v4(),
    mimeType: "image/png",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    userId: user.id,
  });
  const data = {
    artworkId: null,
    assetLink: "https://ca.la/images/my-cool-image",
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    materialId: null,
    parentId: null,
    sketchId: sketch.id,
    type: "Sketch",
    assetPageNumber: null,
  };

  const [response, body] = await put(
    `/product-design-canvases/${designCanvas.id}/component/${data.id}`,
    {
      body: data,
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(
    omit(pick(body.components[0], Object.keys(data)), "assetLink"),
    omit(data, "assetLink"),
    "Creates a component"
  );
});

test("GET /:canvasId/changes returns a list of changes", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { canvas } = await generateCanvas({ createdBy: user.id });
  const changes = [
    {
      statement: "Created by Raf Simons",
      timestamp: new Date("2019-04-20"),
    },
    {
      statement: "Changed by Rick Owens",
      timestamp: new Date("2019-04-21"),
    },
  ];
  const gatherStub = sandbox().stub(Changes, "gatherChanges").resolves(changes);

  const [response, body] = await get(
    `/product-design-canvases/${canvas.id}/changes`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 200);
  t.equal(body.length, 2);
  t.deepEqual(
    { ...body[0], timestamp: new Date(body[0].timestamp) },
    changes[0]
  );
  t.deepEqual(
    { ...body[1], timestamp: new Date(body[1].timestamp) },
    changes[1]
  );
  t.deepEqual(gatherStub.args[0], [canvas.id]);
});

test("POST /:canvasId/split-pages splits pages", async (t: tape.Test) => {
  sandbox()
    .stub(CanvasSplitService, "splitCanvas")
    .resolves([
      { canvas: { id: "canvas1" }, components: [{ id: "component1" }] },
      { canvas: { id: "canvas2" }, components: [{ id: "component2" }] },
    ]);

  sandbox()
    .stub(EnrichmentService, "enrichComponentsList")
    .callsFake(
      async (
        _: Knex.Transaction,
        componentsList: Component[]
      ): Promise<any> => {
        return componentsList;
      }
    );

  const { session, user } = await createUser();
  const { canvas } = await generateCanvas({ createdBy: user.id });

  const [response, body] = await post(
    `/product-design-canvases/${canvas.id}/split-pages`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 201);
  t.equal(body.length, 2);
  t.deepEqual(body[0].id, "canvas1");
  t.deepEqual(body[0].components[0].id, "component1");
  t.deepEqual(body[1].id, "canvas2");
  t.deepEqual(body[1].components[0].id, "component2");
});

test("POST /:canvasId/split-pages catches when original canvas is deleted", async (t: tape.Test) => {
  sandbox()
    .stub(CanvasSplitService, "splitCanvas")
    .returns(
      Promise.reject(
        new ProductDesignCanvasesDAO.CanvasNotFoundError("Deleted")
      )
    );

  const { session, user } = await createUser();
  const { canvas } = await generateCanvas({ createdBy: user.id });

  const [response, body] = await post(
    `/product-design-canvases/${canvas.id}/split-pages`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 400, "Returns a client error");
  t.true(body.message.includes("Deleted"));
});

test("POST /:canvasId/split-pages returns and logs client error in case of ImgixResponseTypeError", async (t: tape.Test) => {
  sandbox()
    .stub(CanvasSplitService, "splitCanvas")
    .throws(
      new ImgixResponseTypeError({
        message: "Unexpected Imgix response type",
        status: 500,
        text: "",
      })
    );

  const logServerErrorStub = sandbox().stub(Logger, "logServerError");
  const logClientErrorStub = sandbox().stub(Logger, "logClientError");

  sandbox()
    .stub(EnrichmentService, "enrichComponent")
    .callsFake(
      async (_: Knex.Transaction, component: Component): Promise<any> => {
        return component;
      }
    );

  const { session, user } = await createUser();
  const { canvas } = await generateCanvas({ createdBy: user.id });

  const [response, body] = await post(
    `/product-design-canvases/${canvas.id}/split-pages`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 400);
  t.equal(body.message, "Unexpected Imgix response type");

  t.equal(logServerErrorStub.callCount, 0, "doesn't call logServerError");
  t.equal(logClientErrorStub.callCount, 1, "calls logClientError");
});
