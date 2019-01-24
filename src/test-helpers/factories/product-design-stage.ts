import ProductDesignStage from '../../domain-objects/product-design-stage';
import ProductDesign = require('../../domain-objects/product-design');
import { create } from '../../dao/product-design-stages';
import { findById } from '../../dao/product-designs';
import createDesign from '../../services/create-design';
import createUser = require('../../test-helpers/create-user');
import { findById as findUserById } from '../../dao/users';
import User from '../../domain-objects/user';

export default async function generateProductDesignStage(
  options: Partial<ProductDesignStage> = {},
  userId?: string
): Promise<{ stage: ProductDesignStage, design: ProductDesign, user: User }> {
  const user = userId
    ? await createUser()
    : await findUserById(userId);

  const design = options.designId
    ? await findById(options.designId)
    : await createDesign({ productType: 'test', title: 'design', userId: user.id });

  if (!design) { throw new Error('Design does not exist'); }
  const stage = await create({
    description: options.description || '',
    designId: design.id,
    ordering: options.ordering || 0,
    title: options.title || 'My First Task'
  });

  return {
    design,
    stage,
    user
  };
}