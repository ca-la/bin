import * as uuid from 'node-uuid';
import { create } from '../../components/components/dao';
import Component, {
  ComponentType
} from '../../components/components/domain-object';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');

interface ComponentWithResources {
  component: Component;
  createdBy: any;
}

export default async function generateComponent(
  options: Partial<Component>
): Promise<ComponentWithResources> {
  const user = options.createdBy
    ? await findUserById(options.createdBy)
    : await createUser({ withSession: false }).then(
        (response: any): any => response.user
      );

  const component = await create({
    artworkId: null,
    createdBy: user.id,
    id: options.id || uuid.v4(),
    materialId: options.materialId || null,
    parentId: options.parentId || null,
    sketchId: options.sketchId || null,
    type: options.type || ComponentType.Sketch
  });

  return { component, createdBy: user };
}
