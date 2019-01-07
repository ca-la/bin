import * as uuid from 'node-uuid';
import { create } from '../../components/processes/dao';
import Process from '../../components/processes/domain-object';
import { findById as findUserById } from '../../dao/users';
import createUser = require('../create-user');
import { ComponentType } from '../../domain-objects/component';

interface ProcessWithResources {
  createdBy: any;
  process: Process;
}

export default async function generateProcess(
  options: Partial<Process>
): Promise<ProcessWithResources> {
  const user = options.createdBy
    ? await findUserById(options.createdBy)
    : await createUser({ withSession: false }).then((response: any): any => response.user);
  const process = await create({
    componentType: options.componentType || ComponentType.Sketch,
    createdBy: user.id,
    id: options.id || uuid.v4(),
    name: options.name || 'Dye Sublimation',
    ordering: options.ordering || 0
  });

  return { createdBy: user, process };
}
