import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { create as createSketch } from '../../dao/product-design-images';
import * as ComponentsDAO from '../../dao/components';
import * as ComponentRelationshipsDAO from './dao';
import * as ProcessesDAO from '../processes/dao';

import { ComponentType } from '../../domain-objects/component';
import createUser = require('../../test-helpers/create-user');
import { test } from '../../test-helpers/fresh';

test('ComponentRelationships DAO support creation/retrieval', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;

  const sketch = await createSketch({
    description: '',
    id: uuid.v4(),
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: '',
    userId
  });
  const component = await ComponentsDAO.create({
    artworkId: null,
    createdBy: userId,
    id: uuid.v4(),
    materialId: null,
    parentId: null,
    sketchId: sketch.id,
    type: ComponentType.Sketch
  });
  const process = await ProcessesDAO.create({
    createdBy: userData.user.id,
    id: uuid.v4(),
    name: 'Wash'
  });
  const componentRelationshipId = uuid.v4();
  const createdComponentRelationship = await ComponentRelationshipsDAO.create({
    createdBy: userId,
    id: componentRelationshipId,
    processId: process.id,
    relativeX: 0,
    relativeY: 0,
    sourceComponentId: component.id,
    targetComponentId: component.id
  });
  const foundComponentRelationship = await ComponentRelationshipsDAO.findById(
    componentRelationshipId
  );

  t.deepEqual(createdComponentRelationship.processId, process.id);
  t.deepEqual(createdComponentRelationship.sourceComponentId, component.id);
  t.deepEqual(createdComponentRelationship.targetComponentId, component.id);
  t.deepEqual(
    createdComponentRelationship,
    foundComponentRelationship,
    'Creating and finding returns the same instance.'
  );
});
