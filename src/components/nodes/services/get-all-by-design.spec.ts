import { NodeType } from "@cala/ts-lib/dist/phidias";
import Knex from "knex";
import uuid from "node-uuid";

import { sandbox, test, Test } from "../../../test-helpers/fresh";
import { getAllByDesign, getAllByDesignInclude } from "./get-all-by-design";
import * as NodesDAO from "../dao";
import * as LayoutsDAO from "../../attributes/layout-attributes/dao";
import * as MaterialsDAO from "../../attributes/material-attributes/dao";
import { generateDesign } from "../../../test-helpers/factories/product-design";
import * as ImagesDAO from "../../attributes/image-attributes/dao";
import generateNode from "../../../test-helpers/factories/node";
import db from "../../../services/db";
import createUser = require("../../../test-helpers/create-user");
import generateAsset from "../../../test-helpers/factories/asset";
import ImageAttribute from "../../attributes/image-attributes/domain-objects";
import Config from "../../../config";

// tslint:disable-next-line:typedef
async function setupNodes() {
  sandbox().stub(Config, "USER_UPLOADS_BASE_URL").value("base-foo.com");
  sandbox().stub(Config, "USER_UPLOADS_IMGIX_URL").value("imgix-foo.com");

  const { user } = await createUser({ withSession: false });
  const { asset: asset1 } = await generateAsset({
    userId: user.id,
    uploadCompletedAt: null,
  });
  const assetId2 = uuid.v4();
  const { asset: asset2 } = await generateAsset({
    id: assetId2,
    mimeType: "image/jpeg",
    userId: user.id,
    uploadCompletedAt: new Date(),
  });

  return db.transaction(
    async (trx: Knex.Transaction): Promise<any> => {
      const design = await generateDesign({ userId: user.id }, trx);
      const { node: node1 } = await generateNode(
        { type: NodeType.Frame, createdBy: user.id, ordering: 0 },
        trx,
        design.id
      );
      const { node: node2 } = await generateNode(
        { type: NodeType.Frame, createdBy: user.id, ordering: 1 },
        trx,
        design.id
      );
      const { node: node3 } = await generateNode(
        { type: NodeType.Image, createdBy: user.id, parentId: node1.id },
        trx,
        design.id
      );
      const { node: node4 } = await generateNode(
        {
          type: NodeType.Vector,
          createdBy: user.id,
          ordering: 1,
          parentId: node1.id,
        },
        trx,
        design.id
      );
      const imageData: ImageAttribute = {
        createdAt: new Date(),
        createdBy: user.id,
        deletedAt: null,
        id: uuid.v4(),
        nodeId: node3.id,
        assetId: asset1.id,
        x: 0,
        y: 0,
        width: 1000,
        height: 1000,
      };
      const imageData2: ImageAttribute = {
        ...imageData,
        assetId: asset2.id,
        id: uuid.v4(),
        nodeId: node4.id,
      };
      const image1 = await ImagesDAO.create(imageData, trx);
      const image2 = await ImagesDAO.create(imageData2, trx);
      const layout1 = await LayoutsDAO.create(
        {
          createdBy: user.id,
          id: uuid.v4(),
          nodeId: node1.id,
          width: 300,
          height: 300,
        },
        trx
      );
      const layout2 = await LayoutsDAO.create(
        {
          createdBy: user.id,
          id: uuid.v4(),
          nodeId: node2.id,
          width: 300,
          height: 300,
        },
        trx
      );
      const layout3 = await LayoutsDAO.create(
        {
          createdBy: user.id,
          id: uuid.v4(),
          nodeId: node3.id,
          width: 300,
          height: 300,
        },
        trx
      );
      const layout4 = await LayoutsDAO.create(
        {
          createdBy: user.id,
          id: uuid.v4(),
          nodeId: node4.id,
          width: 300,
          height: 300,
        },
        trx
      );

      return {
        assets: [asset1, asset2],
        design,
        layouts: [layout1, layout2, layout3, layout4],
        nodes: [node1, node2, node3, node4],
        images: [image1, image2],
      };
    }
  );
}

test("getAllByDesign can handle the empty case", async (t: Test) => {
  const findTreesStub = sandbox().stub(NodesDAO, "findNodeTrees").resolves([]);
  const findRootStub = sandbox()
    .stub(NodesDAO, "findRootNodesByDesign")
    .resolves([]);
  const dimensionStub = sandbox()
    .stub(LayoutsDAO, "findAllByNodes")
    .resolves([]);
  const materialStub = sandbox()
    .stub(MaterialsDAO, "findAllByNodes")
    .resolves([]);
  const imageStub = sandbox().stub(ImagesDAO, "findAllByNodes").resolves([]);

  const result = await getAllByDesign("abc-123");

  t.deepEqual(
    result,
    {
      assets: [],
      attributes: {
        artworks: [],
        dimensions: [],
        materials: [],
        sketches: [],
      },
      nodes: [],
    },
    "constructs the correct response object"
  );

  t.equal(findTreesStub.callCount, 1);
  t.equal(findRootStub.callCount, 1);
  t.equal(dimensionStub.callCount, 1);
  t.equal(materialStub.callCount, 1);
  t.equal(imageStub.callCount, 1);
});

test("getAllByDesign will fetch all resources necessary for phidias", async (t: Test) => {
  sandbox().stub(Config, "USER_UPLOADS_BASE_URL").value("base-foo.com");
  sandbox().stub(Config, "USER_UPLOADS_IMGIX_URL").value("imgix-foo.com");

  const { user } = await createUser({ withSession: false });
  const { asset: asset1 } = await generateAsset({
    userId: user.id,
    uploadCompletedAt: null,
  });
  const assetId2 = uuid.v4();
  const { asset: asset2 } = await generateAsset({
    id: assetId2,
    mimeType: "image/jpeg",
    userId: user.id,
    uploadCompletedAt: new Date(),
  });

  const data = await db.transaction(
    async (trx: Knex.Transaction): Promise<any> => {
      const { node: node1 } = await generateNode(
        { type: NodeType.Frame, createdBy: user.id, ordering: 0 },
        trx
      );
      const { node: node2 } = await generateNode(
        { type: NodeType.Image, createdBy: user.id, parentId: node1.id },
        trx
      );
      const { node: node3 } = await generateNode(
        { type: NodeType.Frame, createdBy: user.id, ordering: 1 },
        trx
      );
      const { node: node4 } = await generateNode(
        {
          type: NodeType.Vector,
          createdBy: user.id,
          ordering: 1,
          parentId: node1.id,
        },
        trx
      );
      const imageData: ImageAttribute = {
        createdAt: new Date(),
        createdBy: user.id,
        deletedAt: null,
        id: uuid.v4(),
        nodeId: node2.id,
        assetId: asset1.id,
        x: 0,
        y: 0,
        width: 1000,
        height: 1000,
      };
      const imageData2: ImageAttribute = {
        ...imageData,
        assetId: asset2.id,
        id: uuid.v4(),
        nodeId: node4.id,
      };
      const image1 = await ImagesDAO.create(imageData, trx);
      const image2 = await ImagesDAO.create(imageData2, trx);
      const dimension1 = await LayoutsDAO.create(
        {
          createdBy: user.id,
          id: uuid.v4(),
          nodeId: node1.id,
          width: 300,
          height: 300,
        },
        trx
      );

      return {
        asset1,
        asset2,
        dimension1,
        node1,
        node2,
        node3,
        node4,
        image1,
        image2,
      };
    }
  );

  const findRootStub = sandbox()
    .stub(NodesDAO, "findRootNodesByDesign")
    .resolves([data.node1, data.node3]);

  const result = await getAllByDesign("abc-123");

  t.deepEqual(result.assets, [
    {
      ...data.asset1,
      assetLinks: null,
    },
    {
      ...data.asset2,
      assetLinks: {
        assetLink: `imgix-foo.com/${asset2.id}?fm=jpg&fit=max`,
        downloadLink: `base-foo.com/${asset2.id}`,
        fileType: "jpeg",
        thumbnailLink: `imgix-foo.com/${asset2.id}?fm=jpg&fit=fill&h=104&w=104`,
        thumbnail2xLink: `imgix-foo.com/${asset2.id}?fm=jpg&fit=fill&h=104&w=104&dpr=2`,
      },
      uploadCompletedAt: new Date(data.asset2.uploadCompletedAt),
    },
  ]);
  t.deepEqual(result.attributes, {
    artworks: [],
    dimensions: [data.dimension1],
    materials: [],
    sketches: [data.image1, data.image2],
  });
  t.deepEqual(result.nodes, [data.node1, data.node3, data.node2, data.node4]);

  t.equal(findRootStub.callCount, 1);
});

test("getAllByDesignInclude", async (t: Test) => {
  const { assets, design, layouts, images, nodes } = await setupNodes();
  const allNodes = await getAllByDesignInclude(design.id);

  t.deepEqual(
    allNodes,
    [
      {
        ...nodes[0],
        layout: layouts[0],
      },
      {
        ...nodes[1],
        layout: layouts[1],
      },
      {
        ...nodes[2],
        layout: layouts[2],
        image: {
          ...images[0],
          asset: assets[0],
        },
      },
      {
        ...nodes[3],
        layout: layouts[3],
        image: {
          ...images[1],
          asset: assets[1],
        },
      },
    ],
    "Include attributes in node"
  );
});
