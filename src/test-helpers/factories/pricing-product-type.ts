import uuid from "node-uuid";
import daysToMs from "@cala/ts-lib/dist/time/days-to-ms";
import PricingProductType from "../../components/pricing-product-types/domain-object";
import { create } from "../../components/pricing-product-types/dao";

interface PricingProductTypeWithResources {
  pricingProductType: PricingProductType;
}

export default async function generatePricingProductType(
  options: Partial<MaybeUnsaved<PricingProductType>>
): Promise<PricingProductTypeWithResources> {
  const pricingProductType = await create({
    complexity: "COMPLEX",
    contrast: 0,
    creationTimeMs: daysToMs(0),
    fulfillmentTimeMs: daysToMs(8),
    id: uuid.v4(),
    minimumUnits: 0,
    name: "TEESHIRT",
    patternMinimumCents: 0,
    preProductionTimeMs: daysToMs(7),
    productionTimeMs: daysToMs(6),
    samplingTimeMs: daysToMs(5),
    sourcingTimeMs: daysToMs(4),
    specificationTimeMs: daysToMs(3),
    unitCents: 0,
    version: 0,
    yield: 0,
    ...options,
  });

  return { pricingProductType };
}
