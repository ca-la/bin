import uuid from "node-uuid";
import { ERRORS } from "pg-rethrow";

import { sandbox, test, Test } from "../../../test-helpers/fresh";
import { authHeader, put } from "../../../test-helpers/http";
import * as NodesDAO from "../../nodes/dao";
import * as AssetsDAO from "../../assets/dao";
import * as LayoutsDAO from "../../attributes/layout-attributes/dao";
import createUser = require("../../../test-helpers/create-user");
import createDesign from "../../../services/create-design";

// This is a heavy type that would require a lot of noise, but the
// type-inference works here, so going to disable the linting rule
// tslint:disable-next-line:typedef
async function generateAllData() {
  const admin = await createUser({ role: "ADMIN" });
  const designer = await createUser({ role: "USER" });
  const otherAdmin = await createUser({ role: "ADMIN" });

  const design = await createDesign({
    productType: "",
    title: "test",
    userId: admin.user.id,
  });
  const nodeId = uuid.v4();
  const asset = {
    createdAt: new Date(),
    description: null,
    id: uuid.v4(),
    mimeType: "image/jpeg",
    originalHeightPx: 300,
    originalWidthPx: 200,
    title: "",
    uploadCompletedAt: null,
    userId: admin.user.id,
  };
  const dimension = {
    createdAt: new Date(),
    createdBy: admin.user.id,
    deletedAt: null,
    id: uuid.v4(),
    height: 500,
    nodeId,
    width: 200,
  };
  const node = {
    id: nodeId,
    createdBy: admin.user.id,
    deletedAt: null,
    parentId: null,
    x: 0,
    y: 0,
    ordering: 0,
    title: null,
  };

  return {
    admin,
    designer,
    otherAdmin,
    design,
    asset,
    dimension,
    node,
  };
}

test("updateAllNodes updates all nodes", async (t: Test) => {
  const {
    admin,
    designer,
    otherAdmin,
    asset,
    design,
    dimension,
    node,
  } = await generateAllData();

  const body = {
    assets: [asset],
    attributes: {
      artworks: [],
      dimensions: [dimension],
      materials: [],
      sketches: [],
    },
    nodes: [node],
  };

  const [response, responseBody] = await put(`/product-designs/${design.id}`, {
    body,
    headers: authHeader(admin.session.id),
  });
  t.deepEqual(
    responseBody,
    {
      assets: [{ ...asset, createdAt: asset.createdAt.toISOString() }],
      attributes: {
        artworks: [],
        dimensions: [
          { ...dimension, createdAt: dimension.createdAt.toISOString() },
        ],
        materials: [],
        sketches: [],
      },
      nodes: [
        { ...node, createdAt: responseBody.nodes[0].createdAt, type: null },
      ],
    },
    "body matches expected shape"
  );
  t.equal(response.status, 200, "Response is 200");

  const [response2] = await put(`/product-designs/${design.id}`, {
    body,
    headers: authHeader(designer.session.id),
  });
  t.equal(response2.status, 403, "Response is 403");

  const [response3] = await put(`/product-designs/${design.id}`, {
    body,
    headers: authHeader(otherAdmin.session.id),
  });
  t.equal(response3.status, 200, "Response is 200");
});

test("updateAllNodes returns an error if any of the updates fail", async (t: Test) => {
  const { admin, asset, design, dimension, node } = await generateAllData();

  sandbox()
    .stub(LayoutsDAO, "updateOrCreate")
    .rejects(new ERRORS.InvalidTextRepresentation());
  sandbox().stub(AssetsDAO, "updateOrCreate").resolves(asset);
  sandbox().stub(NodesDAO, "updateOrCreate").resolves(node);

  const body = {
    assets: [asset],
    attributes: {
      artworks: [],
      dimensions: [dimension],
      materials: [],
      sketches: [],
    },
    nodes: [node],
  };

  const [response] = await put(`/product-designs/${design.id}`, {
    body,
    headers: authHeader(admin.session.id),
  });
  t.equal(response.status, 500, "Response is 500");
});
