import * as uuid from 'node-uuid';

import PricingCostInput, {
  PricingCostInputWithoutVersions
} from '../../components/pricing-cost-inputs/domain-object';
import { create } from '../../components/pricing-cost-inputs/dao';
import * as ProductDesignsDAO from '../../components/product-designs/dao';
import createDesign from '../../services/create-design';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';

interface PricingCostInputWithResources {
  design: any;
  pricingCostInput: PricingCostInput;
  user: User;
}

export default async function generatePricingCostInput(
  options: Partial<MaybeUnsaved<PricingCostInputWithoutVersions>> = {},
  userId?: string
): Promise<PricingCostInputWithResources> {
  const { user } = userId
    ? { user: await findUserById(userId) }
    : await createUser({ withSession: false });
  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await createDesign({
        productType: 'SWEATER',
        title: 'Mohair Wool Sweater',
        userId: user.id
      });

  const pricingCostInput = await create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    designId: design!.id,
    expiresAt: null,
    productType: 'PANTS',
    productComplexity: 'COMPLEX',
    materialCategory: 'SPECIFY',
    materialBudgetCents: 10000,
    processes: [],
    ...options
  });

  return { design, pricingCostInput, user };
}