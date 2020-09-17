import uuid from "node-uuid";
import Knex from "knex";

import PricingCostInput, {
  PricingCostInputWithoutVersions,
} from "../../components/pricing-cost-inputs/domain-object";
import { create } from "../../components/pricing-cost-inputs/dao";
import db from "../../services/db";
import ProductDesignsDAO from "../../components/product-designs/dao";
import createDesign from "../../services/create-design";
import { findById as findUserById } from "../../components/users/dao";
import createUser from "../create-user";
import User from "../../components/users/domain-object";

interface PricingCostInputWithResources {
  design: any;
  pricingCostInput: PricingCostInput;
  user: User;
}

export default async function generatePricingCostInput(
  options: Partial<PricingCostInputWithoutVersions> = {},
  userId?: string
): Promise<PricingCostInputWithResources> {
  const { user } = userId
    ? { user: await findUserById(userId) }
    : await createUser({ withSession: false });
  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await createDesign({
        productType: "SWEATER",
        title: "Mohair Wool Sweater",
        userId: user.id,
      });

  const pricingCostInput = await db.transaction((trx: Knex.Transaction) =>
    create(trx, {
      id: uuid.v4(),
      createdAt: new Date(),
      deletedAt: null,
      designId: design!.id,
      expiresAt: null,
      productType: "PANTS",
      productComplexity: "COMPLEX",
      materialCategory: "SPECIFY",
      materialBudgetCents: 10000,
      minimumOrderQuantity: 1,
      processes: [],
      ...options,
    })
  );

  return { design, pricingCostInput, user };
}
