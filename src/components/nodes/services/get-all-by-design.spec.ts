import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { sandbox, test } from '../../../test-helpers/fresh';
import { getAllByDesign } from './get-all-by-design';
import * as NodesDAO from '../dao';
import * as ArtworksDAO from '../../attributes/artwork-attributes/dao';
import * as DimensionsDAO from '../../attributes/dimension-attributes/dao';
import * as MaterialsDAO from '../../attributes/material-attributes/dao';
import * as SketchesDAO from '../../attributes/sketch-attributes/dao';
import generateNode from '../../../test-helpers/factories/node';
import db = require('../../../services/db');
import createUser = require('../../../test-helpers/create-user');
import generateAsset from '../../../test-helpers/factories/asset';
import SketchAttribute from '../../attributes/sketch-attributes/domain-objects';
import * as Config from '../../../config';

test('getAllByDesign can handle the empty case', async (t: tape.Test) => {
  const findTreesStub = sandbox()
    .stub(NodesDAO, 'findNodeTrees')
    .resolves([]);
  const findRootStub = sandbox()
    .stub(NodesDAO, 'findRootNodesByDesign')
    .resolves([]);
  const artworkStub = sandbox()
    .stub(ArtworksDAO, 'findAllByNodes')
    .resolves([]);
  const dimensionStub = sandbox()
    .stub(DimensionsDAO, 'findAllByNodes')
    .resolves([]);
  const materialStub = sandbox()
    .stub(MaterialsDAO, 'findAllByNodes')
    .resolves([]);
  const sketchStub = sandbox()
    .stub(SketchesDAO, 'findAllByNodes')
    .resolves([]);

  const result = await getAllByDesign('abc-123');

  t.deepEqual(
    result,
    {
      assets: [],
      attributes: {
        artworks: [],
        dimensions: [],
        materials: [],
        sketches: []
      },
      nodes: []
    },
    'constructs the correct response object'
  );

  t.equal(findTreesStub.callCount, 1);
  t.equal(findRootStub.callCount, 1);
  t.equal(artworkStub.callCount, 1);
  t.equal(dimensionStub.callCount, 1);
  t.equal(materialStub.callCount, 1);
  t.equal(sketchStub.callCount, 1);
});

test('getAllByDesign will fetch all resources necessary for phidias', async (t: tape.Test) => {
  sandbox()
    .stub(Config, 'USER_UPLOADS_BASE_URL')
    .value('base-foo.com');
  sandbox()
    .stub(Config, 'USER_UPLOADS_IMGIX_URL')
    .value('imgix-foo.com');

  const { user } = await createUser({ withSession: false });
  const { asset: asset1 } = await generateAsset({
    userId: user.id,
    uploadCompletedAt: null
  });
  const assetId2 = uuid.v4();
  const { asset: asset2 } = await generateAsset({
    id: assetId2,
    mimeType: 'image/jpeg',
    userId: user.id,
    uploadCompletedAt: new Date()
  });

  const data = await db.transaction(
    async (trx: Knex.Transaction): Promise<any> => {
      const { node: node1 } = await generateNode(
        { createdBy: user.id, ordering: 0 },
        trx
      );
      const { node: node2 } = await generateNode(
        { createdBy: user.id, parentId: node1.id },
        trx
      );
      const { node: node3 } = await generateNode(
        { createdBy: user.id, ordering: 1 },
        trx
      );
      const { node: node4 } = await generateNode(
        { createdBy: user.id, ordering: 1, parentId: node1.id },
        trx
      );
      const sketchData: SketchAttribute = {
        createdAt: new Date(),
        createdBy: user.id,
        deletedAt: null,
        id: uuid.v4(),
        nodeId: node2.id,
        assetId: asset1.id,
        x: 0,
        y: 0,
        width: 1000,
        height: 1000
      };
      const sketchData2: SketchAttribute = {
        ...sketchData,
        assetId: asset2.id,
        id: uuid.v4(),
        nodeId: node4.id
      };
      const sketch1 = await SketchesDAO.create(sketchData, trx);
      const sketch2 = await SketchesDAO.create(sketchData2, trx);
      const dimension1 = await DimensionsDAO.create(
        {
          createdBy: user.id,
          id: uuid.v4(),
          nodeId: node1.id,
          width: 300,
          height: 300
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
        sketch1,
        sketch2
      };
    }
  );

  const findRootStub = sandbox()
    .stub(NodesDAO, 'findRootNodesByDesign')
    .resolves([data.node1, data.node3]);

  const result = await getAllByDesign('abc-123');

  t.deepEqual(result.assets, [
    {
      ...data.asset1,
      assetLinks: null
    },
    {
      ...data.asset2,
      assetLinks: {
        assetLink: `imgix-foo.com/${asset2.id}?fm=jpg&fit=max`,
        downloadLink: `base-foo.com/${asset2.id}`,
        fileType: 'jpeg',
        thumbnailLink: `imgix-foo.com/${asset2.id}?fm=jpg&fit=fill&h=104&w=104`,
        thumbnail2xLink: `imgix-foo.com/${
          asset2.id
        }?fm=jpg&fit=fill&h=104&w=104&dpr=2`
      },
      uploadCompletedAt: new Date(data.asset2.uploadCompletedAt)
    }
  ]);
  t.deepEqual(result.attributes, {
    artworks: [],
    dimensions: [data.dimension1],
    materials: [],
    sketches: [data.sketch1, data.sketch2]
  });
  t.deepEqual(result.nodes, [data.node1, data.node3, data.node2, data.node4]);

  t.equal(findRootStub.callCount, 1);
});
