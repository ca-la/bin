import * as ComponentsDAO from "./dao";
import * as ProductDesignImagesDAO from "../assets/dao";
import tape from "tape";
import uuid from "node-uuid";
import createUser = require("../../test-helpers/create-user");
import {
  authHeader,
  del,
  get,
  patch,
  post,
  put,
} from "../../test-helpers/http";
import { sandbox, test } from "../../test-helpers/fresh";
import { ComponentType } from "./domain-object";
import { omit } from "lodash";

test("GET /components/:componentId returns Component", async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();
  const sketchId = uuid.v4();

  const data = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch,
  };
  const image = {
    createdAt: new Date(),
    description: "",
    getUrl: (): string => "",
    id: "",
    mimeType: "image/jpg",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    toJSON: (): any => "",
    userId: "",
  };

  sandbox().stub(ComponentsDAO, "findById").resolves(data);
  sandbox().stub(ProductDesignImagesDAO, "findById").resolves(image);

  const [response, body] = await get(`/components/${id}`, {
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(
    omit(
      body,
      "assetLink",
      "downloadLink",
      "thumbnail2xLink",
      "thumbnailLink",
      "fileType"
    ),
    data
  );
});

test("POST /components/ returns a Component", async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();
  const sketchId = uuid.v4();

  const data = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch,
  };
  const image = {
    createdAt: new Date(),
    description: "",
    getUrl: (): string => "",
    id: "",
    mimeType: "image/jpg",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    toJSON: (): any => "",
    userId: "",
  };

  sandbox().stub(ComponentsDAO, "create").resolves(data);
  sandbox().stub(ProductDesignImagesDAO, "findById").resolves(image);

  const [response, body] = await post("/components/", {
    body: data,
    headers: authHeader(session.id),
  });
  t.equal(response.status, 201);
  t.deepEqual(omit(body, "assetLink", "downloadLink"), data);
});

test("PUT /components/:id returns a Component", async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();
  const sketchId = uuid.v4();

  const data = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch,
  };
  const image = {
    createdAt: new Date(),
    description: "",
    getUrl: (): string => "",
    id: "",
    mimeType: "image/jpg",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    toJSON: (): any => "",
    userId: "",
  };

  sandbox().stub(ComponentsDAO, "create").resolves(data);
  sandbox().stub(ProductDesignImagesDAO, "findById").resolves(image);

  const [response, body] = await put(`/components/${id}`, {
    body: data,
    headers: authHeader(session.id),
  });
  t.equal(response.status, 201);
  t.deepEqual(omit(body, "assetLink", "downloadLink"), data);
});

test("PATCH /components/:componentId returns a Component", async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();
  const sketchId = uuid.v4();

  const data = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch,
  };
  const image = {
    createdAt: new Date(),
    description: "",
    getUrl: (): string => "",
    id: "",
    mimeType: "image/jpg",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    toJSON: (): any => "",
    userId: "",
  };

  sandbox().stub(ComponentsDAO, "update").resolves(data);
  sandbox().stub(ProductDesignImagesDAO, "findById").resolves(image);

  const [response, body] = await patch(`/components/${id}`, {
    body: data,
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(omit(body, "assetLink", "downloadLink"), data);
});

test("DELETE /components/:componentId deletes a Component", async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();
  const sketchId = uuid.v4();

  const data = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch,
  };
  const image = {
    createdAt: new Date(),
    description: "",
    getUrl: (): string => "",
    id: "",
    mimeType: "image/jpg",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    toJSON: (): any => "",
    userId: "",
  };

  sandbox().stub(ComponentsDAO, "del").resolves(data);
  sandbox().stub(ProductDesignImagesDAO, "findById").resolves(image);

  const [response] = await del(`/components/${id}`, {
    body: data,
    headers: authHeader(session.id),
  });
  t.equal(response.status, 204);
});
