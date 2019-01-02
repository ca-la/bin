import * as uuid from 'node-uuid';
import { create } from '../../components/component-relationships/dao';
import { findById as findUserById } from '../../dao/users';
import { findById as findComponentById } from '../../dao/components';
import { findById as findProcessById } from '../../components/processes/dao';
import ComponentRelationship from '../../components/component-relationships/domain-object';
import createUser = require('../create-user');
import generateProcess from './process';
import generateComponent from './component';
import Process from '../../components/processes/domain-object';
import Component from '../../domain-objects/component';

interface ComponentRelationshipWithResources {
  componentRelationship: ComponentRelationship;
  createdBy: any;
  process: Process;
  sourceComponent: Component;
  targetComponent: Component;
}

export default async function generateComponentRelationship(
  options: Partial<ComponentRelationship>
): Promise<ComponentRelationshipWithResources> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  const { process } = options.processId
    ? { process: await findProcessById(options.processId) }
    : await generateProcess({ createdBy: user.id });
  const { component: sourceComponent } = options.sourceComponentId
    ? { component: await findComponentById(options.sourceComponentId) }
    : await generateComponent({ createdBy: user.id });
  const { component: targetComponent } = options.targetComponentId
    ? { component: await findComponentById(options.targetComponentId) }
    : await generateComponent({ createdBy: user.id });

  if (!process) { throw new Error(`Process ${options.processId} not found!`); }
  if (!sourceComponent) { throw new Error(`Component ${options.sourceComponentId} not found!`); }
  if (!targetComponent) { throw new Error(`Component ${options.targetComponentId} not found!`); }

  const componentRelationship = await create({
    createdBy: user.id,
    id: options.id || uuid.v4(),
    processId: process.id,
    relativeX: options.relativeX || 0,
    relativeY: options.relativeY || 0,
    sourceComponentId: sourceComponent.id,
    targetComponentId: targetComponent.id
  });

  return {
    componentRelationship,
    createdBy: user,
    process,
    sourceComponent,
    targetComponent
  };
}
