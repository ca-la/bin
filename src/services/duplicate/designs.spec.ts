import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import { test } from '../../test-helpers/fresh';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import createUser = require('../../test-helpers/create-user');

import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import * as TaskEventsDAO from '../../dao/task-events';
import * as CanvasesDAO from '../../components/canvases/dao';
import * as ComponentsDAO from '../../components/components/dao';
import * as VariantsDAO from '../../components/product-design-variants/dao';

import { findAndDuplicateDesign } from './designs';

test('findAndDuplicateDesign', async (t: tape.Test) => {
  const { user: duplicatingUser } = await createUser({ withSession: false });
  // generate a design with a canvas with a component.
  const { component, canvas, design } = await generateCanvas({});
  // generate a variant for the design.
  const variantOne = await VariantsDAO.create({
    colorName: 'Green',
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: 'M',
    unitsToProduce: 123,
    universalProductCode: null
  });

  const duplicatedDesign = await db.transaction((trx: Knex.Transaction) =>
    findAndDuplicateDesign(design.id, duplicatingUser.id, trx)
  );

  t.deepEqual(
    duplicatedDesign,
    {
      ...design,
      createdAt: duplicatedDesign.createdAt,
      id: duplicatedDesign.id,
      userId: duplicatingUser.id
    },
    'Returns the same design but with a new id and created at timestamp'
  );

  const duplicateVariants = await VariantsDAO.findByDesignId(
    duplicatedDesign.id
  );
  t.equal(duplicateVariants.length, 1);
  const variantDupeOne = duplicateVariants[0];
  t.deepEqual(
    variantDupeOne,
    {
      ...variantOne,
      createdAt: variantDupeOne.createdAt,
      designId: duplicatedDesign.id,
      id: variantDupeOne.id
    },
    'A variant duplicate was generated that is based off the original design variant'
  );

  const duplicateCollaborators = await CollaboratorsDAO.findByDesign(
    duplicatedDesign.id
  );
  t.equal(duplicateCollaborators.length, 1);
  t.equal(duplicateCollaborators[0].userId, duplicatingUser.id);

  const originalStages = await ProductDesignStagesDAO.findAllByDesignId(
    design.id
  );
  const stages = await ProductDesignStagesDAO.findAllByDesignId(
    duplicatedDesign.id
  );
  const getTitle = (d: { title: string }): string => d.title;
  t.equal(stages.length, originalStages.length);
  t.deepEqual(stages.map(getTitle), originalStages.map(getTitle));

  const originalTasks = await TaskEventsDAO.findByDesignId(design.id);
  const tasks = await TaskEventsDAO.findByDesignId(duplicatedDesign.id);
  t.equal(tasks.length, originalTasks.length);
  t.deepEqual(tasks.map(getTitle), originalTasks.map(getTitle));

  const duplicateCanvases = await CanvasesDAO.findAllByDesignId(
    duplicatedDesign.id
  );
  t.equal(duplicateCanvases.length, 1, 'only has one duplicate canvas');
  const duplicateCanvas = duplicateCanvases[0];
  t.deepEqual(
    duplicateCanvas,
    {
      ...canvas,
      componentId: duplicateCanvas.componentId,
      createdAt: duplicateCanvas.createdAt,
      designId: duplicatedDesign.id,
      id: duplicateCanvas.id
    },
    'Has an associated canvas that is the same as the original but w/ new associations'
  );

  const duplicateComponents = await ComponentsDAO.findAllByCanvasId(
    duplicateCanvas.id
  );
  t.equal(duplicateComponents.length, 1, 'only has one duplicate component');
  t.deepEqual(
    duplicateComponents[0],
    {
      ...component,
      createdAt: duplicateComponents[0].createdAt,
      id: duplicateCanvas.componentId
    },
    'Has an associated component that is the same as the original but w/ new associations'
  );
});
