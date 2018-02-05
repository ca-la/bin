function getServicePrice(
  productionPrices,
  serviceId,
  unitsToProduce,
  complexityLevel
) {
  requireValues({ productionPrices, serviceId, unitsToProduce, complexityLevel });

  // The list of buckets sorted high -> low by the minimum units, so the first
  // bucket we hit that's *lower* than the units to produce is the one we want
  const buckets = productionPrices
    .filter((price: ProductionPrice) =>
      price.serviceId === serviceId &&
      price.complexityLevel === complexityLevel
    )
    .sort((a: ProductionPrice, b: ProductionPrice) =>
      b.minimumUnits - a.minimumUnits
    );

  for (const bucket of buckets) {
    if (bucket.minimumUnits <= unitsToProduce) {
      return bucket;
    }
  }

  throw new Error(`No eligible bucket found for ${unitsToProduce}/${complexityLevel}`);
}

export default getServicePrice;
