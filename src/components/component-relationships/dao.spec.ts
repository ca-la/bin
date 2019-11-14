import tape from 'tape';
import uuid from 'node-uuid';

import * as ComponentsDAO from '../components/dao';
import * as ComponentRelationshipsDAO from './dao';

import { ComponentType } from '../components/domain-object';
import createUser = require('../../test-helpers/create-user');
import { test } from '../../test-helpers/fresh';
import generateProcess from '../../test-helpers/factories/process';
import generateComponentRelationship from '../../test-helpers/factories/component-relationship';
import generateComponent from '../../test-helpers/factories/component';
import generateAsset from '../../test-helpers/factories/asset';

test('ComponentRelationships DAO support creation/retrieval', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;

  const { asset: sketch } = await generateAsset({
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
  const { process } = await generateProcess({ createdBy: userData.user.id });
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

test('ComponentRelationships DAO supports updating', async (t: tape.Test) => {
  const id = uuid.v4();
  const { componentRelationship } = await generateComponentRelationship({ id });
  const { process } = await generateProcess({});

  const data = {
    ...componentRelationship,
    processId: process.id
  };

  const updatedRelationship = await ComponentRelationshipsDAO.update(id, data);
  t.equal(updatedRelationship.processId, process.id, 'Updates the process id');
  t.equal(updatedRelationship.id, id, 'Returns the same identifier');
});

test('ComponentRelationships DAO supports deleting', async (t: tape.Test) => {
  const id = uuid.v4();
  await generateComponentRelationship({ id });

  const deletedRelationships = await ComponentRelationshipsDAO.del(id);
  const removedRelationship = await ComponentRelationshipsDAO.findById(id);
  t.equal(deletedRelationships, 1, 'Deletes the relationship');
  t.equal(removedRelationship, null, 'Relationship cannot be found via DAO');
});

test('ComponentRelationships DAO supports finding by a component', async (t: tape.Test) => {
  const { component } = await generateComponent({});
  const { component: componentTwo } = await generateComponent({});
  const {
    componentRelationship: relationshipOne
  } = await generateComponentRelationship({
    sourceComponentId: component.id,
    targetComponentId: component.id
  });
  const {
    componentRelationship: relationshipTwo
  } = await generateComponentRelationship({
    sourceComponentId: component.id
  });
  const {
    componentRelationship: relationshipThree
  } = await generateComponentRelationship({
    targetComponentId: component.id
  });
  await generateComponentRelationship({});
  const {
    componentRelationship: relationshipFour
  } = await generateComponentRelationship({ sourceComponentId: component.id });

  await ComponentRelationshipsDAO.del(relationshipFour.id);

  const relationships = await ComponentRelationshipsDAO.findAllByComponent(
    component.id
  );
  t.deepEqual(
    relationships,
    [relationshipOne, relationshipTwo, relationshipThree],
    'Returns only the relationships the supplied component is a part of.'
  );

  const emptyRelationships = await ComponentRelationshipsDAO.findAllByComponent(
    componentTwo.id
  );
  t.deepEqual(
    emptyRelationships,
    [],
    'Returns no relationships if they do not exist.'
  );
});
