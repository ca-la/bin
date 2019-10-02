import * as Knex from 'knex';
import { omit } from 'lodash';

import { sandbox, test, Test } from '../../../test-helpers/fresh';

import findAndDuplicateAttributesForNode from './node-attributes';
import * as db from '../../../services/db';

import * as LayoutsDAO from '../../../components/attributes/layout-attributes/dao';
import * as MaterialsDAO from '../../../components/attributes/material-attributes/dao';
import * as SketchesDAO from '../../../components/attributes/image-attributes/dao';

import * as DuplicateLayout from './layout';
import * as DuplicateMaterial from './material';
import * as DuplicateSketch from './image';
import { staticLayoutAttribute } from '../../../test-helpers/factories/layout-attribute';

test('findAndDuplicateAttributesForNode() empty case', async (t: Test) => {
  const findLayoutsStub = sandbox()
    .stub(LayoutsDAO, 'findAllByNodes')
    .resolves([]);
  const findMaterialsStub = sandbox()
    .stub(MaterialsDAO, 'findAllByNodes')
    .resolves([]);
  const findSketchesStub = sandbox()
    .stub(SketchesDAO, 'findAllByNodes')
    .resolves([]);

  const duplicateLayoutStub = sandbox()
    .stub(DuplicateLayout, 'default')
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

      t.equal(findLayoutsStub.callCount, 1);
      t.equal(findMaterialsStub.callCount, 1);
      t.equal(findSketchesStub.callCount, 1);

      t.equal(duplicateLayoutStub.callCount, 0);
      t.equal(duplicateMaterialStub.callCount, 0);
      t.equal(duplicateSketchStub.callCount, 0);
    }
  );
});

test('findAndDuplicateAttributesForNode() standard case', async (t: Test) => {
  const l1 = staticLayoutAttribute();

  const findLayoutsStub = sandbox()
    .stub(LayoutsDAO, 'findAllByNodes')
    .resolves([l1]);
  const findMaterialsStub = sandbox()
    .stub(MaterialsDAO, 'findAllByNodes')
    .resolves([]);
  const findSketchesStub = sandbox()
    .stub(SketchesDAO, 'findAllByNodes')
    .resolves([]);

  const duplicateLayoutStub = sandbox()
    .stub(DuplicateLayout, 'default')
    .callsFake((layout: any) => layout.currentLayout);
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
          dimensions: [l1],
          materials: [],
          sketches: []
        },
        'Returns a list of attributes'
      );

      t.equal(findLayoutsStub.callCount, 1);
      t.equal(findMaterialsStub.callCount, 1);
      t.equal(findSketchesStub.callCount, 1);

      t.equal(duplicateLayoutStub.callCount, 1);
      t.deepEqual(omit(duplicateLayoutStub.args[0][0], 'trx'), {
        currentLayout: l1,
        currentLayoutId: l1.id,
        newCreatorId: 'new-user',
        newNodeId: 'node-two'
      });

      t.equal(duplicateMaterialStub.callCount, 0);
      t.equal(duplicateSketchStub.callCount, 0);
    }
  );
});
