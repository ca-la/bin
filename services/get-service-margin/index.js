'use strict';

const { requireValues } = require('../require-properties');

// @type {
//    [serviceId: ServiceId]: {
//       [unitTier: number]: marginMultiplier
//    }
// }
const SERVICE_MARGIN_TIERS = {
  PRODUCTION: {
    0: 0.4,
    50: 0.4,
    100: 0.38,
    150: 0.37,
    200: 0.36,
    250: 0.34,
    300: 0.33,
    400: 0.31,
    500: 0.30
  },
  SAMPLING: { 0: 0.1 },
  DESIGN: { 0: 0.1 },
  TECHNICAL_DESIGN: { 0: 0.1 },
  PATTERN_MAKING: { 0: 0.1 },
  SOURCING: { 0: 0.2 },
  WASH: { 0: 0.1 },
  DYE: { 0: 0.1 },
  SCREEN_PRINT: { 0: 0.1 },
  EMBROIDERY: { 0: 0.1 },
  OTHER_ARTWORK: { 0: 0.1 },
  DTG_ROLL_PRINT: { 0: 0.1 },
  DTG_ENGINEERED_PRINT: { 0: 0.1 },
  DIGITAL_SUBLIMATION_PRINT: { 0: 0.1 },
  ROTARY_PRINT: { 0: 0.1 },
  GRADING: { 0: 0.1 },
  FULFILLMENT: { 0: 0.5 }
};

// We can always define a new table in future if we want to. For now, reusing
// the same one.
const SETUP_MARGIN_TIERS = SERVICE_MARGIN_TIERS;

// Helper used by both calculation functions
function getMargin({ serviceId, partnerPriceCents, unitsToProduce, tiers }) {
  const margins = tiers[serviceId];

  if (!margins) {
    throw new Error(`Cannot calculate margin for unknown service ${serviceId}`);
  }

  // The list of unit tiers, sorted high -> low
  const unitTierValues = Object.keys(margins).sort((a, b) => b - a);

  for (const unitTier of unitTierValues) {
    if (unitTier <= unitsToProduce) {
      // IMPORTANT: Our cut is a percent of the total billed amount, not an
      // additional number on top of what the partners bill.
      //
      // For example, if the partner's cost is $100, and our desired margin is
      // 20%, the total is 100 / (1 - 0.2) = $125, not $120.
      //
      // Therefore, our cut is 20% of $125, = $25, and the parter's cut is $100
      const marginPercentage = margins[unitTier];

      return Math.round(
        (partnerPriceCents / (1 - marginPercentage)) - partnerPriceCents
      );
    }
  }

  throw new Error(`No applicable margin category found for ${serviceId}@${unitsToProduce}`);
}

// Given the price (in cents) charged by our vendor, return our margin (also in
// cents). Adding these two will give you the final cost to charge the customer.
function getServiceMarginCents({ serviceId, partnerPriceCents, unitsToProduce }) {
  requireValues({ serviceId, partnerPriceCents, unitsToProduce });
  return getMargin({ serviceId, partnerPriceCents, unitsToProduce, tiers: SERVICE_MARGIN_TIERS });
}

function getServiceSetupMarginCents({ serviceId, partnerPriceCents, unitsToProduce }) {
  requireValues({ serviceId, partnerPriceCents, unitsToProduce });
  return getMargin({ serviceId, partnerPriceCents, unitsToProduce, tiers: SETUP_MARGIN_TIERS });
}

module.exports = {
  getServiceMarginCents,
  getServiceSetupMarginCents
};
