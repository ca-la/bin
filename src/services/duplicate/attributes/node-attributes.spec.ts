import * as Knex from 'knex';
import { omit } from 'lodash';

import { sandbox, test, Test } from '../../../test-helpers/fresh';

import findAndDuplicateAttributesForNode from './node-attributes';
import * as db from '../../../services/db';

import * as ArtworksDAO from '../../../components/attributes/artwork-attributes/dao';
import * as DimensionsDAO from '../../../components/attributes/dimension-attributes/dao';
import * as MaterialsDAO from '../../../components/attributes/material-attributes/dao';
import * as SketchesDAO from '../../../components/attributes/sketch-attributes/dao';

import * as DuplicateArtwork from './artwork';
import * as DuplicateDimension from './dimension';
import * as DuplicateMaterial from './material';
import * as DuplicateSketch from './sketch';
import { staticArtworkAttribute } from '../../../test-helpers/factories/artwork-attribute';
import { staticDimensionAttribute } from '../../../test-helpers/factories/dimension-attribute';
import { staticAsset } from '../../../test-helpers/factories/asset';

test('findAndDuplicateAttributesForNode() empty case', async (t: Test) => {
  const findArtworksStub = sandbox()
    .stub(ArtworksDAO, 'findAllByNodes')
    .resolves([]);
  const findDimensionsStub = sandbox()
    .stub(DimensionsDAO, 'findAllByNodes')
    .resolves([]);
  const findMaterialsStub = sandbox()
    .stub(MaterialsDAO, 'findAllByNodes')
    .resolves([]);
  const findSketchesStub = sandbox()
    .stub(SketchesDAO, 'findAllByNodes')
    .resolves([]);

  const duplicateArtworkStub = sandbox()
    .stub(DuplicateArtwork, 'default')
    .resolves(null);
  const duplicateDimensionStub = sandbox()
    .stub(DuplicateDimension, 'default')
    .resolves(null);
  const duplicateMaterialStub = sandbox()
    .stub(DuplicateMaterial, 'default')
    .resolves(null);
  const duplicateSketchStub = sandbox()
    .stub(DuplicateSketch, 'default')
    .resolves(null);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const result = await findAndDuplicateAttributesForNode({
        currentNodeId: 'node-one',
        newCreatorId: 'new-user',
        newNodeId: 'node-two',
        trx
      });

      t.deepEqual(
        result,
        {
          artworks: [],
          dimensions: [],
          materials: [],
          sketches: []
        },
        'Returns a list of empty attributes'
      );

      t.equal(findArtworksStub.callCount, 1);
      t.equal(findDimensionsStub.callCount, 1);
      t.equal(findMaterialsStub.callCount, 1);
      t.equal(findSketchesStub.callCount, 1);

      t.equal(duplicateArtworkStub.callCount, 0);
      t.equal(duplicateDimensionStub.callCount, 0);
      t.equal(duplicateMaterialStub.callCount, 0);
      t.equal(duplicateSketchStub.callCount, 0);
    }
  );
});

test('findAndDuplicatAttributesForNode() standard case', async (t: Test) => {
  const asset1 = staticAsset();
  const a1 = staticArtworkAttribute({ assetId: asset1.id });
  const d1 = staticDimensionAttribute();

  const findArtworksStub = sandbox()
    .stub(ArtworksDAO, 'findAllByNodes')
    .resolves([{ ...a1, asset: asset1 }]);
  const findDimensionsStub = sandbox()
    .stub(DimensionsDAO, 'findAllByNodes')
    .resolves([d1]);
  const findMaterialsStub = sandbox()
    .stub(MaterialsDAO, 'findAllByNodes')
    .resolves([]);
  const findSketchesStub = sandbox()
    .stub(SketchesDAO, 'findAllByNodes')
    .resolves([]);

  const duplicateArtworkStub = sandbox()
    .stub(DuplicateArtwork, 'default')
    .callsFake((artwork: any) => artwork.currentArtwork);
  const duplicateDimensionStub = sandbox()
    .stub(DuplicateDimension, 'default')
    .callsFake((dimension: any) => dimension.currentDimension);
  const duplicateMaterialStub = sandbox()
    .stub(DuplicateMaterial, 'default')
    .resolves(null);
  const duplicateSketchStub = sandbox()
    .stub(DuplicateSketch, 'default')
    .resolves(null);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const result = await findAndDuplicateAttributesForNode({
        currentNodeId: 'node-one',
        newCreatorId: 'new-user',
        newNodeId: 'node-two',
        trx
      });

      t.deepEqual(
        result,
        {
          artworks: [a1],
          dimensions: [d1],
          materials: [],
          sketches: []
        },
        'Returns a list of attributes'
      );

      t.equal(findArtworksStub.callCount, 1);
      t.equal(findDimensionsStub.callCount, 1);
      t.equal(findMaterialsStub.callCount, 1);
      t.equal(findSketchesStub.callCount, 1);

      t.equal(duplicateArtworkStub.callCount, 1);
      t.deepEqual(omit(duplicateArtworkStub.args[0][0], 'trx'), {
        currentArtwork: a1,
        currentArtworkId: a1.id,
        newCreatorId: 'new-user',
        newNodeId: 'node-two'
      });

      t.equal(duplicateDimensionStub.callCount, 1);
      t.deepEqual(omit(duplicateDimensionStub.args[0][0], 'trx'), {
        currentDimension: d1,
        currentDimensionId: d1.id,
        newCreatorId: 'new-user',
        newNodeId: 'node-two'
      });

      t.equal(duplicateMaterialStub.callCount, 0);
      t.equal(duplicateSketchStub.callCount, 0);
    }
  );
});
