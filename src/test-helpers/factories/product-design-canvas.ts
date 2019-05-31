import * as uuid from 'node-uuid';
import { create } from '../../dao/product-design-canvases';
import ProductDesignCanvas from '../../domain-objects/product-design-canvas';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as ComponentsDAO from '../../components/components/dao';
import Component from '../../components/components/domain-object';
import generateComponent from './component';

interface ProductDesignCanvasWithResources {
  canvas: ProductDesignCanvas;
  component: Component;
  createdBy: any;
  design: any;
}

export default async function generateCanvas(
  options: Partial<ProductDesignCanvas>
): Promise<ProductDesignCanvasWithResources> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await ProductDesignsDAO.create({
        productType: 'SWEATER',
        title: 'Mohair Wool Sweater',
        userId: user.id
      });
  const { component } = options.componentId
    ? { component: await ComponentsDAO.findById(options.componentId) }
    : await generateComponent({});

  if (!component) {
    throw new Error('Component was unable to be found or created!');
  }
  if (!design) {
    throw new Error('Design was unable to be found or created!');
  }

  const canvas = await create({
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
