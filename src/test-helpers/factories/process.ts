import uuid from 'node-uuid';
import { create } from '../../components/processes/dao';
import Process from '../../components/processes/domain-object';
import * as UsersDAO from '../../components/users/dao';
import createUser = require('../create-user');
import { ComponentType } from '../../components/components/domain-object';

interface ProcessWithResources {
  createdBy: any;
  process: Process;
}

export default async function generateProcess(
  options: Partial<Process>
): Promise<ProcessWithResources> {
  const user = options.createdBy
    ? await UsersDAO.findById(options.createdBy)
    : await createUser({ withSession: false }).then(
        (response: any): any => response.user
      );
  const process = await create({
    componentType: options.componentType || ComponentType.Sketch,
    createdBy: user.id,
    id: options.id || uuid.v4(),
    name: options.name || 'Dye Sublimation',
    ordering: options.ordering || 0
  });

  return { createdBy: user, process };
}
