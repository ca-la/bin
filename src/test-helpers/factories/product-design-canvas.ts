import * as uuid from 'node-uuid';
import { create } from '../../components/canvases/dao';
import Canvas from '../../components/canvases/domain-object';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import * as ProductDesignsDAO from '../../components/product-designs/dao';
import createDesign from '../../services/create-design';
import * as ComponentsDAO from '../../components/components/dao';
import Component from '../../components/components/domain-object';
import generateComponent from './component';

interface ProductDesignCanvasWithResources {
  canvas: Canvas;
  component: Component;
  createdBy: any;
  design: any;
}

export default async function generateCanvas(
  options: Partial<Canvas>
): Promise<ProductDesignCanvasWithResources> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await createDesign({
        productType: 'SWEATER',
        title: 'Mohair Wool Sweater',
        userId: user.id
      });
  const { component } = options.componentId
    ? { component: await ComponentsDAO.findById(options.componentId) }
    : await generateComponent({ createdBy: user.id });

  if (!component) {
    throw new Error('Component was unable to be found or created!');
  }
  if (!design) {
    throw new Error('Design was unable to be found or created!');
  }

  const canvas = await create({
    archivedAt: options.archivedAt || null,
    componentId: component.id,
    createdBy: user.id,
    designId: design.id,
    height: options.height || 0,
    id: options.id || uuid.v4(),
    ordering: options.ordering,
    title: options.title || 'Untitled',
    width: options.width || 0,
    x: options.x || 0,
    y: options.y || 0
  });

  return {
    canvas,
    component,
    createdBy: user,
    design
  };
}
