import Knex from "knex";
import { ProductDesignVariantIO } from "./types";
import { computeUniqueUpc, computeUniqueSku } from "../../services/codes";
import ApprovalStepsDao from "../approval-steps/dao";
import { ApprovalStepState, ApprovalStepType } from "../approval-steps/types";

export async function enrichVariantInputsWithCodesIfCheckedOut(
  trx: Knex.Transaction,
  designId: string,
  variantInputs: ProductDesignVariantIO[]
) {
  const checkoutApprovalStep = await ApprovalStepsDao.findOne(trx, {
    type: ApprovalStepType.CHECKOUT,
    state: ApprovalStepState.COMPLETED,
    designId,
  });

  if (!checkoutApprovalStep) {
    return variantInputs;
  }

  const enrichedInputs: ProductDesignVariantIO[] = [];
  for (const input of variantInputs) {
    enrichedInputs.push({
      ...input,
      universalProductCode:
        input.universalProductCode || (await computeUniqueUpc()),
      sku: input.sku || (await computeUniqueSku(trx, input)),
    });
  }
  return enrichedInputs;
}
