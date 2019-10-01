import * as Knex from 'knex';
import { omit } from 'lodash';

import { sandbox, test, Test } from '../../../test-helpers/fresh';

import findAndDuplicateAttributesForNode from './node-attributes';
import * as db from '../../../services/db';

import * as DimensionsDAO from '../../../components/attributes/dimension-attributes/dao';
import * as MaterialsDAO from '../../../components/attributes/material-attributes/dao';
import * as SketchesDAO from '../../../components/attributes/image-attributes/dao';

import * as DuplicateDimension from './dimension';
import * as DuplicateMaterial from './material';
import * as DuplicateSketch from './image';
import { staticDimensionAttribute } from '../../../test-helpers/factories/dimension-attribute';

test('findAndDuplicateAttributesForNode() empty case', async (t: Test) => {
  const findDimensionsStub = sandbox()
    .stub(DimensionsDAO, 'findAllByNodes')
    .resolves([]);
  const findMaterialsStub = sandbox()
    .stub(MaterialsDAO, 'findAllByNodes')
    .resolves([]);
  const findSketchesStub = sandbox()
    .stub(SketchesDAO, 'findAllByNodes')
    .resolves([]);

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

      t.equal(findDimensionsStub.callCount, 1);
      t.equal(findMaterialsStub.callCount, 1);
      t.equal(findSketchesStub.callCount, 1);

      t.equal(duplicateDimensionStub.callCount, 0);
      t.equal(duplicateMaterialStub.callCount, 0);
      t.equal(duplicateSketchStub.callCount, 0);
    }
  );
});

test('findAndDuplicatAttributesForNode() standard case', async (t: Test) => {
  const d1 = staticDimensionAttribute();

  const findDimensionsStub = sandbox()
    .stub(DimensionsDAO, 'findAllByNodes')
    .resolves([d1]);
  const findMaterialsStub = sandbox()
    .stub(MaterialsDAO, 'findAllByNodes')
    .resolves([]);
  const findSketchesStub = sandbox()
    .stub(SketchesDAO, 'findAllByNodes')
    .resolves([]);

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
          artworks: [],
          dimensions: [d1],
          materials: [],
          sketches: []
        },
        'Returns a list of attributes'
      );

      t.equal(findDimensionsStub.callCount, 1);
      t.equal(findMaterialsStub.callCount, 1);
      t.equal(findSketchesStub.callCount, 1);

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
