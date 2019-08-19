import ProductDesignStage from '../../domain-objects/product-design-stage';
import ProductDesign = require('../../components/product-designs/domain-objects/product-design');
import { create } from '../../dao/product-design-stages';
import { findById } from '../../components/product-designs/dao';
import createDesign from '../../services/create-design';
import createUser = require('../../test-helpers/create-user');
import { findById as findUserById } from '../../components/users/dao';
import User from '../../components/users/domain-object';

export default async function generateProductDesignStage(
  options: Partial<ProductDesignStage> = {},
  userId?: string
): Promise<{ stage: ProductDesignStage; design: ProductDesign; user: User }> {
  const { user } = userId
    ? { user: await findUserById(userId) }
    : await createUser();

  const design = options.designId
    ? await findById(options.designId)
    : await createDesign({
        productType: 'test',
        title: 'design',
        userId: user.id
      });

  if (!design) {
    throw new Error('Design does not exist');
  }
  const stage = await create({
    description: options.description || '',
    designId: design.id,
    ordering: options.ordering || 0,
    title: options.title || 'Creation'
  });

  return {
    design,
    stage,
    user
  };
}
