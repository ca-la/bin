import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import { test } from '../../test-helpers/fresh';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import { createTemplates } from '../../test-helpers/factories/stage-and-task-templates';
import createUser = require('../../test-helpers/create-user');

import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import * as TaskEventsDAO from '../../dao/task-events';
import * as CanvasesDAO from '../../dao/product-design-canvases';
import * as ComponentsDAO from '../../dao/components';
import * as VariantsDAO from '../../dao/product-design-variants';

import { findAndDuplicateDesign } from './designs';

test('findAndDuplicateDesign', async (t: tape.Test) => {
  const { user: duplicatingUser } = await createUser({ withSession: false });
  // generate a design with a canvas with a component.
  const { component, canvas, design } = await generateCanvas({});
  // generate some stage + task templates.
  await createTemplates();
  // generate a variant for the design.
  const variantOne = await VariantsDAO.create({
    colorName: 'Green',
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: 'M',
    unitsToProduce: 123
  });

  const duplicatedDesign = await db.transaction(async (trx: Knex.Transaction) => {
    return findAndDuplicateDesign(design.id, duplicatingUser.id, trx);
  });

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

  const duplicateVariants = await VariantsDAO.findByDesignId(duplicatedDesign.id);
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

  const duplicateCollaborators = await CollaboratorsDAO.findByDesign(duplicatedDesign.id);
  t.equal(duplicateCollaborators.length, 1);
  t.equal(duplicateCollaborators[0].userId, duplicatingUser.id);

  const stages = await ProductDesignStagesDAO.findAllByDesignId(duplicatedDesign.id);
  t.equal(stages.length, 2);
  t.equal(stages[0].title, 'Stage 1');
  t.equal(stages[1].title, 'Stage 2');

  const tasks = await TaskEventsDAO.findByDesignId(duplicatedDesign.id);
  t.equal(tasks.length, 1);
  t.equal(tasks[0].title, 'Task 1');

  const duplicateCanvases = await CanvasesDAO.findAllByDesignId(duplicatedDesign.id);
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

  const duplicateComponents = await ComponentsDAO.findAllByCanvasId(duplicateCanvas.id);
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