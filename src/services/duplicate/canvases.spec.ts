import tape from 'tape';
import Knex from 'knex';
import { omit } from 'lodash';

import db from '../../services/db';
import { test } from '../../test-helpers/fresh';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';

import { findById as findComponent } from '../../components/components/dao';
import { findAndDuplicateCanvas } from './canvases';

test('findAndDuplicateCanvas', async (t: tape.Test) => {
  const { canvas, component } = await generateCanvas({});

  const duplicatedCanvas = await db.transaction(
    async (trx: Knex.Transaction) => {
      return findAndDuplicateCanvas(canvas.id, canvas.designId, trx);
    }
  );

  if (!duplicatedCanvas) {
    throw new Error('Duplicated canvas was not created!');
  }

  if (!duplicatedCanvas.componentId) {
    throw new Error('Canvas has no component!');
  }
  const duplicatedComponent = await findComponent(duplicatedCanvas.componentId);
  if (!duplicatedComponent) {
    throw new Error(
      `Component ${duplicatedCanvas.componentId} does not exist!`
    );
  }

  t.deepEqual(
    omit(duplicatedCanvas, 'createdAt'),
    omit(
      {
        ...canvas,
        componentId: duplicatedCanvas.componentId,
        id: duplicatedCanvas.id
      },
      'createdAt'
    ),
    'Duplicating a canvas returns the same canvas but with a new id and component id'
  );

  t.deepEqual(
    omit(duplicatedComponent, 'createdAt'),
    omit(
      {
        ...component,
        id: duplicatedComponent.id,
        parentId: null
      },
      'createdAt'
    ),
    'The associated components are duplicated with the canvas.'
  );
});
