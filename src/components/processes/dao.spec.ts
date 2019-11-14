import tape from 'tape';
import uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import * as ProcessesDAO from './dao';
import { ComponentType } from '../components/domain-object';
import generateProcess from '../../test-helpers/factories/process';

test('Processes DAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const pId = uuid.v4();
  const createdProcess = await ProcessesDAO.create({
    componentType: ComponentType.Material,
    createdBy: user.id,
    id: pId,
    name: 'Dye Sublimation',
    ordering: 0
  });
  const foundProcess = await ProcessesDAO.findById(pId);

  t.deepEqual(
    createdProcess.name,
    'Dye Sublimation',
    'Name is returned as submitted.'
  );
  t.deepEqual(createdProcess.id, pId, 'The same id is returned.');
  t.deepEqual(createdProcess.createdBy, user.id, 'The same user is returned');
  t.deepEqual(
    createdProcess,
    foundProcess,
    'Creating and finding returns the same instance.'
  );
});

test('Processes DAO supports finding all processes', async (t: tape.Test) => {
  const { process: p1 } = await generateProcess({
    componentType: ComponentType.Material
  });
  const { process: p2 } = await generateProcess({
    componentType: ComponentType.Artwork
  });
  const { process: p3 } = await generateProcess({
    componentType: ComponentType.Sketch
  });

  const processes = await ProcessesDAO.findAll();
  t.deepEqual(processes, [p2, p1, p3], 'Returns the list in order');
});

test('Processes DAO supports finding by component type', async (t: tape.Test) => {
  const { process: p1 } = await generateProcess({
    componentType: ComponentType.Material,
    ordering: 0
  });
  const { process: p2 } = await generateProcess({
    componentType: ComponentType.Material,
    ordering: 1
  });
  const { process: p3 } = await generateProcess({
    componentType: ComponentType.Material,
    ordering: 2
  });
  const { process: p4 } = await generateProcess({
    componentType: ComponentType.Sketch
  });

  const materialProcesses = await ProcessesDAO.findAllByComponentType(
    ComponentType.Material
  );
  t.deepEqual(materialProcesses, [p1, p2, p3], 'Returns the list in order');
  const sketchProcesses = await ProcessesDAO.findAllByComponentType(
    ComponentType.Sketch
  );
  t.deepEqual(sketchProcesses, [p4], 'Returns the list');
  const artworkProcesses = await ProcessesDAO.findAllByComponentType(
    ComponentType.Artwork
  );
  t.deepEqual(artworkProcesses, [], 'Returns nothing if there is nothing');
});
