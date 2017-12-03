'use strict';

const { PRODUCTION_CUT_AND_SEW_COST_CENTS } = require('../../config/pricing');

function getCutAndSewCost(unitsToProduce, patternComplexity) {
  const eligibleBuckets = PRODUCTION_CUT_AND_SEW_COST_CENTS
    .filter(bucket => bucket.complexity === patternComplexity);

  const reversedBuckets = eligibleBuckets.sort(
    (a, b) => b.minUnits - a.minUnits
  );

  for (let i = 0; i < reversedBuckets.length; i += 1) {
    const bucket = reversedBuckets[i];

    if (bucket.minUnits <= unitsToProduce) {
      return bucket.cost;
    }
  }

  throw new Error(`No eligible bucket found for (units: ${unitsToProduce}, complexity: ${patternComplexity})`);
}

module.exports = getCutAndSewCost;
